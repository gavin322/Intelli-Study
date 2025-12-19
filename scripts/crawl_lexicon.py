"""
抓取公开词库源并写入本地 PostgreSQL（zhixie）。

当前使用的两个主要词库源：
- 幼儿园/小学高频：google-10000-english（只有英文，需要结合 ECDICT 回填中文）
- 初中/高中/CET4/CET6/考研/托福/SAT：KyleBing/english-vocabulary（自带中文释义 + 短语）

运行示例：
  python scripts/crawl_lexicon.py
  python scripts/crawl_lexicon.py --recreate-kindergarten   # 重新生成幼儿园/小学高频词（会清空该分类）
"""

from __future__ import annotations

import argparse
import re
import sys
from typing import Iterable, List, Tuple

import psycopg2
import requests

DB_DSN_DEFAULT = "dbname=zhixie user=postgres password=admin host=localhost"

GOOGLE_10000_URL = (
    "https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english.txt"
)

# KyleBing 精简版（已经是“按阶段聚合”的 7 份）
KYLEBING_LEVEL_JSON = {
    "lexicon_junior": {
        "desc": "初中词汇（KyleBing english-vocabulary）",
        "url": "https://raw.githubusercontent.com/KyleBing/english-vocabulary/master/json/1-初中-顺序.json",
    },
    "lexicon_senior": {
        "desc": "高中词汇（KyleBing english-vocabulary）",
        "url": "https://raw.githubusercontent.com/KyleBing/english-vocabulary/master/json/2-高中-顺序.json",
    },
    "lexicon_cet4": {
        "desc": "CET-4 词汇（KyleBing english-vocabulary）",
        "url": "https://raw.githubusercontent.com/KyleBing/english-vocabulary/master/json/3-CET4-顺序.json",
    },
    "lexicon_cet6": {
        "desc": "CET-6 词汇（KyleBing english-vocabulary）",
        "url": "https://raw.githubusercontent.com/KyleBing/english-vocabulary/master/json/4-CET6-顺序.json",
    },
    "lexicon_postgrad": {
        "desc": "考研词汇（KyleBing english-vocabulary）",
        "url": "https://raw.githubusercontent.com/KyleBing/english-vocabulary/master/json/5-考研-顺序.json",
    },
    "lexicon_toefl": {
        "desc": "托福词汇（KyleBing english-vocabulary）",
        "url": "https://raw.githubusercontent.com/KyleBing/english-vocabulary/master/json/6-托福-顺序.json",
    },
    "lexicon_sat_kb": {
        "desc": "SAT 词汇（KyleBing english-vocabulary）",
        "url": "https://raw.githubusercontent.com/KyleBing/english-vocabulary/master/json/7-SAT-顺序.json",
    },
}


def configure_stdout():
    # 避免 Windows GBK 控制台导致的 UnicodeEncodeError
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
        sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")
    except Exception:
        pass


def iter_google_10000(url: str, limit: int) -> Iterable[str]:
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    count = 0
    for line in resp.text.splitlines():
        w = (line or "").strip().lower()
        if not w:
            continue
        # 过滤明显不适合“幼儿园/小学”的噪音：带数字/符号/过长/非纯字母
        if not re.fullmatch(r"[a-z]{2,20}", w):
            continue
        yield w
        count += 1
        if limit and count >= limit:
            return


def parse_kylebing_level_json(url: str) -> tuple[list[tuple[str, str]], list[tuple[str, str, str]]]:
    resp = requests.get(url, timeout=120)
    resp.raise_for_status()
    data = resp.json()

    words: list[tuple[str, str]] = []
    phrases: list[tuple[str, str, str]] = []

    for item in data:
        word = (item.get("word") or "").strip().lower()
        if not word:
            continue

        translations = item.get("translations") or []
        trans_texts = []
        for t in translations:
            tt = (t.get("translation") or "").strip()
            if tt:
                trans_texts.append(tt)

        # 拼接多义项：用中文分号分隔
        translation = "；".join(trans_texts)
        words.append((word, translation))

        for p in item.get("phrases") or []:
            phrase_text = (p.get("phrase") or "").strip()
            if not phrase_text:
                continue
            cn = (p.get("translation") or "").strip()
            phrases.append((phrase_text, cn, ""))

    return words, phrases


def ensure_source(cur, source_name: str, desc: str):
    cur.execute(
        """
        INSERT INTO "LexiconSource"(id, name, description, type)
        VALUES (gen_random_uuid(), %s, %s, %s)
        ON CONFLICT (name) DO NOTHING
        """,
        (source_name, desc, source_name),
    )


def upsert_word(cur, source_name: str, text: str, translation: str):
    cur.execute(
        """
        INSERT INTO "Word"(id, text, translation, "sourceId")
        VALUES (gen_random_uuid(), %s, %s, (SELECT id FROM "LexiconSource" WHERE name=%s))
        ON CONFLICT (text) DO UPDATE SET
          translation = CASE
            WHEN COALESCE("Word".translation, '') = '' THEN EXCLUDED.translation
            ELSE "Word".translation
          END,
          "updatedAt" = now();
        """,
        (text, translation or "", source_name),
    )


def upsert_phrase(cur, source_name: str, text: str, translation: str, examples: list[str] | None = None):
    cur.execute(
        """
        INSERT INTO "Phrase"(id, text, translation, examples, "sourceId")
        VALUES (gen_random_uuid(), %s, %s, %s, (SELECT id FROM "LexiconSource" WHERE name=%s))
        ON CONFLICT (text) DO UPDATE SET
          translation = CASE
            WHEN COALESCE("Phrase".translation, '') = '' THEN EXCLUDED.translation
            ELSE "Phrase".translation
          END,
          "updatedAt" = now();
        """,
        (text, translation or "", examples or [], source_name),
    )


def recreate_kindergarten(cur):
    # 清空该分类下的词（避免历史垃圾词残留）
    cur.execute(
        """
        DELETE FROM "Word"
        WHERE "sourceId" = (SELECT id FROM "LexiconSource" WHERE name='lexicon_kindergarten');
        """
    )


def main():
    configure_stdout()
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=DB_DSN_DEFAULT, help="PostgreSQL DSN")
    parser.add_argument("--google-limit", type=int, default=10000, help="google-10000 导入数量（默认 10000）")
    parser.add_argument(
        "--recreate-kindergarten",
        action="store_true",
        help="重新生成 lexicon_kindergarten（会先清空该分类 Word）",
    )
    args = parser.parse_args()

    conn = psycopg2.connect(args.db)
    conn.autocommit = True
    cur = conn.cursor()

    # 幼儿园/小学高频
    ensure_source(cur, "lexicon_kindergarten", "幼儿园/小学高频词", "lexicon_kindergarten")
    if args.recreate_kindergarten:
        recreate_kindergarten(cur)
    for w in iter_google_10000(GOOGLE_10000_URL, args.google_limit):
        upsert_word(cur, "lexicon_kindergarten", w, "")

    # KyleBing 各阶段词库
    for name, meta in KYLEBING_LEVEL_JSON.items():
        ensure_source(cur, name, meta["desc"], name)
        try:
            words_level, phrases_level = parse_kylebing_level_json(meta["url"])
        except Exception as exc:
            print(f"warn: fetch {name} failed: {exc}", file=sys.stderr)
            continue

        for w, trans in words_level:
            upsert_word(cur, name, w, trans)
        for phrase_text, cn, example in phrases_level:
            upsert_phrase(cur, name, phrase_text, cn, [example] if example else [])

    cur.close()
    conn.close()
    print("Crawl/import done.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)

