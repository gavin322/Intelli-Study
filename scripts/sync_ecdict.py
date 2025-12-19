"""
同步 ECDICT（英->中）词典到本地 PostgreSQL，用于补全 Word.translation。

数据源（GitHub）：
  https://github.com/skywind3000/ECDICT

说明：
- ECDICT 的 ecdict.csv 体积较大（几十 MB），脚本使用“流式下载 + 批量 upsert”
- 只存入必要字段：word / translation / phonetic / pos / definition / source

运行示例：
  python scripts/sync_ecdict.py
  python scripts/sync_ecdict.py --limit 20000   # 只导入前 2w 行用于验证
"""

from __future__ import annotations

import argparse
import csv
import sys
from typing import Iterable

import psycopg2
import requests

DB_DSN_DEFAULT = "dbname=zhixie user=postgres password=admin host=localhost"
ECDICT_CSV_URL_DEFAULT = "https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv"


def configure_stdout():
    # Windows 上默认控制台编码经常是 GBK，直接 print 中文/特殊字符可能报 UnicodeEncodeError。
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="backslashreplace")
        sys.stderr.reconfigure(encoding="utf-8", errors="backslashreplace")
    except Exception:
        pass


def chunked(iterable: Iterable[tuple], size: int):
    batch = []
    for item in iterable:
        batch.append(item)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch


def ensure_tables(cur):
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS "DictionaryEntry" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          word TEXT NOT NULL UNIQUE,
          translation TEXT,
          phonetic TEXT,
          pos TEXT,
          definition TEXT,
          source TEXT NOT NULL DEFAULT 'ecdict',
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """
    )


def upsert_batch(cur, rows: list[tuple[str, str, str, str, str, str]]):
    # rows: (word, translation, phonetic, pos, definition, source)
    args = ",".join(["(%s,%s,%s,%s,%s,%s)"] * len(rows))
    flat: list[str] = []
    for r in rows:
        flat.extend(r)

    cur.execute(
        f"""
        INSERT INTO "DictionaryEntry"(word, translation, phonetic, pos, definition, source)
        VALUES {args}
        ON CONFLICT (word) DO UPDATE SET
          translation = CASE
            WHEN COALESCE("DictionaryEntry".translation, '') = '' THEN EXCLUDED.translation
            ELSE "DictionaryEntry".translation
          END,
          phonetic = COALESCE(NULLIF("DictionaryEntry".phonetic, ''), EXCLUDED.phonetic),
          pos = COALESCE(NULLIF("DictionaryEntry".pos, ''), EXCLUDED.pos),
          definition = COALESCE(NULLIF("DictionaryEntry".definition, ''), EXCLUDED.definition),
          "updatedAt" = now();
        """,
        flat,
    )


def main():
    configure_stdout()
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=DB_DSN_DEFAULT, help="PostgreSQL DSN")
    parser.add_argument("--url", default=ECDICT_CSV_URL_DEFAULT, help="ECDICT csv url")
    parser.add_argument("--limit", type=int, default=0, help="Only import first N rows (0 = all)")
    parser.add_argument("--batch-size", type=int, default=1000, help="Insert batch size")
    args = parser.parse_args()

    # 下载 CSV（流式）
    # 注意：GitHub raw 可能返回 gzip 压缩内容，requests 的 iter_lines 会自动解压。
    resp = requests.get(args.url, timeout=120, stream=True)
    resp.raise_for_status()
    reader = csv.DictReader(resp.iter_lines(decode_unicode=True))

    conn = psycopg2.connect(args.db)
    conn.autocommit = True
    cur = conn.cursor()
    ensure_tables(cur)

    def iter_rows():
        count = 0
        for row in reader:
            word = (row.get("word") or "").strip().lower()
            if not word:
                continue
            translation = (row.get("translation") or "").strip()
            phonetic = (row.get("phonetic") or "").strip()
            pos = (row.get("pos") or "").strip()
            definition = (row.get("definition") or "").strip()
            yield (word, translation, phonetic, pos, definition, "ecdict")
            count += 1
            if args.limit and count >= args.limit:
                return

    total = 0
    for batch in chunked(iter_rows(), args.batch_size):
        upsert_batch(cur, batch)
        total += len(batch)
        if total % (args.batch_size * 10) == 0:
            print(f"Imported {total} rows...", flush=True)

    cur.close()
    conn.close()
    print(f"Done. Imported rows: {total}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)

