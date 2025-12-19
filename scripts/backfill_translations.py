"""
使用本地 DictionaryEntry（由 scripts/sync_ecdict.py 导入）回填 Word.translation。

回填策略（A）：
- 只更新 translation 为空（NULL 或 ''）的 Word
- 如果 Word.phonetic / Word.partOfSpeech 为空，也会尝试从词典补全

兜底策略（B/C，可选）：
- B: --use-mymemory 使用 MyMemory 免费翻译 API（无 key，但需要限速）
- C: 预留（后续可接 OpenAI/DeepSeek 等），当前不默认启用

运行示例：
  python scripts/backfill_translations.py
  python scripts/backfill_translations.py --limit 5000
  python scripts/backfill_translations.py --use-mymemory --limit 200
"""

from __future__ import annotations

import argparse
import sys
import time
from collections import defaultdict

import psycopg2
import requests

DB_DSN_DEFAULT = "dbname=zhixie user=postgres password=admin host=localhost"


def configure_stdout():
    # Windows 上默认控制台编码经常是 GBK，直接 print 中文/特殊字符可能报 UnicodeEncodeError。
    # 这里强制把 Python 输出改成 UTF-8，避免脚本打印崩溃。
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
        sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")
    except Exception:
        pass


def ensure_word_indexes(cur):
    # 加快 join/过滤
    cur.execute('CREATE INDEX IF NOT EXISTS "idx_word_text_lower" ON "Word" (lower(text));')
    cur.execute('CREATE INDEX IF NOT EXISTS "idx_dict_word" ON "DictionaryEntry" (word);')


def backfill_from_dictionary(cur, limit: int) -> int:
    # bulk update：用词典翻译回填空 translation
    # 注意：Word.text 在 schema 中是唯一且写入时基本为小写，这里依然用 lower 对齐。
    cur.execute(
        """
        WITH target AS (
          SELECT
            w.id,
            -- 生成“带词性 + 多义项”的展示串：
            -- 例如：pos='n' + translation='苹果；苹果树'  =>  'n. 苹果；苹果树'
            CASE
              WHEN NULLIF(d.pos, '') IS NOT NULL
                THEN d.pos || '. ' || d.translation
              ELSE d.translation
            END AS formatted_translation,
            d.phonetic,
            d.pos
          FROM "Word" w
          JOIN "DictionaryEntry" d
            ON lower(w.text) = d.word
          WHERE (w.translation IS NULL OR btrim(w.translation) = '')
            AND d.translation IS NOT NULL AND d.translation <> ''
          LIMIT %s
        )
        UPDATE "Word" w
        SET
          translation = target.formatted_translation,
          phonetic = COALESCE(w.phonetic, NULLIF(target.phonetic, '')),
          "partOfSpeech" = COALESCE(w."partOfSpeech", NULLIF(target.pos, '')),
          "updatedAt" = now()
        FROM target
        WHERE w.id = target.id;
        """,
        (limit,),
    )
    return cur.rowcount


def upgrade_format_from_dictionary(cur, limit: int) -> int:
    """
    将历史上已写入但不带词性前缀的翻译升级为：pos + '. ' + translation。
    为了避免覆盖其它来源（例如 MyMemory 或手工修改），这里做了“非常保守”的匹配：
    - 仅当 Word.translation == DictionaryEntry.translation（完全一致）时才升级
    - 且词典里有 pos
    """
    cur.execute(
        """
        WITH target AS (
          SELECT
            w.id,
            (d.pos || '. ' || d.translation) AS formatted_translation,
            d.pos
          FROM "Word" w
          JOIN "DictionaryEntry" d
            ON lower(w.text) = d.word
          WHERE d.pos IS NOT NULL AND d.pos <> ''
            AND d.translation IS NOT NULL AND d.translation <> ''
            AND w.translation = d.translation
          LIMIT %s
        )
        UPDATE "Word" w
        SET
          translation = target.formatted_translation,
          "partOfSpeech" = COALESCE(w."partOfSpeech", NULLIF(target.pos, '')),
          "updatedAt" = now()
        FROM target
        WHERE w.id = target.id;
        """,
        (limit,),
    )
    return cur.rowcount


def fetch_mymemory(word: str) -> str:
    # MyMemory: https://mymemory.translated.net/doc/spec.php
    # q=word, langpair=en|zh-CN
    url = "https://api.mymemory.translated.net/get"
    resp = requests.get(url, params={"q": word, "langpair": "en|zh-CN"}, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    translated = (data.get("responseData") or {}).get("translatedText") or ""
    return translated.strip()


def looks_like_useful_translation(word: str, translated: str) -> bool:
    """
    MyMemory 偶尔会返回：
    - 原样英文（等于没翻译）
    - 奇怪的乱码/符号串

    这里做一个简单过滤：
    - 只要包含中文（CJK）就接受
    - 不含中文时：如果是“缩写/术语”这类的 ASCII 串且和原词不同，也接受（例如 IEEE 1394 / NGC）
    """
    w = (word or "").strip().lower()
    t = (translated or "").strip()
    if not w or not t:
        return False
    if t.lower() == w:
        return False

    if any("\u4e00" <= ch <= "\u9fff" for ch in t):
        return True

    if all(ord(ch) < 128 for ch in t):
        return True

    return False


def backfill_with_mymemory(cur, limit: int, sleep_ms: int) -> int:
    cur.execute(
        """
        SELECT id, text
        FROM "Word"
        WHERE translation IS NULL OR btrim(translation) = ''
        ORDER BY id
        LIMIT %s;
        """,
        (limit,),
    )
    rows = cur.fetchall()
    updated = 0
    for word_id, text in rows:
        try:
            cn = fetch_mymemory(text)
        except Exception:
            cn = ""
        if cn and looks_like_useful_translation(text, cn):
            cur.execute(
                """
                UPDATE "Word"
                SET translation = %s, "updatedAt" = now()
                WHERE id = %s AND (translation IS NULL OR btrim(translation) = '');
                """,
                (cn, word_id),
            )
            if cur.rowcount:
                updated += 1
        if sleep_ms > 0:
            time.sleep(sleep_ms / 1000.0)
    return updated


def generate_lemmas(word: str) -> list[str]:
    """
    非严格词形还原（够用即可）：
    - 复数：cats -> cat / cities -> city
    - 三单：studies -> study / goes -> go
    - 过去式：worked -> work / studied -> study
    - 进行时：teaching -> teach / running -> run
    - 比较级/最高级：bigger -> big / happiest -> happy
    """
    w = word.lower().strip()
    if not w or len(w) <= 2:
        return []

    candidates: list[str] = []

    def add(x: str):
        x = x.strip().lower()
        if x and x != w and x not in candidates:
            candidates.append(x)

    # plural / 3rd person
    if w.endswith("ies") and len(w) > 4:
        add(w[:-3] + "y")
    if w.endswith("es") and len(w) > 3:
        add(w[:-2])  # boxes -> box, goes -> go
    if w.endswith("s") and len(w) > 3 and not w.endswith("ss"):
        add(w[:-1])

    # past tense
    if w.endswith("ied") and len(w) > 4:
        add(w[:-3] + "y")
    if w.endswith("ed") and len(w) > 3:
        add(w[:-2])  # worked -> work
        if w.endswith("pped") and len(w) > 5:
            add(w[:-3])  # stopped -> stop (rough)

    # gerund
    if w.endswith("ing") and len(w) > 5:
        base = w[:-3]
        add(base)  # working -> work (sometimes)
        add(base + "e")  # making -> make
        # running -> run
        if len(base) >= 2 and base[-1] == base[-2]:
            add(base[:-1])

    # comparative/superlative
    if w.endswith("ier") and len(w) > 4:
        add(w[:-3] + "y")
    if w.endswith("iest") and len(w) > 5:
        add(w[:-4] + "y")
    if w.endswith("er") and len(w) > 4:
        add(w[:-2])
        if w[-3] == w[-4]:
            add(w[:-3])
    if w.endswith("est") and len(w) > 5:
        add(w[:-3])
        if w[-4] == w[-5]:
            add(w[:-4])

    return candidates[:6]


def backfill_from_dictionary_inflection(cur, limit: int, batch_size: int = 500) -> int:
    """
    对 translation 为空的词，尝试用词形还原后的 lemma 去匹配 DictionaryEntry 再回填。
    只更新空 translation，不覆盖已有翻译。
    """
    cur.execute(
        """
        SELECT id, text
        FROM "Word"
        WHERE translation IS NULL OR btrim(translation) = ''
        ORDER BY id
        LIMIT %s;
        """,
        (limit,),
    )
    rows = cur.fetchall()
    if not rows:
        return 0

    lemma_to_word_ids: dict[str, list[str]] = defaultdict(list)
    for word_id, text in rows:
        word = (text or "").strip().lower()
        candidates = generate_lemmas(word)
        for lemma in candidates:
            lemma_to_word_ids[lemma].append(word_id)

    if not lemma_to_word_ids:
        return 0

    updated = 0
    lemmas = list(lemma_to_word_ids.keys())

    for i in range(0, len(lemmas), batch_size):
        batch = lemmas[i : i + batch_size]
        placeholders = ",".join(["%s"] * len(batch))
        cur.execute(
            f"""
            SELECT word, translation, phonetic, pos
            FROM "DictionaryEntry"
            WHERE word IN ({placeholders})
              AND translation IS NOT NULL AND translation <> '';
            """,
            batch,
        )
        dict_rows = cur.fetchall()
        dict_map = {r[0]: (r[1], r[2], r[3]) for r in dict_rows}

        for lemma, (translation, phonetic, pos) in dict_map.items():
            for word_id in lemma_to_word_ids.get(lemma, []):
                formatted = f"{pos}. {translation}" if pos else translation
                cur.execute(
                    """
                    UPDATE "Word"
                    SET translation = %s,
                        phonetic = COALESCE(phonetic, NULLIF(%s, '')),
                        "partOfSpeech" = COALESCE("partOfSpeech", NULLIF(%s, '')),
                        "updatedAt" = now()
                    WHERE id = %s AND (translation IS NULL OR btrim(translation) = '');
                    """,
                    (formatted, phonetic or "", pos or "", word_id),
                )
                if cur.rowcount:
                    updated += 1

    return updated


def main():
    configure_stdout()
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=DB_DSN_DEFAULT, help="PostgreSQL DSN")
    parser.add_argument("--limit", type=int, default=50000, help="Max rows to backfill per run")
    parser.add_argument(
        "--upgrade-format",
        action="store_true",
        help="Upgrade translations filled by DictionaryEntry to include pos prefix (pos. xxx)",
    )
    parser.add_argument(
        "--upgrade-limit",
        type=int,
        default=50000,
        help="Max rows to upgrade per run when --upgrade-format enabled",
    )
    parser.add_argument(
        "--use-inflection",
        action="store_true",
        help="Use simple inflection/lemma matching to backfill remaining empty translations from DictionaryEntry",
    )
    parser.add_argument(
        "--inflection-batch-size",
        type=int,
        default=500,
        help="Dictionary query batch size when --use-inflection enabled",
    )
    parser.add_argument("--use-mymemory", action="store_true", help="Fallback: MyMemory translate")
    parser.add_argument("--mymemory-sleep-ms", type=int, default=200, help="Rate limit for MyMemory")
    args = parser.parse_args()

    conn = psycopg2.connect(args.db)
    conn.autocommit = True
    cur = conn.cursor()

    ensure_word_indexes(cur)

    # A: dictionary
    updated_a = backfill_from_dictionary(cur, args.limit)
    print(f"Backfilled from DictionaryEntry: {updated_a}")

    if args.upgrade_format:
        upgraded = upgrade_format_from_dictionary(cur, args.upgrade_limit)
        print(f"Upgraded translation format: {upgraded}")

    if args.use_inflection:
        updated_inflection = backfill_from_dictionary_inflection(
            cur, args.limit, batch_size=args.inflection_batch_size
        )
        print(f"Backfilled via inflection/lemma: {updated_inflection}")

    # B: MyMemory fallback（只对剩余空翻译生效）
    if args.use_mymemory:
        updated_b = backfill_with_mymemory(cur, min(args.limit, 2000), args.mymemory_sleep_ms)
        print(f"Backfilled via MyMemory: {updated_b}")

    cur.execute('SELECT COUNT(*) FROM "Word" WHERE translation IS NULL OR btrim(translation) = \'\';')
    remaining = cur.fetchone()[0]
    print(f"Remaining empty translations: {remaining}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)

