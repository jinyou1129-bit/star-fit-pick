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
  function saveLabel(n) {
    if (n >= 10000) {
      var man = Math.round(n / 1000) / 10;
      return (man % 1 === 0 ? String(man) : man.toFixed(1)) + "만원";
    }
    return won(n);
  }
  function buyAnchor() {
    return $("#buy") ? "#buy" : ($("#buy-ootd") ? "#buy-ootd" : "#more");
  }
  /* ---------- 신뢰도 라벨 (실착 / 브랜드 매칭 / 무드 대안) ---------- */
  function lineOf(l) { return l && l.line === "worn" ? "worn" : "match"; }
  function lineBadge(kind) {
    var m = kind === "worn"
      ? { b: "✓ 실착 라인", t: "원본 사진·방송 화면과 제품을 대조해 착용을 확인한 아이템" }
      : kind === "alt"
        ? { b: "≈ 무드 대안", t: "같은 무드로 고른 다른 브랜드 제품 — 동일 제품이 아닙니다" }
        : { b: "✓ 브랜드 매칭", t: "브랜드·품번·판매가를 판매처에서 확인한 실제 판매 제품(실착 사진 미확보 포함)" };
    return '<span class="line-badge ' + kind + '" title="' + esc(m.t) + '">' + m.b + "</span>";
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

  /* ---------- 방금 본 착장 (sfp:recent:v1 공용 저장소) ---------- */
  var RECENT_KEY = "sfp:recent:v1";
  function readRecent() {
    try {
      var raw = localStorage.getItem(RECENT_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter(function (x) { return x && x.id; }) : [];
    } catch (e) { return []; }
  }
  function writeRecent(arr) {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(arr)); } catch (e) {}
  }
  function recordRecent() {
    var arr = readRecent().filter(function (x) { return x.id !== look.id; });
    arr.unshift({
      id: look.id,
      c: look.celeb || "",
      h: look.headline || "",
      i: look.imageJpg || look.image || "",
      w: look.image || "",
      t: Date.now()
    });
    writeRecent(arr.slice(0, 6));
  }
  function recentSection() {
    var others = readRecent().filter(function (x) { return x.id !== look.id; });
    if (!others.length) return null;
    var sec = document.createElement("section");
    sec.className = "recent-sec";
    sec.setAttribute("aria-labelledby", "recent-title");
    sec.innerHTML =
      '<div class="recent-head"><h3 id="recent-title">👀 방금 본 착장</h3>' +
      '<a class="recent-clear" href="index.html?closet=1">내 옷장 보기</a></div>' +
      '<div class="recent-strip">' +
      others.slice(0, 6).map(function (x) {
        return '<a class="recent-card" href="look-' + encodeURIComponent(x.id) + '.html">' +
          '<picture>' + (x.w ? '<source srcset="' + esc(x.w) + '" type="image/webp">' : "") +
          '<img src="' + esc(x.i || x.w) + '" alt="' + esc((x.c || "") + " " + (x.h || "") + " 착장") + '" width="180" height="225" loading="lazy" decoding="async"></picture>' +
          '<b>' + esc(x.c) + '</b><small>' + esc(x.h) + "</small></a>";
      }).join("") +
      "</div>";
    return sec;
  }

  /* ---------- 이전 / 다음 착장 (기존 글 순서 내비게이션 활용) ---------- */
  function stepNav() {
    var prev = $(".guide-nav a.prev"), next = $(".guide-nav a.next");
    if (!prev && !next) return null;
    function side(a, cls, label) {
      if (!a) return "";
      var txt = (a.textContent || "").replace(/→|←/g, "").replace(/이전 착장 글|다음 착장 글|이전 착장|다음 착장/g, "").trim();
      var parts = txt.split(" · ");
      var head = parts[0] || txt;
      var rest = parts.slice(1).join(" · ");
      return '<a class="' + cls + '" href="' + esc(a.getAttribute("href")) + '">' +
        '<span>' + esc(label) + '</span><b>' + esc(head) + '</b>' +
        (rest ? '<small>' + esc(rest) + '</small>' : "") + "</a>";
    }
    var nav = document.createElement("nav");
    nav.className = "look-stepnav";
    nav.setAttribute("aria-label", "이전·다음 착장");
    nav.innerHTML = side(prev, "prev", "← 이전 착장") + side(next, "next", "다음 착장 →");
    return nav;
  }

  recordRecent();

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
        tag: "",
        line: "match"
      });
    });
    if (look.alt && look.alt.price) {
      var opAll = (look.item && (look.item.salePrice || look.item.price)) || 0;
      cards.push({ num: cards.length + 1, role: "대안", brand: look.alt.brand || "", name: look.alt.name || "", price: look.alt.price, tag: "더 저렴", isAlt: true, line: "alt", save: opAll > look.alt.price ? opAll - look.alt.price : 0 });
    }
  } else if (look.item) {
    cards.push({ num: 1, role: "정품", brand: look.item.brand || "", name: (look.item.name || ""), price: (look.item.salePrice || look.item.price || ""), tag: "", line: lineOf(look) });
    if (look.alt && look.alt.price) {
      var opOne = (look.item.salePrice || look.item.price) || 0;
      cards.push({ num: 2, role: "대안", brand: look.alt.brand || "", name: look.alt.name || "", price: look.alt.price, tag: "더 저렴", isAlt: true, line: "alt", save: opOne > look.alt.price ? opOne - look.alt.price : 0 });
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
        return '<a class="its-card' + (c.isAlt ? " is-alt" : "") + '" href="' + buyAnchor() + '">' +
          '<span class="its-num" aria-hidden="true">' + c.num + "</span>" +
          '<span class="its-role">' + esc(c.role) + (c.tag ? " · " + esc(c.tag) : "") + lineBadge(c.line) + "</span>" +
          '<span class="its-brand">' + esc(c.brand) + "</span>" +
          '<span class="its-name">' + esc(c.name) + "</span>" +
          '<span class="its-price">' + (c.price ? esc(won(c.price)) : "가격 좌표 확인") + "</span>" +
          (c.save ? '<span class="its-save">' + esc(saveLabel(c.save)) + " 아낌</span>" : "") +
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

  /* ---------- 구매 좌표의 정품/대안 제목에도 라벨 (JS로 그리는 풀코디 패널 포함) ---------- */
  function decorateKickers() {
    $$(".buy-kicker").forEach(function (el) {
      if (el.querySelector(".line-badge")) return;
      var t = (el.textContent || "").trim();
      if (/^같은 무드/.test(t)) return;
      var kind = null;
      if (/^정품\s*·/.test(t)) kind = lineOf(look);
      else if (/^대안\s*·/.test(t)) kind = "alt";
      else if (el.closest("#buy-ootd")) kind = "match";
      if (!kind) return;
      el.insertAdjacentHTML("afterbegin", lineBadge(kind) + " ");
    });
  }
  decorateKickers();
  setTimeout(decorateKickers, 60);

  /* ---------- 방금 본 착장 + ← 이전 / 다음 착장 → ---------- */
  var guideHead = $("#guide");
  var recentSec = recentSection();
  if (recentSec) {
    if (guideHead && guideHead.parentNode) guideHead.parentNode.insertBefore(recentSec, guideHead);
    else if (body) body.appendChild(recentSec);
  }
  var step = stepNav();
  if (step) {
    if (guideHead && guideHead.parentNode) guideHead.parentNode.insertBefore(step, guideHead);
    else if (body) body.appendChild(step);
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
