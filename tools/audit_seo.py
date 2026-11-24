#!/usr/bin/env python3
"""스타핏픽 기술적 SEO 전수 점검 (읽기 전용)

  - title / meta description / og:title / og:description / canonical 누락·중복
  - og:image 절대 URL·실제 파일 존재·최소 용량 검증 (63편 룩 대표 이미지 전수)
  - look-*.html 의 Article · BreadcrumbList JSON-LD 존재
  - 히어로 이미지 fetchpriority=high, 그 외 loading=lazy + decoding=async
  - sitemap.xml · rss.xml URL 수와 실제 페이지 존재 여부
  - 구형 편수 문구(N편 전체 보기) 잔존 여부
  - 내부 링크 깨짐(로컬 파일 기준)

  실행: python3 tools/audit_seo.py
"""
import re
import glob
import os
import json
import collections
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://starfitpick.netlify.app/"
VERIFY = {"google2e11e4ceacb9542c.html", "navercd9187cfed832165270bd0baef541547.html"}


def pages():
    out = []
    for p in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
        name = os.path.basename(p)
        if name in VERIFY:
            continue
        out.append((name, open(p, encoding="utf-8").read()))
    return out


def main():
    P = pages()
    works = collections.defaultdict(list)
    titles, descs, canons = collections.Counter(), collections.Counter(), collections.Counter()
    og_checked = set()

    for name, s in P:
        def one(pat):
            return re.findall(pat, s, re.S | re.I)

        t = one(r"<title>(.*?)</title>")
        d = one(r'<meta\s+name="description"\s+content="(.*?)"')
        ot = one(r'<meta\s+property="og:title"\s+content="(.*?)"')
        od = one(r'<meta\s+property="og:description"\s+content="(.*?)"')
        c = one(r'<link\s+rel="canonical"\s+href="(.*?)"')
        for key, val in (("title", t), ("description", d), ("og:title", ot), ("og:description", od), ("canonical", c)):
            if len(val) != 1:
                works[key + " 개수"].append((name, len(val)))
            elif not val[0].strip():
                works[key + " 빈 값"].append(name)
        if t: titles[t[0]] += 1
        if d: descs[d[0]] += 1
        if c: canons[c[0]] += 1

        # ---- og:image 검증 (절대 URL · 실제 파일 · 최소 용량 · twitter:image 일치) ----
        oi = one(r'<meta\s+property="og:image"\s+content="(.*?)"')
        if len(oi) != 1:
            works["og:image 개수"].append((name, len(oi)))
        elif not oi[0].strip():
            works["og:image 빈 값"].append(name)
        else:
            og_url = oi[0].strip()
            if not og_url.startswith(SITE):
                works["og:image 절대 URL 아님"].append((name, og_url[:100]))
            else:
                rel = og_url[len(SITE):].split("?")[0]
                path = os.path.join(ROOT, rel)
                if not os.path.exists(path):
                    works["og:image 파일 없음"].append((name, rel))
                elif os.path.getsize(path) < 5000:
                    works["og:image 파일 너무 작음"].append((name, rel, os.path.getsize(path)))
                og_checked.add(rel)
            if not one(r'<meta\s+property="og:image:width"'):
                works["og:image:width 없음"].append(name)
            if not one(r'<meta\s+property="og:image:height"'):
                works["og:image:height 없음"].append(name)
            ti = one(r'<meta\s+name="twitter:image"\s+content="(.*?)"')
            if len(ti) == 1 and ti[0].strip() and ti[0].strip() != og_url:
                works["twitter:image ≠ og:image"].append((name, ti[0][-60:]))
            # 룩 상세: og:image 가 페이지 히어로 이미지와 같은 파일인지
            if name.startswith("look-"):
                hero = one(r'<link\s+rel="preload"\s+as="image"\s+href="([^"]+)"')
                if hero and os.path.splitext(og_url.split("?")[0])[0] != os.path.splitext(SITE + hero[0].split("?")[0].lstrip("./"))[0]:
                    works["og:image ≠ 히어로 이미지"].append((name, og_url.split("/")[-1], hero[0]))

        if name.startswith("look-"):
            if '"@type": "Article"' not in s and '"@type":"Article"' not in s: works["Article 없음"].append(name)
            if "BreadcrumbList" not in s: works["BreadcrumbList 없음"].append(name)
            imgs = re.findall(r"<img\b[^>]*>", s)
            hero = [i for i in imgs if "post-figure" in s[: s.find(i)] or True][:1]
            if not any('fetchpriority="high"' in i for i in imgs):
                works["히어로 fetchpriority=high 없음"].append(name)
            lazy_bad = [i for i in imgs if "loading=" not in i]
            if lazy_bad: works["loading 누락"].append(name)
            dec_bad = [i for i in imgs if "decoding=" not in i]
            if dec_bad: works["decoding 누락"].append(name)
            if 'rel="preload" as="image"' not in s: works["히어로 preload 없음"].append(name)
            if s.count("<h1") != 1: works["h1 개수 이상"].append(name)
            if not re.search(r"<title>[^<]{10,}", s): works["title 짧음"].append(name)
            if len(d[0]) < 60 if d else False: works["description 짧음"].append(name)

        for m in re.finditer(r"\d+편 전체 보기", s):
            if m.group(0) != "63편 전체 보기":
                works["구형 편수 문구"].append((name, m.group(0)))

    for k, v in (("title 중복", titles), ("description 중복", descs), ("canonical 중복", canons)):
        dups = [(t, n) for t, n in v.items() if n > 1]
        if dups: works[k] = dups

    # sitemap / rss
    sm = os.path.join(ROOT, "sitemap.xml")
    tree = ET.parse(sm)
    locs = [e.text for e in tree.getroot().iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
    missing = []
    for loc in locs:
        rel = loc.replace(SITE, "").split("?")[0]
        if rel and not os.path.exists(os.path.join(ROOT, rel)):
            missing.append(loc)
    if missing:
        works["sitemap 404 후보"] = missing

    rss = open(os.path.join(ROOT, "rss.xml"), encoding="utf-8").read()
    rss_links = re.findall(r"<link>([^<]+)</link>", rss)
    rss_missing = [l for l in rss_links if l.startswith(SITE) and not os.path.exists(
        os.path.join(ROOT, l.replace(SITE, "").split("?")[0]))]
    if rss_missing:
        works["rss 404 후보"] = rss_missing

    # 내부 링크
    broken = set()
    for name, s in P:
        for href in re.findall(r'href="([^"#:]+\.html)(?:[?#][^"]*)?"', s):
            if not os.path.exists(os.path.join(ROOT, href)):
                broken.add((name, href))
    if broken:
        works["깨진 내부 링크"] = sorted(broken)[:20]

    print("페이지:", len(P), "· sitemap URL:", len(locs), "· rss item:", rss.count("<item>"), "· og:image 고유 파일:", len(og_checked))
    if not works:
        print("✅ 문제 없음")
    for k, v in works.items():
        print("⚠", k, len(v), v[:10])
    return works


if __name__ == "__main__":
    main()
