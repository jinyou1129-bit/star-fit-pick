#!/usr/bin/env python3
"""스타핏픽 V8 검색 노출·색인 보강 (멱등).

  - BreadcrumbList 구조화 데이터가 없는 페이지에 추가
  - 홈 · 가이드 허브에 본문에 보이는 FAQ 섹션 추가 (JSON-LD FAQPage와 문구 1:1 일치)
  - 가이드 허브에 ItemList(가이드 22편) 추가
  - 푸터 '패밀리 사이트'에 Seoul Bites · Seoul Glow 추가
  - sitemap.xml 전수 재생성 (실제 파일 · git 최종 수정일 기준 lastmod)
  - rss.xml lastBuildDate 갱신

실행: python3 tools/improve_seo.py
"""
import glob
import html
import json
import os
import re
import subprocess
from datetime import datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://starfitpick.netlify.app/"
VERIFY = {"google2e11e4ceacb9542c.html", "navercd9187cfed832165270bd0baef541547.html"}
KST = timezone(timedelta(hours=9))
TODAY = datetime.now(KST).date().isoformat()

MARK_BC = "<!-- sfp:v8-breadcrumb -->"
MARK_FAQ = "<!-- sfp:v8-faq -->"
MARK_IL = "<!-- sfp:v8-itemlist -->"

# 가이드 허브 전용 FAQ (본문 섹션과 JSON-LD가 같은 문구를 쓴다)
GUIDES_FAQ = [
    ("패션 가이드는 어떤 기준으로 쓰나요?",
     "브랜드 공식몰·공식 판매처에 표기된 소재 혼용률, 충전재, 실제 판매가를 기준으로 정리하고, "
     "모든 가이드에 확인 날짜를 적습니다. 확인되지 않은 수치는 쓰지 않으며, 방송·화보에서 확인한 "
     "착장은 원본 출처를 함께 표기합니다."),
    ("가이드에 나온 제품이 지금도 살 수 있나요?",
     "가격과 재고는 판매처와 시즌에 따라 달라집니다. 가이드는 '고르는 기준'을 설명하는 글이라 "
     "특정 링크의 재고를 보장하지 않으니, 구매 전 판매 페이지에서 색상·사이즈·가격을 다시 확인해 주세요. "
     "각 착장 포스팅에는 확인 날짜가 표시되어 있습니다."),
    ("키·체형별 추천은 어떻게 계산하나요?",
     "어깨선·총장·밑단의 세 기준점을 봅니다. 같은 100사이즈라도 어깨가 떨어지는 오버핏인지, "
     "총장이 힙을 덮는지에 따라 키별로 어울리는 기장이 달라지므로, 가이드마다 키 구간과 체형별 "
     "보완법을 나눠 설명합니다."),
    ("착장 포스팅과 패션 가이드는 무엇이 다른가요?",
     "패션 가이드는 소재·기장·관리법처럼 다시 찾아보는 기준을 정리한 글이고, 착장 포스팅은 "
     "특정 날짜의 연예인 착장을 브랜드·가격·대안까지 좌표로 정리한 글입니다. 가이드 상단의 "
     "'이 기준으로 고른 착장'에서 실제 제품 예시로 이어집니다."),
    ("AI 모델 사진과 실제 제품 색이 같나요?",
     "스타핏픽 착장 이미지는 전속 AI 모델이 실제 판매 제품을 착용한 연출 컷이며 모두 가상 인물입니다. "
     "조명과 화면에 따라 색이 다르게 보일 수 있으니, 정확한 색상은 판매처의 실물 상품 이미지와 "
     "상세 페이지를 기준으로 확인해 주세요."),
]

FAMILY_EXTRA = (
    '<li><a href="https://jinyou1129-bit.github.io/seoul-bites-guide/" target="_blank" rel="noopener">'
    'Seoul Bites ↗<small>서울 미식·시장 여행 가이드(영문)</small></a></li>\n        '
    '<li><a href="https://jinyou1129-bit.github.io/seoul-glow-guide/" target="_blank" rel="noopener">'
    'Seoul Glow ↗<small>올리브영·K뷰티 쇼핑 가이드(영문)</small></a></li>\n        '
)


def read(p):
    return open(p, encoding="utf-8").read()


def write(p, s):
    open(p, "w", encoding="utf-8").write(s)


def rel(name):
    return SITE + ("" if name == "index.html" else name)


def git_date(name):
    """파일의 마지막 커밋 날짜(YYYY-MM-DD). 미커밋 변경이 있으면 오늘."""
    try:
        dirty = subprocess.run(["git", "status", "--porcelain", "--", name], cwd=ROOT,
                               capture_output=True, text=True).stdout.strip()
        if dirty:
            return TODAY
        out = subprocess.run(["git", "log", "-1", "--format=%cs", "--", name], cwd=ROOT,
                             capture_output=True, text=True).stdout.strip()
        return out or TODAY
    except Exception:
        return TODAY


def title_of(s):
    m = re.search(r"<title>(.*?)</title>", s, re.S)
    return html.unescape(m.group(1)).strip() if m else ""


def faq_page_of(s):
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', s, re.S):
        try:
            j = json.loads(m.group(1))
        except Exception:
            continue
        stack = [j]
        while stack:
            n = stack.pop()
            if isinstance(n, dict):
                if n.get("@type") == "FAQPage" and n.get("mainEntity"):
                    return n["mainEntity"]
                stack.extend(n.values())
            elif isinstance(n, list):
                stack.extend(n)
    return None


def guides_faq_jsonld():
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": SITE + "guides.html#faq",
        "mainEntity": [
            {"@type": "Question", "name": q,
             "acceptedAnswer": {"@type": "Answer", "text": a}}
            for q, a in GUIDES_FAQ
        ],
    }


def faq_html(entities):
    items = []
    for q in entities:
        name = q.get("name", "")
        ans = (q.get("acceptedAnswer") or {}).get("text", "")
        items.append(
            "<details><summary>%s</summary><p>%s</p></details>"
            % (html.escape(name, quote=False), html.escape(ans, quote=False))
        )
    return (
        '\n  <section class="faq-block" id="faq" aria-labelledby="faq-title">\n'
        '    <div class="wrap">\n'
        '      <p class="eyebrow">FAQ</p>\n'
        '      <h2 id="faq-title">자주 묻는 질문</h2>\n'
        '      <div class="faq-list">\n        ' + "\n        ".join(items) + "\n      </div>\n"
        '      <p class="faq-more">더 궁금한 점은 <a href="about.html">사이트 소개·검증 기준</a>과 '
        '<a href="contact.html">문의 페이지</a>에서 확인할 수 있습니다.</p>\n'
        '    </div>\n  </section>\n'
    )


def add_breadcrumbs(name, s):
    if MARK_BC in s or "BreadcrumbList" in s:
        return s
    t = title_of(s)
    if name.startswith("guide-"):
        trail = [("스타핏픽", SITE), ("패션 가이드", SITE + "guides.html"), (t, rel(name))]
    elif name == "guides.html":
        trail = [("스타핏픽", SITE), ("패션 가이드", rel(name))]
    elif name == "personal-color.html":
        trail = [("스타핏픽", SITE), ("퍼스널컬러 진단", rel(name))]
    elif name in ("about.html", "contact.html", "privacy.html", "terms.html"):
        trail = [("스타핏픽", SITE), (t, rel(name))]
    else:
        return s
    ld = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "item": u}
            for i, (n, u) in enumerate(trail)
        ],
    }
    block = (MARK_BC + '\n<script type="application/ld+json">'
             + json.dumps(ld, ensure_ascii=False) + "</script>\n")
    return s.replace("</head>", block + "</head>", 1)


def add_faq(name, s):
    if MARK_FAQ in s:
        return s
    if name == "guides.html" and "FAQPage" not in s:
        block = (MARK_FAQ + '\n<script type="application/ld+json">'
                 + json.dumps(guides_faq_jsonld(), ensure_ascii=False) + "</script>\n")
        s = s.replace("</head>", block + "</head>", 1)
    entities = faq_page_of(s)
    if not entities:
        return s
    body = re.sub(r'<script type="application/ld\+json">.*?</script>', "", s, flags=re.S)
    if "자주 묻는 질문" in body or "</main>" not in s:
        return s
    return s.replace("</main>", faq_html(entities) + "</main>", 1)


def add_itemlist(name, s):
    if name != "guides.html" or MARK_IL in s or '"ItemList"' in s:
        return s
    cards = re.findall(
        r'<a class="guide-card" href="(guide-[a-z0-9-]+\.html)"[^>]*>.*?<h3>(.*?)</h3>', s, re.S)
    if not cards:
        return s
    ld = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "@id": SITE + "guides.html#guides",
        "name": "스타핏픽 패션 가이드 %d편" % len(cards),
        "numberOfItems": len(cards),
        "itemListOrder": "https://schema.org/ItemListOrderAscending",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "url": rel(h),
             "name": re.sub(r"<[^>]+>", "", html.unescape(n)).strip()}
            for i, (h, n) in enumerate(cards)
        ],
    }
    block = (MARK_IL + '\n<script type="application/ld+json">'
             + json.dumps(ld, ensure_ascii=False) + "</script>\n")
    return s.replace("</head>", block + "</head>", 1)


def add_family(s):
    if "seoul-bites-guide" in s:
        return s
    m = re.search(r'(<p class="foot-title">패밀리 사이트</p>\s*<ul>.*?)(\n\s*</ul>)', s, re.S)
    if not m:
        return s
    return s[:m.end(1)] + "\n        " + FAMILY_EXTRA.rstrip() + m.group(2) + s[m.end():]


def build_sitemap(pages):
    looks = [p for p in pages if p.startswith("look-")]
    look_dates = [git_date(p) for p in looks]
    latest_look = max(look_dates) if look_dates else TODAY
    hub = {"index.html": "1.0", "posts.html": "0.9", "tv.html": "0.9", "guides.html": "0.9",
           "worldcup.html": "0.7", "personal-color.html": "0.8"}
    rows = []
    for p in pages:
        if p.startswith("look-"):
            loc, pr, cf = rel(p), "0.8", "weekly"
            lm = git_date(p)
        elif p in hub:
            loc, pr, cf = rel(p), hub[p], "daily" if p != "worldcup.html" else "monthly"
            lm = max(git_date(p), latest_look) if p in ("index.html", "posts.html", "tv.html") else git_date(p)
        elif p.startswith("guide-"):
            loc, pr, cf = rel(p), "0.7", "monthly"
            lm = git_date(p)
        elif p in ("about.html", "contact.html", "privacy.html", "terms.html"):
            loc, pr, cf = rel(p), "0.3", "yearly"
            lm = git_date(p)
        else:
            loc, pr, cf = rel(p), "0.5", "monthly"
            lm = git_date(p)
        rows.append((loc, lm, cf, pr))
    rows.sort(key=lambda r: (r[0] != SITE, r[0]))
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, lm, cf, pr in rows:
        out.append("  <url>\n    <loc>%s</loc>\n    <lastmod>%s</lastmod>\n"
                   "    <changefreq>%s</changefreq>\n    <priority>%s</priority>\n  </url>"
                   % (loc, lm, cf, pr))
    out.append("</urlset>")
    return "\n".join(out) + "\n", len(rows)


def main():
    pages = [os.path.basename(p) for p in sorted(glob.glob(os.path.join(ROOT, "*.html")))
             if os.path.basename(p) not in VERIFY and os.path.basename(p) != "404.html"]
    changed = []
    for name in pages:
        path = os.path.join(ROOT, name)
        s = orig = read(path)
        s = add_breadcrumbs(name, s)
        s = add_faq(name, s)
        s = add_itemlist(name, s)
        s = add_family(s)
        if s != orig:
            write(path, s)
            changed.append(name)
    sm, n = build_sitemap(pages)
    write(os.path.join(ROOT, "sitemap.xml"), sm)
    rss_path = os.path.join(ROOT, "rss.xml")
    rss = read(rss_path)
    now = datetime.now(KST).strftime("%a, %d %b %Y %H:%M:%S +0900")
    rss = re.sub(r"<lastBuildDate>.*?</lastBuildDate>",
                 "<lastBuildDate>%s</lastBuildDate>" % now, rss, count=1)
    write(rss_path, rss)
    print("수정 페이지 %d개: %s" % (len(changed), ", ".join(changed[:8]) + (" …" if len(changed) > 8 else "")))
    print("sitemap URL %d개 · lastBuildDate %s" % (n, now))


if __name__ == "__main__":
    main()
