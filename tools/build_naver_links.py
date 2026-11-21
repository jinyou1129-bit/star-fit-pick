#!/usr/bin/env python3
"""스타핏픽 → 네이버 쇼핑커넥트(브랜드커넥트) 링크 파일 생성기

입력: tools/naver-links-source.json
  {"links": [{"url": "https://naver.me/XXXX", "product": "...", "store": "...",
              "price": 143100, "fee": 5, "keys": ["검색어1", "검색어2"]}, ...]}
  keys 는 스타핏픽이 buildLink('naver', q) 로 넘기는 검색어다.
   · 대안템이면 look.alt.query
   · 아이템이면 item.brand + " " + item.name

출력: data/naver-links.js  (window.SFP_NAVER_LINKS / window.SFP_NAVER_BY_NORM)

링크는 브랜드커넥트 [상품 찾기] → '링크 발급' 으로만 발급된다. 이 파일에 손으로 URL 을
적어 넣지 말 것(발급 링크가 아니면 실적이 잡히지 않는다).
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "tools" / "naver-links-source.json"
OUT = ROOT / "data" / "naver-links.js"


def norm(s: str) -> str:
    return re.sub(r"[^0-9a-z가-힣]", "", s.lower())


def main() -> int:
    src = json.loads(SRC.read_text(encoding="utf-8"))
    links = src.get("links", [])
    by_key = {}
    for e in links:
        url = e["url"].strip()
        if not url.startswith("https://naver.me/"):
            print(f"발급 링크가 아님: {url}", file=sys.stderr)
            return 1
        for k in e.get("keys", []):
            if k in by_key and by_key[k]["u"] != url:
                print(f"키 중복: {k}", file=sys.stderr)
                return 1
            by_key[k] = {
                "u": url,
                "p": e.get("product", ""),
                "s": e.get("store", ""),
                "pr": int(e.get("price") or 0),
                "f": e.get("fee", 0),
            }

    lines = [
        "/* 자동 생성 파일 — 직접 고치지 말고 tools/build_naver_links.py 를 다시 돌리세요.",
        "   네이버 쇼핑커넥트(브랜드커넥트) 제휴 단축 링크 — 스페이스: 부맨TV",
        "   키 = 스타핏픽의 검색어(대안템 query 또는 아이템 brand+name). 값은 크리에이터 고유 naver.me 링크. */",
        "window.SFP_NAVER_LINKS = {",
    ]
    lines.append(
        ",\n".join(
            '  %s: {"u": %s, "p": %s, "s": %s, "pr": %d, "f": %s}'
            % (
                json.dumps(k, ensure_ascii=False),
                json.dumps(v["u"]),
                json.dumps(v["p"], ensure_ascii=False),
                json.dumps(v["s"], ensure_ascii=False),
                v["pr"],
                json.dumps(v["f"]),
            )
            for k, v in by_key.items()
        )
    )
    lines.append("};")
    normed = {}
    for k, v in by_key.items():
        normed[norm(k)] = v["u"]
    lines.append("window.SFP_NAVER_BY_NORM = {")
    lines.append(
        ",\n".join(
            "  %s: %s" % (json.dumps(k, ensure_ascii=False), json.dumps(u))
            for k, u in normed.items()
        )
    )
    lines.append("};")
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"{OUT.name}: {len(by_key)} keys / {len(links)} links")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
