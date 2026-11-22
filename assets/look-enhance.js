/* =========================================================
   스타핏픽 룩 상세 페이지 강화 (무신사 스냅 · 29CM 벤치마킹)
   ---------------------------------------------------------
   · 각 look-*.html은 페이지 하단에 window.SFP_LOOK_DATA(해당 룩 + 모델)를
     주입받고, 이 스크립트가 다음을 렌더링한다.
     1) 히어로 사진 바로 아래 "착용 아이템" 가로 스크롤 미니 카드(번호 매칭)
     2) 모델 스펙 칩(키 · 무드 · 가상인물)
     3) 모바일 하단 고정 최저가/코디 바 (≤760px, 히어로 통과 후 노출)
   · 기존 제휴 버튼·고지 문구는 그대로 두고, 카드는 페이지 내 #buy/#more 앵커로만 연결한다.
   ========================================================= */
(function () {
  "use strict";
  var D = window.SFP_LOOK_DATA;
  if (!D || !D.look) return;
  var look = D.look, model = D.model || null;
  var $ = function (s, r) { return (r || document).querySelector(s); };

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function won(n) {
    try { return Number(n).toLocaleString("ko-KR") + "원"; } catch (e) { return String(n); }
  }
  function buyAnchor() {
    return $("#buy") ? "#buy" : ($("#buy-ootd") ? "#buy-ootd" : "#more");
  }
  function moreAnchor() {
    return $("#more") ? "#more" : "#guide";
  }

  /* ---------- 1) 착용 아이템 미니 카드 스트립 (무신사 스냅형) ---------- */
  var cards = [];
  if (Array.isArray(look.ootd) && look.ootd.length) {
    look.ootd.forEach(function (o, i) {
      cards.push({
        num: i + 1,
        role: o.role || "",
        brand: o.brand || look.item.brand || "",
        name: o.name || "",
        price: o.price || o.salePrice || "",
        tag: ""
      });
    });
    if (look.alt && look.alt.price) {
      cards.push({ num: cards.length + 1, role: "대안", brand: look.alt.brand || "", name: look.alt.name || "", price: look.alt.price, tag: "더 저렴" });
    }
  } else if (look.item) {
    cards.push({ num: 1, role: "정품", brand: look.item.brand || "", name: (look.item.name || ""), price: (look.item.salePrice || look.item.price || ""), tag: "" });
    if (look.alt && look.alt.price) {
      cards.push({ num: 2, role: "대안", brand: look.alt.brand || "", name: look.alt.name || "", price: look.alt.price, tag: "더 저렴" });
    }
  }

  var body = $(".article-body");
  var figure = $(".post-figure");
  if (body && cards.length) {
    var sec = document.createElement("section");
    sec.className = "item-strip-sec";
    sec.setAttribute("aria-label", "착용 아이템 좌표");
    sec.innerHTML =
      '<div class="its-head"><p class="its-kicker">착용 아이템 좌표</p>' +
      '<p class="its-hint">카드를 누르면 아래 가격·구매 좌표로 이동합니다</p></div>' +
      '<div class="its-scroll">' +
      cards.map(function (c) {
        return '<a class="its-card" href="' + buyAnchor() + '">' +
          '<span class="its-num" aria-hidden="true">' + c.num + "</span>" +
          '<span class="its-role">' + esc(c.role) + (c.tag ? " · " + esc(c.tag) : "") + "</span>" +
          '<span class="its-brand">' + esc(c.brand) + "</span>" +
          '<span class="its-name">' + esc(c.name) + "</span>" +
          '<span class="its-price">' + (c.price ? esc(won(c.price)) : "가격 좌표 확인") + "</span>" +
          '<span class="its-go">좌표 보기 ↓</span>' +
          "</a>";
      }).join("") +
      "</div>";
    if (figure && figure.parentNode === body) figure.insertAdjacentElement("afterend", sec);
    else body.insertAdjacentElement("afterbegin", sec);
  }

  /* ---------- 2) 모델 스펙 칩 (스냅형 신뢰 배지) ---------- */
  var meta = $(".article-meta");
  if (meta) {
    var chips = [];
    if (model && model.name) {
      chips.push("모델 " + model.name + (model.height ? " · " + model.height + "cm" : ""));
      if (model.mood) chips.push(model.mood);
    }
    chips.push("가상인물 연출");
    var row = document.createElement("p");
    row.className = "model-chips";
    row.innerHTML = chips.map(function (t) { return '<span class="mchip">' + esc(t) + "</span>"; }).join("");
    meta.insertAdjacentElement("afterend", row);
  }

  /* ---------- 3) 모바일 하단 고정 바 (최저가 · 코디) ---------- */
  var alt = look.alt || null;
  if (alt && alt.price) {
    var bar = document.createElement("div");
    bar.className = "sticky-buy-bar";
    bar.setAttribute("role", "navigation");
    bar.setAttribute("aria-label", "빠른 이동 · 최저가 요약");
    var saveRate = "";
    try {
      var op = (look.item && (look.item.salePrice || look.item.price)) || 0;
      if (op > alt.price && op > 0) saveRate = Math.round((1 - alt.price / op) * 100) + "%↓";
    } catch (e) {}
    bar.innerHTML =
      '<div class="sbb-info"><b>' + esc(won(alt.price)) + "</b><span>대안 " + esc(saveRate) + " · " + esc(alt.brand || "") + "</span></div>" +
      '<div class="sbb-actions">' +
      '<a class="sbb-btn ghost" href="' + moreAnchor() + '">비슷한 코디</a>' +
      '<a class="sbb-btn" href="' + buyAnchor() + '">최저가 좌표</a>' +
      "</div>";
    document.body.appendChild(bar);

    var hero = $(".article-hero");
    var shown = false;
    function onScroll() {
      var trigger = hero ? hero.offsetTop + hero.offsetHeight - 120 : 240;
      var over = window.scrollY > trigger;
      if (over !== shown) {
        shown = over;
        bar.classList.toggle("show", shown);
        document.body.classList.toggle("has-sbb", shown);
      }
    }
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { onScroll(); ticking = false; });
    }, { passive: true });
    onScroll();
  }
})();
