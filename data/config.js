/* =========================================================
   스타핏픽 — 한 곳에서 관리하는 설정 파일
   ---------------------------------------------------------
   제휴 ID·광고 슬롯·문의 채널을 이 파일 하나에서 바꾸면
   사이트 전체(정품 구매 좌표 + 대안템 링크)에 한 번에 반영됩니다.
   ========================================================= */
window.SFP_CONFIG = {
  site: {
    name: "스타핏픽",
    tagline: "연예인·예능 패션 좌표",
    url: "https://jinyou1129-bit.github.io/star-fit-pick/",
    // 문의는 개인 메일 주소 대신 저장소 이슈로 받습니다(개인정보 노출 최소화).
    contactUrl: "https://github.com/jinyou1129-bit/star-fit-pick/issues/new",
    updated: "2026-11-20"
  },

  /* ---------- 1) 제휴(어필리에이트) ----------
     값을 채우면 아래 buildLink()가 모든 구매 링크에 자동으로 붙입니다.
     비워 두면 일반 검색 링크로 동작합니다(지금 상태).
     예)
       coupangPartners.id = "AF1234567"  → 쿠팡 링크에 src=AF1234567&subid=...
       adpick.id = "adpick_xxx"          → 애드픽 래퍼(link.adpick.co.kr) 사용
  ------------------------------------------- */
  affiliates: {
    coupangPartners: { id: "", subId: "" },
    adpick: { id: "" },
    musinsa: { utmSource: "" },
    naver: { id: "" },
    elevenst: { id: "" }
  },

  /* ---------- 2) 광고 ---------- */
  ads: {
    // 구글 애드센스 승인 후 ca-pub-... 값을 넣으면 index.html의 광고 슬롯이 활성화됩니다.
    adsenseClient: "",
    slots: { top: "", mid: "" }
  },

  /* ---------- 3) 플랫폼 검색 URL 템플릿 ---------- */
  search: {
    naver: function (q) { return "https://search.shopping.naver.com/search/all?query=" + encodeURIComponent(q); },
    coupang: function (q) { return "https://www.coupang.com/np/search?q=" + encodeURIComponent(q); },
    musinsa: function (q) { return "https://www.musinsa.com/search/musinsa/integration?q=" + encodeURIComponent(q); },
    elevenst: function (q) { return "https://search.11st.co.kr/pc/total-search?kwd=" + encodeURIComponent(q); },
    official: function (q) { return "https://search.shopping.naver.com/search/all?query=" + encodeURIComponent(q + " 공식"); }
  },

  /* ---------- 4) 링크 빌더(제휴 파라미터 일괄 적용) ---------- */
  buildLink: function (platform, query) {
    var cfg = window.SFP_CONFIG;
    var base = (cfg.search[platform] || cfg.search.naver)(query);
    var a = cfg.affiliates;

    if (platform === "coupang" && a.coupangPartners.id) {
      base += "&src=" + encodeURIComponent(a.coupangPartners.id);
      if (a.coupangPartners.subId) base += "&subid=" + encodeURIComponent(a.coupangPartners.subId);
    }
    if (platform === "musinsa" && a.musinsa.utmSource) {
      base += "&utm_source=" + encodeURIComponent(a.musinsa.utmSource);
    }
    if (platform === "elevenst" && a.elevenst.id) {
      base += "&utm_source=" + encodeURIComponent(a.elevenst.id);
    }
    if (platform === "naver" && a.naver.id) {
      base += "&utm_source=" + encodeURIComponent(a.naver.id);
    }
    // 애드픽을 쓰는 경우: 애드픽에서 발급한 래퍼 링크로 교체하는 지점
    if (a.adpick.id && platform === "coupang") {
      base = "https://link.adpick.co.kr/" + encodeURIComponent(a.adpick.id) + "?url=" + encodeURIComponent(base);
    }
    return base;
  }
};
