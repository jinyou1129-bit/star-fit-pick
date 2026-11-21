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
    url: "https://starfitpick.netlify.app/",
    // 문의는 개인 메일 주소 대신 저장소 이슈로 받습니다(개인정보 노출 최소화).
    contactUrl: "https://github.com/jinyou1129-bit/star-fit-pick/issues/new",
    updated: "2026-11-20"
  },

  /* ---------- 1) 제휴(어필리에이트) ----------
     쿠팡 파트너스는 추적 파라미터를 직접 붙이는 방식이 아니라
     파트너스 API로 만든 공식 단축 링크(link.coupang.com/a/...)를 써야 실적이 잡힙니다.
     그래서 검색어별 단축 링크를 data/coupang-links.js(window.SFP_COUPANG_LINKS)에 두고,
     아래 buildLink()가 쿠팡일 때 그 맵을 먼저 조회합니다.
     (맵 생성: work/starfitpick-coupang/build_all_links.py · 키는 저장소에 두지 않음)
     예)
       coupangPartners.id = "AF1746171" → 파트너 ID(표시·기록용)
       adpick.id = "adpick_xxx"          → 애드픽 래퍼(link.adpick.co.kr) 사용
  ------------------------------------------- */
  affiliates: {
    coupangPartners: { id: "AF1746171", subId: "starfitpick" },
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
  // 네이버 쇼핑커넥트(브랜드커넥트)에서 실제로 발급받은 고유 링크(naver.me/...)를 찾는다.
  // 검색 URL 파라미터로는 실적이 잡히지 않으므로, 발급 링크가 있는 검색어만 제휴 링크로 바꾼다.
  naverPick: function (query) {
    var raw = String(query == null ? "" : query);
    var q = raw.replace(/\s+/g, " ").trim();
    var map = window.SFP_NAVER_LINKS || {};
    if (map[q]) return map[q];
    if (map[raw]) return map[raw];
    var norm = q.toLowerCase().replace(/[^0-9a-z가-힣]/g, "");
    var byNorm = window.SFP_NAVER_BY_NORM || {};
    if (byNorm[norm]) {
      for (var k in map) {
        if (map[k].u === byNorm[norm]) return map[k];
      }
      return { u: byNorm[norm] };
    }
    return null;
  },

  buildLink: function (platform, query) {
    var cfg = window.SFP_CONFIG;
    var q = String(query == null ? "" : query).replace(/\s+/g, " ").trim();
    var base = (cfg.search[platform] || cfg.search.naver)(q);
    var a = cfg.affiliates;

    // 네이버: 발급받은 쇼핑커넥트 링크가 있으면 그 링크를 그대로 쓴다(실적은 이 링크로만 잡힘).
    if (platform === "naver") {
      var pick = cfg.naverPick(q);
      if (pick && pick.u) return pick.u;
    }

    // 쿠팡: 파트너스 API로 만든 공식 단축 링크가 있으면 그대로 반환한다(실적 추적은 이 링크로만 됨).
    if (platform === "coupang") {
      var map = window.SFP_COUPANG_LINKS || {};
      var tracked = map[q] || map[String(query == null ? "" : query).trim()];
      if (tracked) base = tracked;
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
