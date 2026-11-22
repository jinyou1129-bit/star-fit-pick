/* =========================================================
   스타핏픽 룩 상세 페이지 강화 (무신사 스냅 · 29CM 벤치마킹)
   ---------------------------------------------------------
   · 각 look-*.html은 페이지 하단에 window.SFP_LOOK_DATA(해당 룩 + 모델)를
     주입받고, 이 스크립트가 다음을 렌더링한다.
     1) 히어로 사진 바로 아래 "착용 아이템" 가로 스크롤 미니 카드(번호 매칭)
     2) 모델 스펙 칩(키 · 무드 · 가상인물)
     3) 내 옷장 원클릭 저장 버튼 (index.html의 찜 카운터와 같은 localStorage)
     4) 모바일 하단 고정 최저가/코디 바 (≤760px, 히어로 통과 후 노출)
   · 기존 제휴 버튼·고지 문구는 그대로 두고, 카드는 페이지 내 #buy/#more 앵커로만 연결한다.
   ========================================================= */
(function () {
  "use strict";
  var D = window.SFP_LOOK_DATA;
  if (!D || !D.look) return;
  var look = D.look, model = D.model || null;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

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

  /* ---------- 내 옷장 (index.html과 동일한 저장소 키) ---------- */
  var CLOSET_KEY = "sfp:closet:v1";
  function readCloset() {
    try {
      var raw = localStorage.getItem(CLOSET_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function writeCloset(arr) {
    try { localStorage.setItem(CLOSET_KEY, JSON.stringify(arr)); } catch (e) {}
  }
  function inCloset() { return readCloset().indexOf(look.id) > -1; }

  /* ---------- 토스트 공용 ---------- */
  function showToast(msg) {
    var toast = $(".look-actions-toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toast.classList.remove("show"); }, 2600);
  }

  /* ---------- 링크 복사 · 공유 (바이럴) ---------- */
  function shareTitle() {
    var who = look.celeb ? look.celeb + " " : "";
    return who + (look.headline || "화제 착장") + " · 스타핏픽";
  }
  function shareUrl() {
    return location.origin + location.pathname;
  }
  function copyLink(url) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(url);
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement("textarea");
        ta.value = url;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "-1000px";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, url.length);
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (ok) resolve(); else reject(new Error("copy failed"));
      } catch (e) { reject(e); }
    });
  }
  function nativeShareOk() {
    if (!navigator.share) return false;
    try {
      return window.matchMedia("(pointer: coarse)").matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    } catch (e) { return false; }
  }
  function onShare(btn) {
    var url = shareUrl();
    if (nativeShareOk()) {
      navigator.share({ title: shareTitle(), text: shareTitle(), url: url }).then(function () {
        showToast("공유 시트로 보냈어요");
      }).catch(function () { /* 사용자가 닫은 경우 포함 — 조용히 무시 */ });
      return;
    }
    copyLink(url).then(function () {
      showToast("링크가 복사됐어요!");
    }).catch(function () {
      showToast("복사가 안 됐어요. 주소창 링크를 복사해 주세요.");
    });
  }
  function bindShare(btn) {
    if (!btn) return;
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      onShare(btn);
    });
  }

  function syncClosetUI(justAdded) {
    var on = inCloset();
    var n = readCloset().length;
    $$(".sfp-save").forEach(function (b) {
      b.setAttribute("aria-pressed", on ? "true" : "false");
      var label = b.querySelector(".save-label");
      if (label) label.textContent = on ? "옷장에 저장됨" : "내 옷장에 저장";
      var ico = b.querySelector(".save-ico");
      if (ico) { ico.textContent = on ? "♥" : "♡"; ico.setAttribute("data-on", on ? "1" : "0"); }
      b.title = on ? "내 옷장에서 빼기" : "내 옷장에 저장";
    });
    $$("#closet-count").forEach(function (el) { el.textContent = n; });
    $$(".look-actions-closet b").forEach(function (el) { el.textContent = n; });
    if (justAdded) {
      showToast(on ? "내 옷장 " + n + "개에 담았어요" : "내 옷장에서 뺐어요");
    }
  }
  function toggleCloset() {
    var arr = readCloset();
    var i = arr.indexOf(look.id);
    var added;
    if (i > -1) { arr.splice(i, 1); added = false; }
    else { arr.push(look.id); added = true; }
    writeCloset(arr);
    syncClosetUI(added);
  }
  function bindSave(btn) {
    btn.classList.add("sfp-save");
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      toggleCloset();
    });
  }

  /* ---------- 제휴 CTA로 부드럽게 이동 (메인 제휴 버튼을 화면 중앙에) ---------- */
  function mainCta() {
    return $("#buy-official a.cta") || $("#buy-ootd a.cta") || $(".buy-panel a.cta") || $("a.buy-btn.cta");
  }
  function scrollToCta() {
    var host = $("#buy") || $("#buy-ootd");
    if (!host) { location.hash = "#more"; return; }
    var target = mainCta() || host;
    try {
      var rect = target.getBoundingClientRect();
      var barH = document.body.classList.contains("has-sbb") ? 74 : 0;
      var top = window.pageYOffset + rect.top - Math.max(12, (window.innerHeight - barH - rect.height) / 2);
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    } catch (e) {
      try { target.scrollIntoView({ block: "center" }); } catch (e2) { target.scrollIntoView(); }
    }
    if (target && target.classList) {
      target.classList.remove("is-flash");
      setTimeout(function () { target.classList.add("is-flash"); }, 300);
      setTimeout(function () { target.classList.remove("is-flash"); }, 2800);
    }
  }
  // #buy 로 향하는 모든 내부 링크(고정 바 · 아이템 카드 등)를 한 곳에서 처리
  document.addEventListener("click", function (e) {
    var el = e.target;
    while (el && el !== document) {
      if (el.tagName === "A") break;
      el = el.parentElement;
    }
    if (!el || el.tagName !== "A") return;
    var href = el.getAttribute("href") || "";
    if (href !== "#buy" && href !== "#buy-ootd") return;
    if (el.className && String(el.className).indexOf("buy-btn") > -1) return;
    e.preventDefault();
    scrollToCta();
  }, true);

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
      '<p class="its-hint">카드를 누르면 아래 구매 버튼으로 이동합니다</p></div>' +
      '<div class="its-scroll">' +
      cards.map(function (c) {
        return '<a class="its-card" href="' + buyAnchor() + '">' +
          '<span class="its-num" aria-hidden="true">' + c.num + "</span>" +
          '<span class="its-role">' + esc(c.role) + (c.tag ? " · " + esc(c.tag) : "") + "</span>" +
          '<span class="its-brand">' + esc(c.brand) + "</span>" +
          '<span class="its-name">' + esc(c.name) + "</span>" +
          '<span class="its-price">' + (c.price ? esc(won(c.price)) : "가격 좌표 확인") + "</span>" +
          '<span class="its-go">구매 버튼 보기 ↓</span>' +
          "</a>";
      }).join("") +
      "</div>";
    if (figure && figure.parentNode === body) figure.insertAdjacentElement("afterend", sec);
    else body.insertAdjacentElement("afterbegin", sec);
  }

  /* ---------- 2) 모델 스펙 칩 + 내 옷장 저장 버튼 ---------- */
  var meta = $(".article-meta");
  var anchorEl = null;
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
    anchorEl = row;
  }

  var actions = document.createElement("div");
  actions.className = "look-actions";
  actions.innerHTML =
    '<button class="save-btn" type="button" aria-pressed="false">' +
      '<span class="save-ico" aria-hidden="true">♡</span><span class="save-label">내 옷장에 저장</span>' +
    "</button>" +
    '<button class="share-btn" type="button" aria-label="이 착장 링크 복사 또는 공유">' +
      '<span class="share-ico" aria-hidden="true">🔗</span><span class="share-label">' +
      (nativeShareOk() ? "공유" : "링크 복사") + "</span>" +
    "</button>" +
    '<a class="look-actions-closet" href="index.html?closet=1">내 옷장 <b>0</b>개</a>' +
    '<span class="look-actions-toast" role="status" aria-live="polite"></span>';
  if (anchorEl) anchorEl.insertAdjacentElement("afterend", actions);
  else if (meta) meta.insertAdjacentElement("afterend", actions);
  bindSave($(".save-btn", actions));
  bindShare($(".share-btn", actions));
  syncClosetUI(false);

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
      '<button class="sbb-btn save" type="button" aria-pressed="false" title="내 옷장에 저장">' +
        '<span class="save-ico" aria-hidden="true">♡</span>' +
      "</button>" +
      '<a class="sbb-btn" href="' + buyAnchor() + '">최저가 좌표</a>' +
      "</div>";
    document.body.appendChild(bar);
    bindSave($(".sbb-btn.save", bar));
    syncClosetUI(false);

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
