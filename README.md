# 스타핏픽 (Star Fit Pick)

연예인·예능·공항 착장을 **실제 사진 + 출처**와 함께 정리하고, 정품 가격과 가성비 대안을 비교하는 큐레이션 사이트. 정적 사이트(GitHub Pages)로 배포됩니다.

- 라이브: https://jinyou1129-bit.github.io/star-fit-pick/
- 디자인: Toss UI 톤(화이트·연그레이 베이스, 둥근 카드, 1px 보더, 포인트 블루 `#3182F6`)
- 사진 원칙: 공항·행사 현장 촬영, 방송 화면, 본인 인스타그램, 브랜드 공식 룩북 등 **확인된 공개 이미지**만 사용하고 카드·상세마다 출처를 표기합니다. 방송 화면을 확보하지 못한 착장은 브랜드 제품 컷으로 대체하고 `제품 이미지`로 표기합니다.

## 구조

```
index.html            메인 (히어로·필터·검색·내 옷장·무드 테스트·상세 모달·가이드 티저)
posts.html            착장 포스팅 15편 허브 (공항패션·예능·일상 · 카테고리 필터)
look-*.html           개별 착장 포스팅 15편 (각 1,000~1,500자 본문 + 정품/대안 비교표 + 구매 좌표 + 관련 착장·가이드)
guides.html           패션 가이드 10편 허브 (애드센스 콘텐츠·SEO 유입용)
guide-*.html          개별 가이드 10편 (각 1,200~1,600자 본문 + 관련 착장 + 이전/다음 글)
about.html            사이트 소개 / 사진·가격 원칙
contact.html          문의·정보 수정·사진 삭제 요청
privacy.html          개인정보처리방침
404.html              404
style.css             전체 스타일 (Toss UI + 화이트 부티크)
app.js                필터/검색/찜/테스트/모달 로직
data/looks.js         ★ 착장 데이터 (룩 추가·수정은 여기서)
data/config.js        ★ 제휴 ID·광고 슬롯·문의 채널 (한 곳에서 일괄 적용)
data/coupang-links.js ★ 쿠팡 파트너스 추적 링크 맵 (자동 생성 · 직접 편집 금지)
tools/build_coupang_links.py  쿠팡 링크 재생성 스크립트
assets/looks/         착장 사진 (900×1125 JPG + WebP)
assets/og-cover.png   OG 대표 이미지
sitemap.xml, robots.txt
indexnow-<key>.txt    IndexNow 키 파일 (Bing·네이버·Yandex 즉시 색인 요청용)
```

## 룩 추가하기

`data/looks.js`의 배열에 객체를 하나 더 넣으면 카드·필터·무드 테스트 추천·모달이 자동으로 따라옵니다.

```js
{
  id: "고유-id",
  image: "assets/looks/고유-id.webp?v=버전",
  imageJpg: "assets/looks/고유-id.jpg?v=버전",
  photo: { label: "출처 이름", kind: "photo|product", what: "장면 설명", url: "원문 링크" },
  imageAlt: "사진 설명(누가 무엇을 입고 있는지)",
  celeb: "이름", group: "소속", type: "airport|variety|daily",
  show: "공항", scene: "장면 설명",
  category: "outer|top|bottom|shoes|acc",
  mood: ["minimal|lovely|vintage|street"],
  item: { brand, brandEn, name, sku, price, salePrice, saleNote, material, colors, sizes, maker, season, officialUrl },
  alt:  { brand, name, price, platform: "musinsa|coupang|elevenst|official", note, query },
  sources: [{ label, url }],
  verified: "확인 방법",
  palette: ["#111", "#555", "#ddd"]
}
```

## 이미지 교체 시 캐시 주의

같은 파일명으로 사진을 바꾸면 GitHub Pages/브라우저 캐시 때문에 예전 이미지가 보일 수 있습니다. 교체할 때는 `data/looks.js`의 `?v=` 값과 각 HTML의 `style.css?v=` 값을 함께 올려 주세요.

## 쿠팡 파트너스 제휴 링크

쿠팡 파트너스 추적은 `&src=` 같은 임의 파라미터가 아니라 **파트너스 API가 만든 공식 단축 링크**(`https://link.coupang.com/a/...`)로만 잡힙니다. 그래서 파트너 ID(`AF1746171`)·서브ID(`starfitpick`)를 `data/config.js`에 기록하고, 검색어별 단축 링크를 `data/coupang-links.js`에 두었습니다. `SFP_CONFIG.buildLink("coupang", 검색어)`는 이 맵에 있는 링크를 그대로 반환하고, 없으면 일반 검색 링크로 넘어갑니다.

검색어가 늘거나 바뀌면(룩·가이드·퍼스널컬러 추천템 추가 시) 아래처럼 다시 생성합니다. Access/Secret Key는 쿠팡 파트너스 > 추가 기능 > 파트너스 API에서 확인하며, **저장소에 커밋하지 않습니다(환경변수로만).**

```bash
COUPANG_ACCESS_KEY=... COUPANG_SECRET_KEY=... python3 tools/build_coupang_links.py
```

- 대가성 문구: 모든 페이지 푸터와 구매 영역에 「이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.」를 표기합니다.
- 파트너스 `[내 정보]`의 활동 웹사이트 목록에 이 사이트 URL이 등록되어 있어야 실적이 정상 집계됩니다.

## 가이드 추가하기

`.scratch/build_guides.py`(작업 환경) 또는 동일 구조의 스크립트로 `GUIDES` 배열에 항목을 추가하면 허브·개별 페이지·이전/다음 링크가 한 번에 생성됩니다. 새 글은 `sitemap.xml`에도 추가합니다.

## 착장 포스팅(개별 소개 글) 추가하기

`look-{id}.html`은 `data/looks.js`의 착장 id와 1:1로 대응합니다. `.scratch/build_posts.py`(작업 환경)의 `posts_content*.py`에 본문을 넣고 스크립트를 실행하면 15편 페이지와 `posts.html` 허브가 함께 생성됩니다. 새 글을 추가하면 `sitemap.xml`과 `rss.xml`에도 URL을 넣어 주세요.

- 메인 카드를 누르면 지금처럼 **모달**이 바로 열리고, 모달의 `자세히 소개 글로 보기 →` 버튼이 개별 포스팅으로 이어집니다.
- 각 가이드 글의 착장 카드·본문 링크도 `index.html?look=` 대신 개별 포스팅(`look-*.html`)으로 연결되어 내부 링크가 강화됩니다.

## 검색엔진 색인 (IndexNow)

루트의 `indexnow-<key>.txt` 안에 키 값이 들어 있습니다. 배포 후 아래처럼 변경 URL을 통보할 수 있습니다. (Search Console·네이버 서치어드바이저·Bing Webmaster 도구 등록은 최종 도메인 확정 후 진행)

```bash
curl -s -X POST https://api.indexnow.org/indexnow \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"host":"jinyou1129-bit.github.io","key":"<KEY>","keyLocation":"https://jinyou1129-bit.github.io/star-fit-pick/indexnow-<KEY>.txt","urlList":["https://jinyou1129-bit.github.io/star-fit-pick/posts.html"]}'
```
