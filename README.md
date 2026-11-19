# 스타핏픽 (Star Fit Pick)

연예인·예능 패션 좌표와 가성비 대안템 큐레이션. 정적 사이트(GitHub Pages)로 배포됩니다.

- 라이브: https://jinyou1129-bit.github.io/star-fit-pick/
- 사진 미사용: 착장의 브랜드·제품명·품번·가격·출처만 정리하고, 연예인 사진은 복제·호스팅하지 않습니다.

## 구조

```
index.html            메인 (필터·검색·내 옷장·무드 테스트·상세 모달)
about.html            사이트 소개 / 검증 기준
contact.html          문의·정보 수정 요청
privacy.html          개인정보처리방침
404.html              404
style.css             전체 스타일
app.js                필터/검색/찜/테스트/모달 로직
data/looks.js         ★ 착장 데이터 (룩 추가·수정은 여기서)
data/config.js        ★ 제휴 ID·광고 슬롯·문의 채널 (한 곳에서 일괄 적용)
assets/               favicon, OG 커버
sitemap.xml, robots.txt
```

## 룩 추가하기

`data/looks.js`의 배열에 객체를 하나 더 넣으면 카드·필터·무드 테스트 추천·모달이 자동으로 따라옵니다.

```js
{
  id: "고유-id",
  celeb: "이름", group: "소속", type: "airport|variety|daily",
  show: "공항", scene: "장면 설명",
  category: "outer|top|bottom|shoes|acc",
  mood: ["minimal|lovely|vintage|street"],
  item: { brand, brandEn, name, sku, price, salePrice, saleNote, material, colors, sizes, maker, season, officialUrl },
  alt:  { brand, name, price, platform: "musinsa|coupang|elevenst|official", note, query },
  sources: [{ label, url }],
  palette: ["#111", "#555", "#ddd"]
}
```

## 제휴 ID 붙이기

`data/config.js`의 `affiliates` 값만 채우면 `buildLink()`가 사이트의 모든 구매 링크에 파라미터를 자동으로 붙입니다. 광고는 `ads.adsenseClient`를 넣으면 상단 슬롯이 활성화됩니다.

## 로컬 확인

```bash
cd star-fit-pick
python3 -m http.server 8080
# http://localhost:8080
```

## 배포

`main` 브랜치의 루트를 GitHub Pages로 게시합니다. `.nojekyll` 포함.
