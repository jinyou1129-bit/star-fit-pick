#!/usr/bin/env python3
"""스타핏픽 — 쿠팡 파트너스 검색어 수집 + 추적 링크 생성 (한 번에).

하는 일
  1) 저장소 전체에서 쿠팡 검색에 쓰이는 검색어를 모읍니다.
       - data/looks.js 의 alt.query (메인 모달·월드컵이 쓰는 값)
       - look-*.html 의 brand + ' ' + name (쿠팡 버튼), alt.query
       - guide-*.html 의 brand + ' ' + name
       - personal-color.html 추천템의 q
  2) 쿠팡 파트너스 Open API(딥링크)로 검색 URL을 공식 단축 링크로 바꿉니다.
  3) data/coupang-links.js (window.SFP_COUPANG_LINKS) 를 다시 씁니다.

키는 환경변수로만 받고 저장소에는 남기지 않습니다.
  COUPANG_ACCESS_KEY=... COUPANG_SECRET_KEY=... python3 tools/build_coupang_links.py

키는 쿠팡 파트너스 > 추가 기능 > 파트너스 API 에서 확인합니다.
검색어가 새로 생기면 이 스크립트를 다시 돌리면 됩니다(기존 링크도 계속 유효).
"""
import argparse
import datetime
import hashlib
import hmac
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

API_HOST = "https://api-gateway.coupang.com"
API_PATH = "/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink"
BATCH = 10


def norm(q):
    return re.sub(r"\s+", " ", q or "").strip()


def collect(repo):
    """(검색어, 출처) 목록 — 순서 유지, 중복 제거."""
    out, seen = [], set()

    def add(q, src):
        q = norm(q)
        if q and q not in seen:
            seen.add(q)
            out.append((q, src))

    looks = open(os.path.join(repo, "data", "looks.js"), encoding="utf-8").read()
    for q in re.findall(r'\bquery\s*:\s*"((?:[^"\\]|\\.)*)"', looks):
        add(q, "looks.js")

    for f in sorted(os.listdir(repo)):
        if not f.endswith(".html"):
            continue
        src = open(os.path.join(repo, f), encoding="utf-8").read()

        m = re.search(r"var\s+o\s*=\s*(\{.*?\});\s*\n", src, re.S)
        if m:
            try:
                o = json.loads(m.group(1))
                add("{} {}".format(o.get("brand", ""), o.get("name", "")), f)
                add((o.get("alt") or {}).get("query"), f + " alt")
            except ValueError:
                pass

        m = re.search(r"var\s+list\s*=\s*(\[.*?\]);\s*\n", src, re.S)
        if m:
            try:
                for p in json.loads(m.group(1)):
                    add("{} {}".format(p.get("brand", ""), p.get("name", "")), f)
            except ValueError:
                pass

        if f == "personal-color.html":
            for q in re.findall(r'\bq\s*:\s*"((?:[^"\\]|\\.)*)"', src):
                add(q, f + " 추천템")

    return out


def sign(method, path, query, access_key, secret_key):
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%y%m%dT%H%M%SZ")
    sig = hmac.new(secret_key.encode(), (now + method + path + query).encode(),
                   hashlib.sha256).hexdigest()
    return ("CEA algorithm=HmacSHA256, access-key={}, signed-date={}, signature={}"
            .format(access_key, now, sig))


def deeplink(urls, subid, access_key, secret_key):
    body = {"coupangUrls": urls, "subId": subid}
    req = urllib.request.Request(
        API_HOST + API_PATH, data=json.dumps(body, ensure_ascii=False).encode(),
        method="POST",
        headers={"Authorization": sign("POST", API_PATH, "", access_key, secret_key),
                 "Content-Type": "application/json;charset=UTF-8"})
    with urllib.request.urlopen(req, timeout=40) as res:
        payload = json.loads(res.read().decode())
    if str(payload.get("rCode")) != "0":
        raise RuntimeError("API error: {}".format(payload))
    return payload["data"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default=os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    ap.add_argument("--subid", default="starfitpick")
    ap.add_argument("--out", default=None)
    ap.add_argument("--dry-run", action="store_true", help="검색어 수집만 하고 API는 호출하지 않음")
    args = ap.parse_args()

    if args.dry_run:
        for q, src in collect(args.repo):
            print("{}\t{}".format(q, src))
        return

    access_key = os.environ.get("COUPANG_ACCESS_KEY")
    secret_key = os.environ.get("COUPANG_SECRET_KEY")
    if not access_key or not secret_key:
        sys.exit("COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY 환경변수가 필요합니다.")

    queries = [q for q, _ in collect(args.repo)]
    print("검색어 {}개".format(len(queries)))

    links = {}
    for i in range(0, len(queries), BATCH):
        batch = queries[i:i + BATCH]
        urls = ["https://www.coupang.com/np/search?q=" + urllib.parse.quote(q) for q in batch]
        for q, item in zip(batch, deeplink(urls, args.subid, access_key, secret_key)):
            links[q] = item["shortenUrl"]
            assert "lptag=" in (item.get("landingUrl") or ""), item
        print("  {}/{}".format(i + len(batch), len(queries)))
        time.sleep(0.5)

    out = args.out or os.path.join(args.repo, "data", "coupang-links.js")
    lines = ["/* 자동 생성 파일 — 직접 고치지 말고 tools/build_coupang_links.py 를 다시 돌리세요.",
             "   파트너스 API로 만든 검색어별 공식 단축 링크(추적에 필요).",
             "   생성: {} */".format(datetime.date.today()),
             "window.SFP_COUPANG_LINKS = {"]
    for q in queries:
        lines.append("  {}: {},".format(json.dumps(q, ensure_ascii=False), json.dumps(links[q])))
    lines.append("};")
    open(out, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("저장:", out)


if __name__ == "__main__":
    main()
