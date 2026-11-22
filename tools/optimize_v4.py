#!/usr/bin/env python3
"""스타핏픽 V4 일괄 반영 스크립트 (2026-11-22)

  1) 제휴 CTA 위계: 네이버 쇼핑커넥트·쿠팡 = 큰 CTA, 공식 페이지 = mid, 단순 검색 = chip
  2) look-*.html: 히어로 이미지 preload, 헤더 '내 옷장' 칩, 관련 코디 4편 + 이어보기
  3) 구형 문구 'N편 전체 보기' -> '59편 전체 보기'
  4) style.css / look-enhance.js 캐시 버전 범프

  실행: python3 tools/optimize_v4.py
"""
import re
import glob
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOOK_COUNT = len(glob.glob(os.path.join(ROOT, "look-*.html")))
TODAY = "2026-11-22"
CSS_V = "2026112302"
ENH_V = "2026112302"


# ---------------------------------------------------------------- looks data
def load_looks():
    """data/looks.js에서 룩 요약 필드만 뽑아낸다 (JS 객체 → 정규식 파싱)."""
    src = open(os.path.join(ROOT, "data", "looks.js"), encoding="utf-8").read()
    start = src.find("window.SFP_LOOKS")
    body = src[start:]
    starts = [m.start() for m in re.finditer(r'\n  \{\s*\n    "?id"?\s*:', body)]
    looks = []
    for i, s in enumerate(starts):
        block = body[s:starts[i + 1]] if i + 1 < len(starts) else body[s:]

        def first(pat, default=""):
            m = re.search(pat, block)
            return m.group(1) if m else default

        mood_m = re.search(r'"?mood"?\s*:\s*\[([^\]]*)\]', block)
        moods = re.findall(r'"([^"]+)"', mood_m.group(1)) if mood_m else []
        looks.append({
            "id": first(r'"?id"?\s*:\s*"([^"]+)"'),
            "celeb": first(r'"?celeb"?\s*:\s*"([^"]+)"'),
            "headline": first(r'"?headline"?\s*:\s*"([^"]+)"'),
            "category": first(r'"?category"?\s*:\s*"([^"]+)"'),
            "brand": first(r'"?brand"?\s*:\s*"([^"]+)"'),
            "name": first(r'"?name"?\s*:\s*"([^"]+)"'),
            "price": int(first(r'"?price"?\s*:\s*(\d+)', "0") or 0),
            "image": first(r'"?imageJpg"?\s*:\s*"([^"]+)"') or first(r'"?image"?\s*:\s*"([^"]+)"'),
            "moods": moods,
        })
    return [l for l in looks if l["id"]]


def related(look, looks, n=6):
    """app.js와 같은 취향 점수: 무드 겹침 > 같은 셀럽 > 같은 카테고리 > 가격대 근접."""
    out = []
    for o in looks:
        if o["id"] == look["id"]:
            continue
        score = len(set(o["moods"]) & set(look["moods"])) * 3
        score += 1 if o["celeb"] == look["celeb"] else 0
        score += 1 if o["category"] == look["category"] else 0
        a, b = look["price"] or 1, o["price"] or 1
        ratio = max(a, b) / min(a, b)
        if ratio <= 1.4:
            score += 1
        out.append((score, ratio, o))
    out.sort(key=lambda x: (-x[0], x[1]))
    return [o for _, _, o in out[:n]]


# ---------------------------------------------------------------- transforms
def rewrite_buy_v1(html):
    """items 루프형(신규 룩 4편)."""
    old_loop = re.search(
        r"  items\.forEach\(function \(o\) \{.*?  \}\);\n  host\.innerHTML = html;\n", html, re.S)
    if not old_loop:
        return None
    new_loop = """  items.forEach(function (o) {
    var nv = cfg.naverPick && cfg.naverPick(o.query);
    html += '<div class="buy-col">' +
      '<p class="buy-kicker">' + esc(o.role) + ' · ' + esc(o.brand) + ' · ' + esc(o.name) + '</p>' +
      '<div class="buy-row">' +
      (nv ? a(nv.u, '네이버 쇼핑커넥트 ↗', 'cta cta-naver') : '') +
      a(cfg.buildLink('coupang', o.query), '쿠팡에서 비슷한 스타일 보기 ↗', 'cta cta-coupang' + (nv ? '' : ' wide')) +
      a(o.officialUrl, '제품·판매 페이지 ↗', 'mid') +
      (nv ? '' : a(cfg.buildLink('naver', o.query), '네이버 쇼핑 검색 ↗', 'chip')) +
      a(cfg.buildLink('musinsa', o.query), '무신사 검색 ↗', 'chip') +
      '</div></div>';
  });
  host.innerHTML = html;
"""
    html = html[:old_loop.start()] + new_loop + html[old_loop.end():]

    m = re.search(r"  var nvLook = \(window\.SFP_NAVER_BY_LOOK \|\| \{\}\)\[LOOK_ID\];\n", html)
    if m:
        end = html.find("  }\n", html.find("if (nvLook) {", m.end())) + 4
        new_nv = """  var nvLook = (window.SFP_NAVER_BY_LOOK || {})[LOOK_ID];
  if (nvLook) {
    host.insertAdjacentHTML('beforeend',
      '<div class="buy-col buy-col-feature"><p class="buy-kicker">같은 무드 네이버 판매 상품 · ' + esc(nvLook.p) + '</p>' +
      '<a class="buy-btn cta cta-naver wide" href="' + nvLook.u + '" target="_blank" rel="noopener sponsored">네이버 쇼핑커넥트에서 이 무드 보기 ↗</a></div>');
  }
"""
        html = html[:m.start()] + new_nv + html[end:]
    return html


def rewrite_buy_v2(html):
    """정품·대안 buy-row형(55편)."""
    # 1) 변수 준비 (altLabel 변수는 그대로 두고, 제휴 링크 존재 여부만 미리 계산)
    prep = ("  var nvO = cfg.naverPick && cfg.naverPick(q);\n"
            "  var nvA = cfg.naverPick && cfg.naverPick(aq);\n")
    anchor = re.search(r"  document\.getElementById\('buy-official'\)\.innerHTML =", html)
    if not anchor:
        return None
    if "var nvO = cfg.naverPick" not in html:
        html = html[:anchor.start()] + prep + html[anchor.start():]

    # 2) 정품 블록
    m = re.search(r"  document\.getElementById\('buy-official'\)\.innerHTML =.*?;\n", html, re.S)
    if not m:
        return None
    off = """  document.getElementById('buy-official').innerHTML =
    (nvO ? a(nvO.u, '네이버 쇼핑커넥트 ↗', 'cta cta-naver') : '') +
    a(cfg.buildLink('coupang', q), '쿠팡에서 비슷한 스타일 보기 ↗', 'cta cta-coupang' + (nvO ? '' : ' wide')) +
    a(o.officialUrl, '제품·판매 페이지 ↗', 'mid') +
    (nvO ? '' : a(cfg.buildLink('naver', q), '네이버 쇼핑 검색 ↗', 'chip')) +
    a(cfg.buildLink('musinsa', q), '무신사 검색 ↗', 'chip');
"""
    html = html[:m.start()] + off + html[m.end():]

    # 3) 대안 블록
    m = re.search(r"  document\.getElementById\('buy-alt'\)\.innerHTML =.*?11번가 검색 ↗', 'sub'\);\n", html, re.S)
    if not m:
        return None
    alt = """  document.getElementById('buy-alt').innerHTML =
    (nvA ? a(nvA.u, '네이버 쇼핑커넥트 ↗', 'cta cta-naver') : '') +
    a(cfg.buildLink('coupang', aq), '쿠팡에서 비슷한 스타일 보기 ↗', 'cta cta-coupang' + (nvA ? '' : ' wide')) +
    ((o.alt.platform === 'coupang' || (nvA && o.alt.platform === 'official')) ? '' :
      a(cfg.buildLink(o.alt.platform === 'official' ? 'naver' : o.alt.platform, aq), altLabel, 'mid')) +
    a(cfg.buildLink('elevenst', aq), '11번가 검색 ↗', 'chip');
"""
    html = html[:m.start()] + alt + html[m.end():]
    return html


def add_preload(html):
    if 'rel="preload" as="image"' in html:
        return html
    m = re.search(r'<img src="(assets/looks/[^"?]+)\.jpg(\?v=[^"]*)?"', html)
    if not m:
        return html
    webp = m.group(1) + ".webp" + (m.group(2) or "")
    link = '<link rel="preload" as="image" href="%s" type="image/webp">\n' % webp
    return html.replace('<link rel="stylesheet" href="style.css', link + '<link rel="stylesheet" href="style.css', 1)


def add_header_closet(html):
    if 'class="closet-trigger" href="index.html?closet=1"' in html or 'closet-count' in html:
        return html
    m = re.search(r'<a class="closet-trigger" href="posts\.html">([^<]*)</a>', html)
    if not m:
        return html
    chip = ('<a class="closet-trigger" href="index.html?closet=1" title="내 옷장 보기">내 옷장 '
            '<span class="count" id="closet-count">0</span></a>\n    ' + m.group(0))
    return html[:m.start()] + chip + html[m.end():]


def upgrade_strip(html, look, looks):
    m = re.search(r'<h2 id="more">같은 무드의 다른 셀럽 착장</h2>\s*\n(\s*)<div class="look-strip">(.*?)</div>', html, re.S)
    if not m:
        return None
    strip = m.group(2)
    existing = re.findall(r'href="look-([a-z0-9\-]+)\.html"', strip)
    cand = [o for o in related(look, looks, 8) if o["id"] not in existing][0]
    price = "%s원" % format(cand["price"], ",") if cand["price"] else ""
    tile = ('<a href="look-%s.html"><img src="%s" alt="%s %s 착장 · 스타핏픽 전속 AI 모델 연출 컷" '
            'width="900" height="1200" loading="lazy" decoding="async"><b>%s · %s</b><small>%s · %s</small></a>'
            % (cand["id"], cand["image"], cand["celeb"], cand["headline"], cand["celeb"], cand["headline"], cand["brand"], price))
    new_strip = ('<h2 id="more">같은 무드의 다른 셀럽 착장</h2>\n'
                 '%s<p class="section-sub-sm">무드와 가격대가 비슷한 코디 4편. 이어서 보면 조합이 더 쉽게 잡힙니다.</p>\n'
                 '%s<div class="look-strip look-strip--4">%s%s</div>\n'
                 '%s<a class="look-strip-more" href="posts.html">착장 포스팅 %d편에서 더 보기 →</a>'
                 % (m.group(1), m.group(1), strip, tile, m.group(1), LOOK_COUNT))
    return html[:m.start()] + new_strip + html[m.end():]


def bump_versions(html):
    html = re.sub(r'style\.css\?v=\d+', 'style.css?v=' + CSS_V, html)
    html = re.sub(r'look-enhance\.js\?v=\d+', 'look-enhance.js?v=' + ENH_V, html)
    return html


def main():
    looks = load_looks()
    by_id = {l["id"]: l for l in looks}
    print("looks parsed:", len(looks), "look pages:", LOOK_COUNT)
    stats = {"v1": 0, "v2": 0, "strip": 0, "preload": 0, "closet": 0, "count_fix": 0, "skip": []}

    for path in sorted(glob.glob(os.path.join(ROOT, "look-*.html"))):
        name = os.path.basename(path)
        lid = name[len("look-"):-len(".html")]
        html = open(path, encoding="utf-8").read()
        before = html

        # 1) 구형 편수 문구
        new = re.sub(r'\d+편 전체 보기', '%d편 전체 보기' % LOOK_COUNT, html)
        if new != html:
            stats["count_fix"] += 1
        html = new

        # 2) 제휴 버튼 위계
        if "getElementById('buy-ootd')" in html:
            r = rewrite_buy_v1(html)
            if r:
                html = r
                stats["v1"] += 1
            else:
                stats["skip"].append((name, "buy-v1"))
        elif "getElementById('buy-official')" in html:
            r = rewrite_buy_v2(html)
            if r:
                html = r
                stats["v2"] += 1
            else:
                stats["skip"].append((name, "buy-v2"))
        else:
            stats["skip"].append((name, "buy-unknown"))

        # 3) 히어로 이미지 preload
        new = add_preload(html)
        if new != html:
            stats["preload"] += 1
        html = new

        # 4) 헤더 내 옷장 칩
        new = add_header_closet(html)
        if new != html:
            stats["closet"] += 1
        html = new

        # 5) 관련 코디 4편
        look = by_id.get(lid)
        if look:
            r = upgrade_strip(html, look, looks)
            if r:
                html = r
                stats["strip"] += 1
            else:
                stats["skip"].append((name, "strip"))
        else:
            stats["skip"].append((name, "look-data"))

        # 6) 캐시 버전
        html = bump_versions(html)

        if html != before:
            open(path, "w", encoding="utf-8").write(html)

    # 나머지 페이지: 버전 범프 + 편수 문구
    for path in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
        if os.path.basename(path).startswith("look-"):
            continue
        html = open(path, encoding="utf-8").read()
        before = html
        html = re.sub(r'\d+편 전체 보기', '%d편 전체 보기' % LOOK_COUNT, html)
        html = bump_versions(html)
        if html != before:
            open(path, "w", encoding="utf-8").write(html)

    print(json.dumps(stats, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
