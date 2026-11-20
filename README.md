# 스타핏픽 (Star Fit Pick)

연예인·예능·공항 착장을 **실제 사진 + 출처**와 함께 정리하고, 정품 가격과 가성비 대안을 비교하는 큐레이션 사이트. 정적 사이트(GitHub Pages)로 배포됩니다.

- 라이브: https://jinyou1129-bit.github.io/star-fit-pick/
- 디자인: Toss UI 톤(화이트·연그레이 베이스, 둥근 카드, 1px 보더, 포인트 블루 `#3182F6`)
- 사진 원칙: 공항·행사 현장 촬영, 방송 화면, 본인 인스타그램, 브랜드 공식 룩북 등 **확인된 공개 이미지**만 사용하고 카드·상세마다 출처를 표기합니다. 방송 화면을 확보하지 못한 착장은 브랜드 제품 컷으로 대체하고 `제품 이미지`로 표기합니다.

## 구조

```
index.html            메인 (히어로·필터·검색·내 옷장·무드 테스트·상세 모달·가이드 티저)
guides.html           패션 가이드 6편 허브 (애드센스 콘텐츠·SEO 유입용)
guide-*.html          개별 가이드 6편 (각 1,200~1,600자 본문 + 관련 착장 + 이전/다음 글)
about.html            사이트 소개 / 사진·가격 원칙
contact.html          문의·정보 수정·사진 삭제 요청
privacy.html          개인정보처리방침
404.html              404
style.css             전체 스타일 (Toss UI + 화이트 부티크)
app.js                필터/검색/찜/테스트/모달 로직
data/looks.js         ★ 착장 데이터 (룩 추가·수정은 여기서)
data/config.js        ★ 제휴 ID·광고 슬롯·문의 채널 (한 곳에서 일괄 적용)
assets/looks/         착장 사진 (900×1125 JPG + WebP)
assets/og-cover.png   OG 대표 이미지
sitemap.xml, robots.txt
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

## 가이드 추가하기

`.scratch/build_guides.py`(작업 환경) 또는 동일 구조의 스크립트로 `GUIDES` 배열에 항목을 추가하면 허브·개별 페이지·이전/다음 링크가 한 번에 생성됩니다. 새 글은 `sitemap.xml`에도 추가합니다.
