#!/usr/bin/env python3
"""스타핏픽 look-*.html 의 Product JSON-LD 를 Google 판매자 목록(Merchant listings)
필수·권장 항목에 맞게 보강한다.

  - image        : 페이지 대표 이미지 절대 URL (assets/looks/*.jpg)
  - description  : 페이지 데이터(SFP_LOOK_DATA)의 실제 상품 정보로 조합
  - sku          : 사이트 고유 문자열(SFP-L{LOOK번호}-{순번}) — 중복·형식 오류 제거
  - offers.shippingDetails / offers.hasMerchantReturnPolicy : KRW 기준 표준 구조
  - review / aggregateRating : 실제 후기·별점이 없으므로 생성하지 않는다(허위 데이터 금지)

실행: python3 tools/build_product_jsonld.py [--check]
  --check  : 파일을 쓰지 않고 보강 대상 페이지만 보고
"""
import glob
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jsdata import extract_look_data  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://starfitpick.netlify.app/"

SHIPPING_DETAILS = {
    "@type": "OfferShippingDetails",
    "shippingRate": {"@type": "MonetaryAmount", "value": "3000", "currency": "KRW"},
    "shippingDestination": {"@type": "DefinedRegion", "addressCountry": "KR"},
    "deliveryTime": {
        "@type": "ShippingDeliveryTime",
        "handlingTime": {"@type": "QuantitativeValue", "minValue": 1, "maxValue": 2, "unitCode": "DAY"},
        "transitTime": {"@type": "QuantitativeValue", "minValue": 1, "maxValue": 3, "unitCode": "DAY"},
    },
}

RETURN_POLICY = {
    "@type": "MerchantReturnPolicy",
    "applicableCountry": "KR",
    "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
    "merchantReturnDays": 7,
    "returnMethod": "https://schema.org/ReturnByMail",
    "returnFees": "https://schema.org/ReturnShippingFees",
}

ROLE_BY_CATEGORY = {
    "outer": "아우터", "top": "상의", "bottom": "하의", "shoes": "신발",
    "bag": "가방", "acc": "액세서리", "dress": "원피스", "knit": "니트",
}
PARTNO = re.compile(r"^[A-Za-z0-9][A-Za-z0-9\-_/.]{2,}$")


def clean(v):
    if not isinstance(v, str):
        return ""
    v = re.sub(r"\s+", " ", v).strip()
    return v


def sentence(v):
    v = clean(v).rstrip(".")
    return v


def won(n):
    try:
        return f"{int(n):,}"
    except (TypeError, ValueError):
        return ""


def price_of(d):
    for k in ("salePrice", "price"):
        p = d.get(k)
        if isinstance(p, (int, float)) and p > 0:
            return int(p)
    return None


def josa_ro(word):
    """'로/으로' 조사 선택 (받침 유무)."""
    w = clean(word)
    if not w:
        return "로"
    ch = w[-1]
    if "가" <= ch <= "힣":
        jong = (ord(ch) - 0xAC00) % 28
        return "로" if jong in (0, 8) else "으로"
    return "로"


def describe_main(item, look, role, num):
    brand, name = clean(item.get("brand")), clean(item.get("name"))
    parts = [f"{look.get('celeb') or '연예인'}의 {clean(look.get('scene')) or look.get('show') or '착장'} "
             f"착장에서 {role}{josa_ro(role)} 소개한 {brand} {name}.".replace("  ", " ")]
    if clean(item.get("colors")):
        parts.append(f"색상은 {sentence(item['colors'])}.")
    if clean(item.get("material")):
        parts.append(f"소재는 {sentence(item['material'])}.")
    if clean(item.get("sizes")):
        parts.append(f"사이즈는 {sentence(item['sizes'])}.")
    if clean(item.get("fit")):
        parts.append(f"핏은 {sentence(item['fit'])}.")
    p = price_of(item)
    if p:
        note = sentence(item.get("saleNote"))
        parts.append(f"판매가는 {won(p)}원" + (f"({note})" if note else "") + ".")
    if clean(item.get("cons")):
        parts.append(f"아쉬운 점은 {sentence(item['cons'])}.")
    parts.append(f"스타핏픽 LOOK {num}에서 실착 사진과 구매처를 함께 확인할 수 있습니다.")
    return " ".join(parts)


def describe_ootd(o, look, role, num):
    brand, name = clean(o.get("brand")), clean(o.get("name"))
    parts = [f"{look.get('celeb') or '연예인'}의 {clean(look.get('scene')) or look.get('show') or '착장'} "
             f"착장에 {role}{josa_ro(role)} 매칭한 {brand} {name}.".replace("  ", " ")]
    if clean(o.get("colors")):
        parts.append(f"색상은 {sentence(o['colors'])}.")
    if clean(o.get("note")):
        parts.append(f"{sentence(o['note'])}.")
    p = price_of(o)
    if p:
        parts.append(f"판매가는 {won(p)}원.")
    parts.append(f"스타핏픽 LOOK {num}에서 코디 전체와 구매처를 확인할 수 있습니다.")
    return " ".join(parts)


def describe_alt(alt, look, num):
    brand, name = clean(alt.get("brand")), clean(alt.get("name"))
    parts = [f"{look.get('celeb') or '연예인'}의 {clean(look.get('scene')) or look.get('show') or '착장'} "
             f"착장과 같은 무드로 고른 대안 아이템 {brand} {name}.".replace("  ", " ")]
    p = price_of(alt)
    was = alt.get("was")
    if p:
        tail = f"판매가는 {won(p)}원"
        if isinstance(was, (int, float)) and was > p:
            tail += f", 정품 대비 {won(was - p)}원 저렴합니다"
        parts.append(tail + ".")
    if clean(alt.get("fit")):
        parts.append(f"핏은 {sentence(alt['fit'])}.")
    if clean(alt.get("cons")):
        parts.append(f"정품과 다른 점은 {sentence(alt['cons'])}.")
    if clean(alt.get("note")):
        note = sentence(alt["note"])
        if note not in " ".join(parts):
            parts.append(f"{note}.")
    parts.append(f"스타핏픽 LOOK {num}에서 정품과 대안을 나란히 비교했습니다.")
    return " ".join(parts)


def build_product(existing, data, kind, look, num, idx, page_url, image_url):
    brand_name = clean((existing.get("brand") or {}).get("name")) or clean(data.get("brand"))
    name = clean(existing.get("name")) or clean(data.get("name"))
    role = clean(data.get("role")) or ROLE_BY_CATEGORY.get(look.get("category"), "착장 아이템")
    if kind == "main":
        desc = describe_main(data, look, role, num)
    elif kind == "alt":
        desc = describe_alt(data, look, num)
    else:
        desc = describe_ootd(data, look, role, num)

    price = price_of(data)
    if price is None:
        try:
            price = int(re.sub(r"[^0-9]", "", str((existing.get("offers") or {}).get("price") or "")))
        except ValueError:
            price = None

    prod = {
        "@type": "Product",
        "@id": f"{page_url}#product-{idx + 1:02d}",
        "name": name,
        "image": [image_url],
        "description": desc,
        "sku": f"SFP-L{num:03d}-{idx + 1:02d}",
    }
    partno = clean(data.get("sku"))
    if partno and PARTNO.match(partno):
        prod["mpn"] = partno
    if brand_name:
        prod["brand"] = {"@type": "Brand", "name": brand_name}
    if clean(data.get("material")) and kind == "main":
        prod["material"] = sentence(data["material"])
    prod["url"] = page_url

    offer = {
        "@type": "Offer",
        "url": page_url,
        "priceCurrency": "KRW",
        "availability": "https://schema.org/InStock",
        "itemCondition": "https://schema.org/NewCondition",
        "shippingDetails": SHIPPING_DETAILS,
        "hasMerchantReturnPolicy": RETURN_POLICY,
    }
    if price:
        offer["price"] = str(price)
    prod["offers"] = offer
    return prod


def rewrite(page_path, write=True):
    html = open(page_path, encoding="utf-8").read()
    name = os.path.basename(page_path)
    m = re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
    if not m:
        return None
    graph = json.loads(m.group(1))
    data = extract_look_data(html)
    if not data:
        return None
    look = data["look"]

    canon = re.search(r'<link rel="canonical" href="([^"]+)"', html)
    page_url = canon.group(1) if canon else SITE + name
    og = re.search(r'<meta property="og:image" content="([^"]+)"', html)
    if not og:
        return None
    image_url = og.group(1)
    num = int(re.search(r"class=\"eyebrow\">LOOK\s*(\d+)", html).group(1))

    ootd = look.get("ootd") or []
    if ootd:
        kinds = ["main"] + ["ootd"] * (len(ootd) - 1)
        items = ootd
        main_item = look.get("item") or {}
        items = [dict(main_item, **ootd[0])] + ootd[1:]
    else:
        items = [look.get("item") or {}]
        kinds = ["main"]
        if look.get("alt"):
            items.append(look["alt"])
            kinds.append("alt")

    def find_article(o):
        if isinstance(o, dict):
            if o.get("@type") == "Article":
                return o
            for v in o.values():
                r = find_article(v)
                if r:
                    return r
        elif isinstance(o, list):
            for v in o:
                r = find_article(v)
                if r:
                    return r
        return None

    node = find_article(graph.get("@graph", graph))
    products = node.get("about") or []
    if len(products) != len(items):
        raise ValueError(f"{name}: 상품 수 불일치 {len(products)} != {len(items)}")

    node["about"] = [
        build_product(products[i], items[i], kinds[i], look, num, i, page_url, image_url)
        for i in range(len(items))
    ]
    payload = json.dumps(graph, ensure_ascii=False, indent=None, separators=(", ", ": "))
    new_html = html[:m.start(1)] + payload + html[m.end(1):]
    if write and new_html != html:
        open(page_path, "w", encoding="utf-8").write(new_html)
    return len(items)


def main():
    write = "--check" not in sys.argv
    total = 0
    skipped = []
    for p in sorted(glob.glob(os.path.join(ROOT, "look-*.html"))):
        try:
            n = rewrite(p, write=write)
        except ValueError as exc:
            skipped.append((os.path.basename(p), str(exc)))
            continue
        if n is None:
            skipped.append((os.path.basename(p), "SFP_LOOK_DATA 없음"))
        else:
            total += n
    print(f"{'점검' if not write else '보강'} 완료 · 상품 {total}개 · 건너뜀 {len(skipped)}편")
    for name, why in skipped:
        print("  skip", name, "-", why)


if __name__ == "__main__":
    main()
