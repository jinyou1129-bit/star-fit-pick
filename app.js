/* =========================================================
   스타핏픽 — app.js
   필터 · 검색 · 내 옷장 · 무드 테스트 · 상세 모달
   ========================================================= */
(function () {
  "use strict";

  var CFG = window.SFP_CONFIG;
  var LOOKS = window.SFP_LOOKS || [];

  /* ---------------- labels ---------------- */
  var TYPE_LABEL = { airport: "공항", variety: "예능", daily: "일상" };
  var CAT_LABEL = { outer: "아우터", top: "상의", bottom: "하의", shoes: "신발", acc: "잡화" };
  var MOOD_LABEL = { minimal: "미니멀", lovely: "러블리", vintage: "빈티지", street: "스트리트" };
  var TYPE_ORDER = ["airport", "variety", "daily"];
  var CAT_ORDER = ["outer", "top", "bottom", "shoes", "acc"];
  var MOOD_ORDER = ["minimal", "lovely", "vintage", "street"];
  var BUDGET_CAP = 100000;

  var MOOD_RESULT = {
    minimal: {
      name: "미니멀 시티",
      desc: "색을 줄이고 실루엣으로 말하는 타입입니다. 무채색 아우터 하나와 좋은 니트, 군더더기 없는 가방이면 충분합니다. 김지원의 공항 룩처럼 한 아이템에 광택이나 벨트 같은 '한 가지 포인트'만 남기는 방식이 잘 맞습니다.",
      looks: ["jiwon-aloro-velvet", "jiwon-teramo-backpack", "yoonseok-kume-knit"]
    },
    lovely: {
      name: "러블리 캐주얼",
      desc: "포근한 질감과 부드러운 색에서 기분이 올라가는 타입입니다. 도트 패딩 슈즈나 머플러 니트처럼 '가까이서 보면 귀여운' 디테일이 잘 맞습니다. 전체를 파스텔로 가기보다 한 아이템만 포인트로 두면 성숙하게 정리됩니다.",
      looks: ["jennie-subu-dot", "doyeon-atelier-yak", "jiwon-aloro-velvet"]
    },
    vintage: {
      name: "빈티지 캠퍼스",
      desc: "체크, 워싱, 야크·캐시미어 같은 소재의 결을 좋아하는 타입입니다. 새것처럼 반짝이는 옷보다 몇 번 입은 듯한 질감이 잘 맞습니다. 체크 셔츠에 무지 티, 데님 한 장이면 가장 안정적인 공식이 완성됩니다.",
      looks: ["wooyoung-tomboy-check", "doyeon-atelier-yak", "yoonseok-kume-knit"]
    },
    street: {
      name: "스트리트 모던",
      desc: "움직임이 편하고 볼륨이 있는 실루엣을 좋아하는 타입입니다. 크롭 니트 집업, 와이드 스웨트팬츠, 쿠셔닝 좋은 스니커즈 조합이 잘 맞습니다. 컬러는 두 가지 안에서만 쓰고, 소재(가죽·니트·나일론)로 변화를 주면 정리돼 보입니다.",
      looks: ["yeeun-mahagrid-zip", "sechan-wakei-pants", "haha-adidas-hyperboost"]
    }
  };

  /* ---------------- helpers ---------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function won(n) { return n.toLocaleString("ko-KR") + "원"; }
  function pct(from, to) {
    if (!from || !to) return 0;
    return Math.round((1 - to / from) * 100);
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function price(look) { return look.item.salePrice || look.item.price; }
  function saveAmount(look) { return Math.max(0, price(look) - look.alt.price); }
  function saveRate(look) { return pct(price(look), look.alt.price); }
  function findLook(id) {
    for (var i = 0; i < LOOKS.length; i++) if (LOOKS[i].id === id) return LOOKS[i];
    return null;
  }
  function isMobile() { return window.matchMedia("(max-width: 760px)").matches; }

  /* ---------------- storage ---------------- */
  var STORE = { closet: "sfp:closet:v1", mood: "sfp:mood:v1" };
  function readCloset() {
    try {
      var raw = localStorage.getItem(STORE.closet);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter(function (id) { return !!findLook(id); }) : [];
    } catch (e) { return []; }
  }
  function writeCloset(arr) {
    try { localStorage.setItem(STORE.closet, JSON.stringify(arr)); } catch (e) {}
  }
  var closet = readCloset();

  /* ---------------- state ---------------- */
  var state = { q: "", type: "", cat: "", mood: "", celeb: "", budget: false, closet: false, sort: "recent" };
  var lastFocus = null;

  function readURL() {
    var p = new URLSearchParams(location.search);
    state.q = (p.get("q") || "").trim();
    state.type = TYPE_ORDER.indexOf(p.get("type")) > -1 ? p.get("type") : "";
    state.cat = CAT_ORDER.indexOf(p.get("cat")) > -1 ? p.get("cat") : "";
    state.mood = MOOD_ORDER.indexOf(p.get("mood")) > -1 ? p.get("mood") : "";
    state.celeb = p.get("celeb") || "";
    state.budget = p.get("budget") === "1";
    state.closet = p.get("closet") === "1";
    state.sort = ["recent", "save", "price-low", "price-high"].indexOf(p.get("sort")) > -1 ? p.get("sort") : "recent";
  }
  function writeURL(extra) {
    var p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    if (state.type) p.set("type", state.type);
    if (state.cat) p.set("cat", state.cat);
    if (state.mood) p.set("mood", state.mood);
    if (state.celeb) p.set("celeb", state.celeb);
    if (state.budget) p.set("budget", "1");
    if (state.closet) p.set("closet", "1");
    if (state.sort !== "recent") p.set("sort", state.sort);
    if (extra && extra.look) p.set("look", extra.look);
    var qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  }

  /* ---------------- gradient art ---------------- */
  function artStyle(look) {
    var c = look.palette || ["#222", "#555", "#ddd"];
    return "background:" +
      "radial-gradient(120% 90% at 12% 8%, " + c[2] + "55 0%, transparent 58%)," +
      "radial-gradient(90% 80% at 88% 20%, " + c[1] + "88 0%, transparent 62%)," +
      "linear-gradient(150deg," + c[0] + " 0%," + c[1] + " 62%," + c[0] + " 100%)";
  }
  var GLYPH = {
    outer: '<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M42 20 L24 34 L16 86 L40 92 L44 60 L44 100 L76 100 L76 60 L80 92 L104 86 L96 34 L78 20"/><path d="M42 20 Q60 40 78 20"/><path d="M60 32 L60 100"/></svg>',
    top: '<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M40 24 L20 40 L32 58 L44 50 L44 100 L76 100 L76 50 L88 58 L100 40 L80 24"/><path d="M48 24 Q60 38 72 24"/></svg>',
    bottom: '<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M38 18 H82 L86 102 H66 L60 60 L54 102 H34 Z"/><path d="M38 26 H82"/></svg>',
    shoes: '<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M14 78 Q22 56 40 54 L54 66 L82 66 Q104 70 106 88 L106 96 L14 96 Z"/><path d="M40 54 L48 72"/><path d="M56 72 H100"/></svg>',
    acc: '<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M42 44 V34 Q42 22 60 22 Q78 22 78 34 V44"/><rect x="28" y="44" width="64" height="54" rx="8"/><path d="M28 66 H92"/></svg>'
  };

  /* ---------------- render chips ---------------- */
  function countBy(key, val) {
    return LOOKS.filter(function (l) {
      if (key === "mood") return (l.mood || []).indexOf(val) > -1;
      if (key === "cat") return l.category === val;
      return l[key] === val;
    }).length;
  }
  function buildChips(el, values, labels, key) {
    if (!el) return;
    el.innerHTML = values.map(function (v) {
      return '<button type="button" class="chip" data-key="' + key + '" data-value="' + v + '" aria-pressed="false">' +
        labels[v] + '<span class="num">' + countBy(key, v) + "</span></button>";
    }).join("");
  }
  function celebList() {
    var seen = {}, out = [];
    LOOKS.forEach(function (l) { if (!seen[l.celeb]) { seen[l.celeb] = 1; out.push(l.celeb); } });
    return out;
  }

  /* ---------------- filtering ---------------- */
  function matches(look) {
    if (state.type && look.type !== state.type) return false;
    if (state.cat && look.category !== state.cat) return false;
    if (state.mood && (look.mood || []).indexOf(state.mood) === -1) return false;
    if (state.celeb && look.celeb !== state.celeb) return false;
    if (state.budget && look.alt.price > BUDGET_CAP) return false;
    if (state.closet && closet.indexOf(look.id) === -1) return false;
    if (state.q) {
      var hay = [
        look.celeb, look.group, look.show, look.scene, look.headline,
        look.item.brand, look.item.brandEn, look.item.name, look.item.nameEn, look.item.sku,
        look.alt.brand, look.alt.name,
        (look.mood || []).map(function (m) { return MOOD_LABEL[m]; }).join(" "),
        CAT_LABEL[look.category], TYPE_LABEL[look.type]
      ].join(" ").toLowerCase();
      var terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      for (var i = 0; i < terms.length; i++) if (hay.indexOf(terms[i]) === -1) return false;
    }
    return true;
  }
  function sorted(list) {
    var arr = list.slice();
    if (state.sort === "save") arr.sort(function (a, b) { return saveAmount(b) - saveAmount(a); });
    else if (state.sort === "price-low") arr.sort(function (a, b) { return price(a) - price(b); });
    else if (state.sort === "price-high") arr.sort(function (a, b) { return price(b) - price(a); });
    return arr;
  }

  /* ---------------- card ---------------- */
  function num2(n) { return String(n + 1).padStart(2, "0"); }
  function picture(look, eager) {
    var alt = look.imageAlt || (look.celeb + " " + look.item.name + " 착장 연출 이미지");
    return '<picture>' +
      (look.image ? '<source srcset="' + esc(look.image) + '" type="image/webp">' : "") +
      '<img src="' + esc(look.imageJpg || look.image) + '" alt="' + esc(alt) + '" width="720" height="960"' +
      (eager ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"') + ' decoding="async">' +
      "</picture>";
  }
  function sceneLabel(look) {
    return look.show === TYPE_LABEL[look.type] ? TYPE_LABEL[look.type] : look.show;
  }
  function cardHTML(look, index) {
    var saved = saveRate(look);
    var inCloset = closet.indexOf(look.id) > -1;
    var cur = price(look);
    var sale = look.item.salePrice && look.item.salePrice < look.item.price;
    var moodNames = (look.mood || []).map(function (m) { return MOOD_LABEL[m]; }).join(" · ");
    var href = "?look=" + encodeURIComponent(look.id);
    return '<article class="card" data-id="' + look.id + '" data-cat="' + look.category + '">' +
      '<a class="card-media" href="' + href + '" aria-label="' + esc(look.celeb + " " + look.headline + " 상세 보기") + '">' +
        '<span class="card-img" style="' + artStyle(look) + '">' + picture(look, index < 3) + "</span>" +
        '<span class="card-badge scene">' + esc(sceneLabel(look)) + "</span>" +
        (saved > 0 ? '<span class="card-badge save">대안 ' + saved + "%↓</span>" : "") +
        '<span class="card-cap"><b>' + esc(look.celeb) + "</b><i>" + esc(look.headline) + "</i></span>" +
      "</a>" +
      '<button type="button" class="heart" data-heart="' + look.id + '" aria-pressed="' + inCloset + '" aria-label="' + esc(look.celeb + " " + look.item.name + " 내 옷장에 담기") + '">' + (inCloset ? "♥" : "♡") + "</button>" +
      '<div class="card-body">' +
        '<p class="card-kicker"><span class="k-brand">' + esc(look.item.brandEn || look.item.brand) + '</span><span class="k-num">' + num2(index) + "</span></p>" +
        '<h3><a href="' + href + '">' + esc(look.item.name) + "</a></h3>" +
        (moodNames ? '<p class="card-meta">' + esc(moodNames) + "</p>" : "") +
        '<div class="price-block">' +
          '<span class="price-now">' + won(cur) + "</span>" +
          (sale ? '<span class="price-list">' + won(look.item.price) + "</span>" : "") +
        "</div>" +
        '<div class="alt-line"><span class="alt-label">대안 · ' + esc(look.alt.brand) + '</span>' +
          '<span class="alt-price">' + won(look.alt.price) + " <small>" + saved + "%↓</small></span></div>" +
      "</div>" +
    "</article>";
  }

  function renderGrid() {
    var grid = $("#look-grid");
    var list = sorted(LOOKS.filter(matches));
    $("#empty").hidden = list.length > 0;
    grid.innerHTML = list.map(function (l) { return cardHTML(l, LOOKS.indexOf(l)); }).join("");

    $("#count-label").textContent = list.length + "개의 룩";
    var parts = [];
    if (state.q) parts.push('"' + esc(state.q) + '" 검색');
    if (state.celeb) parts.push(esc(state.celeb));
    if (state.type) parts.push(TYPE_LABEL[state.type]);
    if (state.cat) parts.push(CAT_LABEL[state.cat]);
    if (state.mood) parts.push(MOOD_LABEL[state.mood] + " 무드");
    if (state.budget) parts.push("대안템 10만 원 이하");
    if (state.closet) parts.push("내 옷장");
    var sum = list.reduce(function (a, l) { return a + saveAmount(l); }, 0);
    $("#filter-summary").innerHTML = list.length
      ? (parts.length ? "<b>" + parts.join(" · ") + "</b> · " : "") + list.length + "개 룩 · 대안템으로 바꾸면 최대 <b>" + won(sum) + "</b> 절약"
      : (parts.length ? "<b>" + parts.join(" · ") + "</b> 조건에 맞는 룩이 없습니다." : "");
  }

  /* ---------------- chips state ---------------- */
  function paintChips() {
    $all(".chip").forEach(function (btn) {
      var key = btn.getAttribute("data-key");
      var val = btn.getAttribute("data-value");
      var on = false;
      if (key === "type") on = state.type === val;
      else if (key === "cat") on = state.cat === val;
      else if (key === "mood") on = state.mood === val;
      else if (key === "celeb") on = state.celeb === val;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function bindChips() {
    var chipsWrap = $("#filter-bar");
    chipsWrap.addEventListener("click", function (e) {
      var btn = e.target.closest(".chip");
      if (!btn) return;
      var key = btn.getAttribute("data-key");
      var val = btn.getAttribute("data-value");
      var prop = key === "cat" ? "cat" : key;
      state[prop] = state[prop] === val ? "" : val;
      paintChips();
      renderGrid();
      writeURL();
    });
  }

  /* ---------------- closet ---------------- */
  function toggleCloset(id) {
    var i = closet.indexOf(id);
    var added;
    if (i > -1) { closet.splice(i, 1); added = false; }
    else { closet.push(id); added = true; }
    writeCloset(closet);
    updateCloset();
    if (added) toast("내 옷장에 담았습니다");
    else toast("내 옷장에서 뺐습니다");
  }
  function updateCloset() {
    $("#closet-count").textContent = closet.length;
    $("#closet-count-2").textContent = closet.length;
    $("#closet-count-3").textContent = closet.length;
    $("#closet-empty").hidden = closet.length > 0;
    $("#closet-list").innerHTML = closet.map(function (id) {
      var l = findLook(id);
      if (!l) return "";
      return "<li><div class=\"cl-info\"><a href=\"?look=" + encodeURIComponent(id) + '" data-open="' + id + '">' +
        esc(l.celeb) + " · " + esc(l.item.name) + "</a><small>" + esc(l.item.brand) + " " + won(price(l)) +
        "</small></div><button type=\"button\" class=\"rm\" data-remove=\"" + id + "\">빼기</button></li>";
    }).join("");
    // hearts on cards
    $all(".heart").forEach(function (b) {
      var id = b.getAttribute("data-heart");
      var on = closet.indexOf(id) > -1;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.textContent = on ? "♥" : "♡";
    });
    var mc = $("#modal-closet");
    if (mc && mc.dataset.id) mc.innerHTML = closet.indexOf(mc.dataset.id) > -1 ? "♥ 내 옷장에서 빼기" : "♡ 내 옷장에 담기";
    if (state.closet) renderGrid();
  }
  function openClosetPanel(open) {
    var panel = $("#closet-panel");
    var trigger = $("#closet-trigger");
    panel.hidden = !open;
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
  }

  /* ---------------- toast ---------------- */
  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); t.textContent = ""; }, 2200);
  }

  /* ---------------- modal ---------------- */
  function openModal(id) {
    var look = findLook(id);
    if (!look) return;
    lastFocus = document.activeElement;
    var modal = $("#modal");
    modal.hidden = false;
    document.body.classList.add("modal-open");

    $("#modal-art").setAttribute("style", artStyle(look));
    $("#modal-art").innerHTML = picture(look, true) +
      '<span class="modal-art-shade" aria-hidden="true"></span>' +
      '<span class="modal-art-label" id="modal-art-label"></span>' +
      '<span class="modal-art-note">STYLE ILLUSTRATION</span>';
    $("#modal-art-label").textContent = look.celeb + " · " + look.headline;
    $("#modal-eyebrow").textContent = look.show + " · " + look.group;
    $("#modal-title").textContent = look.item.name;
    $("#modal-scene").textContent = look.scene;
    $("#modal-story").textContent = look.story;
    $("#modal-point").textContent = look.point;
    $("#modal-verified").textContent = "확인: " + look.verified + " · 가격 확인일 2026.11.20";

    var cur = price(look);
    var saved = saveAmount(look);
    var rate = saveRate(look);
    var saleRow = look.item.salePrice && look.item.salePrice < look.item.price
      ? '<small>정가 ' + won(look.item.price) + " · " + esc(look.item.saleNote) + "</small>" : "";
    $("#modal-compare").innerHTML =
      '<table class="cmp">' +
        '<caption class="sr-only">정품과 가성비 대안템 비교</caption>' +
        '<thead><tr><th scope="col">구분</th><th scope="col">정품</th><th scope="col">가성비 대안</th></tr></thead>' +
        '<tbody>' +
          '<tr><th scope="row">가격</th>' +
            '<td><b>' + won(cur) + "</b>" + saleRow + "</td>" +
            '<td class="is-alt"><b>' + won(look.alt.price) + "</b><small>" + rate + "% 저렴</small></td></tr>" +
          '<tr><th scope="row">브랜드</th>' +
            '<td>' + esc(look.item.brand) + ' <span class="cmp-en">' + esc(look.item.brandEn) + '</span></td>' +
            '<td class="is-alt">' + esc(look.alt.brand) + "</td></tr>" +
          '<tr><th scope="row">제품</th>' +
            '<td>' + esc(look.item.name) + "<small>품번 " + esc(look.item.sku) + "</small></td>" +
            '<td class="is-alt">' + esc(look.alt.name) + "</td></tr>" +
        '</tbody>' +
        '<tfoot><tr><td colspan="3"><span>대안템 선택 시</span> <b>' + won(saved) + ' 절약</b> <em>정품 대비 ' + rate + '%↓</em></td></tr></tfoot>' +
      "</table>";

    var specs = [
      ["브랜드", look.item.brand + " (" + look.item.brandEn + ")"],
      ["제품명", look.item.name],
      ["품번", look.item.sku],
      ["소재", look.item.material],
      ["컬러", look.item.colors],
      ["사이즈", look.item.sizes],
      ["제조", look.item.maker],
      ["시즌", look.item.season],
      ["정가", won(look.item.price) + (look.item.salePrice && look.item.salePrice < look.item.price ? " → " + won(look.item.salePrice) + " (" + look.item.saleNote + ")" : "")]
    ];
    $("#modal-spec").innerHTML = specs.map(function (row) {
      return "<dt>" + esc(row[0]) + "</dt><dd>" + esc(row[1]) + "</dd>";
    }).join("");

    var qOfficial = look.item.brand + " " + look.item.name;
    $("#modal-buy").innerHTML =
      '<a class="buy-btn" href="' + esc(look.item.officialUrl) + '" target="_blank" rel="noopener sponsored">공식몰 · 상품 페이지 ↗</a>' +
      '<a class="buy-btn sub" href="' + esc(CFG.buildLink("naver", qOfficial)) + '" target="_blank" rel="noopener sponsored">네이버 쇼핑 검색 ↗</a>' +
      '<a class="buy-btn sub" href="' + esc(CFG.buildLink("musinsa", look.item.brand + " " + look.item.name)) + '" target="_blank" rel="noopener sponsored">무신사 검색 ↗</a>';

    $("#modal-alt").innerHTML =
      '<p class="alt-name">' + esc(look.alt.brand) + " · " + esc(look.alt.name) + "</p>" +
      '<p class="alt-meta">' + esc(look.alt.note) + "</p>" +
      '<div class="alt-price-row"><b>' + won(look.alt.price) + "</b><span>정품 " + won(cur) + " 대비 " + rate + "% 저렴 · 확인일 2026.11.20</span></div>" +
      '<div class="buy-row">' +
        '<a class="buy-btn" href="' + esc(CFG.buildLink(look.alt.platform === "official" ? "naver" : look.alt.platform, look.alt.query)) + '" target="_blank" rel="noopener sponsored">' +
          (look.alt.platform === "official" ? "공식 판매처 검색 ↗" : look.alt.platform === "coupang" ? "쿠팡에서 보기 ↗" : look.alt.platform === "musinsa" ? "무신사에서 보기 ↗" : "11번가에서 보기 ↗") + "</a>" +
        '<a class="buy-btn sub" href="' + esc(CFG.buildLink("coupang", look.alt.query)) + '" target="_blank" rel="noopener sponsored">쿠팡 검색 ↗</a>' +
        '<a class="buy-btn sub" href="' + esc(CFG.buildLink("elevenst", look.alt.query)) + '" target="_blank" rel="noopener sponsored">11번가 검색 ↗</a>' +
      "</div>";

    $("#modal-sources").innerHTML = look.sources.map(function (s) {
      return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener nofollow">' + esc(s.label) + " ↗</a></li>";
    }).join("");

    var mc = $("#modal-closet");
    mc.dataset.id = look.id;
    mc.innerHTML = closet.indexOf(look.id) > -1 ? "♥ 내 옷장에서 빼기" : "♡ 내 옷장에 담기";

    var next = LOOKS.filter(function (l) { return l.id !== look.id; })
      .map(function (l) {
        var overlap = (l.mood || []).filter(function (m) { return (look.mood || []).indexOf(m) > -1; }).length;
        var same = l.celeb === look.celeb ? 1 : 0;
        var sameCat = l.category === look.category ? 1 : 0;
        return { l: l, score: overlap * 3 + same + sameCat };
      })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 3)
      .map(function (x) { return x.l; });

    $("#modal-next").innerHTML = next.map(function (l) {
      return '<a class="next-card" href="?look=' + encodeURIComponent(l.id) + '" data-open="' + l.id + '"><span>' + TYPE_LABEL[l.type] +
        (l.show !== TYPE_LABEL[l.type] ? " · " + esc(l.show) : "") +
        "</span><b>" + esc(l.celeb) + "</b><small>" + esc(l.headline) + "</small></a>";
    }).join("");

    $("#modal-close").focus();
    writeURL({ look: look.id });
  }

  function closeModal() {
    var modal = $("#modal");
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    var url = new URL(location.href);
    url.searchParams.delete("look");
    history.replaceState(null, "", url.pathname + (url.search ? url.search : "") + url.hash);
  }

  /* ---------------- quiz ---------------- */
  var QUIZ = [
    {
      q: "주말 외출, 손이 먼저 가는 옷은?",
      a: [
        { t: "무채색 니트 + 슬랙스", d: "색을 줄이고 선으로 말한다", s: { minimal: 2 } },
        { t: "포근한 가디건 + 미니", d: "부드러운 색과 질감이 좋다", s: { lovely: 2 } },
        { t: "체크 셔츠 + 생지 데님", d: "몇 번 입은 듯한 소재가 좋다", s: { vintage: 2 } },
        { t: "집업 + 와이드 팬츠", d: "움직이기 편해야 한다", s: { street: 2 } }
      ]
    },
    {
      q: "추운 날, 아우터를 고르는 기준은?",
      a: [
        { t: "실루엣이 무너지지 않는가", d: "허리선과 기장을 본다", s: { minimal: 2 } },
        { t: "입었을 때 포근한가", d: "안감과 촉감을 본다", s: { lovely: 2 } },
        { t: "소재와 컬러가 특별한가", d: "벨벳·가죽·야크 같은 결", s: { vintage: 2 } },
        { t: "하루 종일 움직여도 편한가", d: "무게와 활동성", s: { street: 2 } }
      ]
    },
    {
      q: "예산이 정해졌다면 어떻게 쓸까?",
      a: [
        { t: "오래 입을 한 벌에 집중", d: "10만 원대 대신 100만 원대도 고려", s: { minimal: 2 } },
        { t: "지금 기분이 좋아지는 한 벌", d: "트렌드와 디테일 우선", s: { lovely: 1, vintage: 1 } },
        { t: "가성비 좋은 두 벌", d: "조합을 바꿔 자주 입는다", s: { vintage: 2 } },
        { t: "대안템 + 포인트 아이템", d: "비슷한 무드를 낮은 가격으로", s: { street: 2 } }
      ]
    }
  ];
  var quizIndex = 0, quizAnswers = [], quizScore = { minimal: 0, lovely: 0, vintage: 0, street: 0 };
  function recomputeQuiz() {
    quizScore = { minimal: 0, lovely: 0, vintage: 0, street: 0 };
    quizAnswers.forEach(function (o) {
      Object.keys(o.s).forEach(function (k) { quizScore[k] += o.s[k]; });
    });
  }

  function quizHTML() {
    var el = $("#quiz");
    if (quizIndex < QUIZ.length) {
      var step = QUIZ[quizIndex];
      el.innerHTML =
        '<div class="quiz-top"><span class="quiz-step">Q' + (quizIndex + 1) + " / " + QUIZ.length + "</span>" +
        '<div class="quiz-dots" aria-hidden="true">' + QUIZ.map(function (_, i) { return '<i class="' + (i <= quizIndex ? "on" : "") + '"></i>'; }).join("") + "</div></div>" +
        "<h3>" + esc(step.q) + "</h3>" +
        '<div class="quiz-options">' + step.a.map(function (o, i) {
          return '<button type="button" class="quiz-opt" data-opt="' + i + '"><span class="key">' + "ABCD"[i] + "</span><span><b>" + esc(o.t) + "</b><small>" + esc(o.d) + "</small></span></button>";
        }).join("") + "</div>" +
        '<div class="quiz-nav">' + (quizIndex > 0 ? '<button type="button" class="quiz-back" data-back="1">← 이전 질문</button>' : "") + "</div>";
    } else {
      var best = "minimal", bestScore = -1;
      MOOD_ORDER.forEach(function (m) { if (quizScore[m] > bestScore) { bestScore = quizScore[m]; best = m; } });
      var res = MOOD_RESULT[best];
      try { localStorage.setItem(STORE.mood, best); } catch (e) {}
      el.innerHTML =
        '<div class="quiz-result">' +
          '<div class="result-head"><p class="eyebrow" style="margin:0">YOUR MOOD</p><span class="result-mood">' + res.name + "</span></div>" +
          '<p class="result-desc">' + res.desc + "</p>" +
          '<div class="result-looks">' + res.looks.map(function (id) {
            var l = findLook(id); if (!l) return "";
            return '<a class="result-look" href="?look=' + encodeURIComponent(id) + '" data-open="' + id + '"><span>' + TYPE_LABEL[l.type] +
              (l.show !== TYPE_LABEL[l.type] ? " · " + esc(l.show) : "") +
              "</span><b>" + esc(l.celeb) + "</b><small>" + esc(l.item.brand) + " · " + won(price(l)) + "</small></a>";
          }).join("") + "</div>" +
          '<div class="quiz-actions"><button type="button" class="btn" data-mood-filter="' + best + '">' + res.name + " 코디만 보기</button>" +
          '<button type="button" class="btn ghost" data-retest="1">다시 테스트</button></div>' +
        "</div>";
    }
  }
  function bindQuiz() {
    $("#quiz").addEventListener("click", function (e) {
      var opt = e.target.closest("[data-opt]");
      if (opt) {
        var o = QUIZ[quizIndex].a[+opt.getAttribute("data-opt")];
        quizAnswers[quizIndex] = o;
        quizIndex++;
        recomputeQuiz();
        quizHTML();
        return;
      }
      if (e.target.closest("[data-back]")) {
        quizIndex = Math.max(0, quizIndex - 1);
        quizAnswers = quizAnswers.slice(0, quizIndex);
        recomputeQuiz();
        quizHTML();
        return;
      }
      var mf = e.target.closest("[data-mood-filter]");
      if (mf) {
        state.mood = mf.getAttribute("data-mood-filter");
        state.q = ""; state.type = ""; state.cat = ""; state.celeb = "";
        $("#q").value = ""; $("#q-hero").value = "";
        paintChips(); renderGrid(); writeURL();
        document.getElementById("looks").scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (e.target.closest("[data-retest]")) {
        quizIndex = 0;
        quizAnswers = [];
        recomputeQuiz();
        quizHTML();
      }
    });
  }

  /* ---------------- stats & ads ---------------- */
  function initStats() {
    $("#stat-looks").textContent = LOOKS.length;
    var brands = {};
    LOOKS.forEach(function (l) { brands[l.item.brand] = 1; });
    $("#stat-brands").textContent = Object.keys(brands).length;
    var rates = LOOKS.map(saveRate);
    var avg = Math.round(rates.reduce(function (a, b) { return a + b; }, 0) / rates.length);
    $("#stat-save").textContent = avg + "%";
  }
  function initAds() {
    if (CFG.ads && CFG.ads.adsenseClient) {
      $("#ad-top").hidden = false;
      $("#ad-top-body").innerHTML = '<ins class="adsbygoogle" style="display:block" data-ad-client="' + esc(CFG.ads.adsenseClient) +
        '" data-ad-slot="' + esc(CFG.ads.slots.top || "") + '" data-ad-format="auto" data-full-width-responsive="true"></ins>';
      var s = document.createElement("script");
      s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(CFG.ads.adsenseClient);
      s.async = true; s.crossOrigin = "anonymous";
      document.head.appendChild(s);
    }
  }

  /* ---------------- events ---------------- */
  function updateMoreLabel(open) {
    var btn = $("#filter-more");
    if (!btn) return;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.innerHTML = (open ? "필터 접기" : "필터 더보기 · 장면·카테고리·무드·셀럽") + ' <span aria-hidden="true">' + (open ? "▴" : "▾") + "</span>";
  }
  function syncFilterMore() {
    var groups = $("#filter-groups");
    if (!groups) return;
    var active = !!(state.type || state.cat || state.mood || state.celeb);
    var open = groups.classList.contains("open") || active;
    groups.classList.toggle("open", open);
    updateMoreLabel(open);
  }
  function bind() {
    // search
    $("#q").addEventListener("input", function (e) {
      state.q = e.target.value.trim();
      renderGrid(); writeURL();
    });
    $("#clear-q").addEventListener("click", function () {
      $("#q").value = ""; state.q = ""; renderGrid(); writeURL(); $("#q").focus();
    });
    $("#hero-search").addEventListener("submit", function (e) {
      e.preventDefault();
      var v = $("#q-hero").value.trim();
      state.q = v; $("#q").value = v;
      renderGrid(); writeURL();
      document.getElementById("looks").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("#sort").addEventListener("change", function (e) {
      state.sort = e.target.value; renderGrid(); writeURL();
    });
    $("#budget-toggle").addEventListener("change", function (e) {
      state.budget = e.target.checked; renderGrid(); writeURL();
    });
    $("#closet-toggle").addEventListener("change", function (e) {
      state.closet = e.target.checked; renderGrid(); writeURL();
    });
    $("#reset-filters").addEventListener("click", resetFilters);
    $("#empty-reset").addEventListener("click", resetFilters);
    var moreBtn = $("#filter-more");
    if (moreBtn) moreBtn.addEventListener("click", function () {
      var open = $("#filter-groups").classList.toggle("open");
      updateMoreLabel(open);
    });

    // grid clicks
    $("#look-grid").addEventListener("click", function (e) {
      var heart = e.target.closest("[data-heart]");
      if (heart) { e.preventDefault(); toggleCloset(heart.getAttribute("data-heart")); return; }
      var card = e.target.closest(".card");
      if (card) { e.preventDefault(); openModal(card.getAttribute("data-id")); }
    });

    // closet dock
    $("#closet-trigger").addEventListener("click", function () {
      openClosetPanel($("#closet-panel").hidden);
    });
    $("#closet-teaser-btn").addEventListener("click", function () {
      openClosetPanel(true);
      $("#closet-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    $("#closet-close").addEventListener("click", function () { openClosetPanel(false); });
    $("#closet-panel").addEventListener("click", function (e) {
      var rm = e.target.closest("[data-remove]");
      if (rm) { toggleCloset(rm.getAttribute("data-remove")); return; }
      var open = e.target.closest("[data-open]");
      if (open) { e.preventDefault(); openModal(open.getAttribute("data-open")); openClosetPanel(false); }
    });
    $("#closet-view").addEventListener("click", function () {
      state.closet = true; $("#closet-toggle").checked = true;
      state.mood = ""; state.cat = ""; state.type = ""; state.celeb = "";
      paintChips(); renderGrid(); writeURL(); openClosetPanel(false);
      document.getElementById("looks").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("#closet-clear").addEventListener("click", function () {
      closet = []; writeCloset(closet); updateCloset(); renderGrid(); toast("옷장을 비웠습니다");
    });

    // modal
    $("#modal").addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) closeModal();
      if (e.target.closest("#modal-close")) closeModal();
      var nx = e.target.closest("[data-open]");
      if (nx) { e.preventDefault(); openModal(nx.getAttribute("data-open")); }
    });
    $("#modal-closet").addEventListener("click", function () {
      if (this.dataset.id) toggleCloset(this.dataset.id);
    });
    $("#modal-copy").addEventListener("click", function () {
      var url = location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { toast("링크를 복사했습니다"); },
          function () { toast("복사가 막혔습니다. 주소창의 링크를 복사해 주세요"); });
      } else toast("주소창의 링크를 복사해 주세요");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (!$("#modal").hidden) closeModal();
        else if (!$("#closet-panel").hidden) openClosetPanel(false);
      }
      // simple focus trap
      if (e.key === "Tab" && !$("#modal").hidden) {
        var f = $all('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])', $("#modal"))
          .filter(function (n) { return n.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.addEventListener("popstate", function () {
      readURL(); syncControls(); paintChips(); renderGrid();
      var p = new URLSearchParams(location.search);
      if (p.get("look")) openModal(p.get("look")); else closeModal();
    });
  }

  function resetFilters() {
    state = { q: "", type: "", cat: "", mood: "", celeb: "", budget: false, closet: false, sort: "recent" };
    syncControls(); paintChips(); renderGrid(); writeURL(); syncFilterMore();
  }
  function syncControls() {
    $("#q").value = state.q;
    $("#q-hero").value = state.q;
    $("#sort").value = state.sort;
    $("#budget-toggle").checked = state.budget;
    $("#closet-toggle").checked = state.closet;
  }

  /* ---------------- init ---------------- */
  function init() {
    buildChips($("#chips-type"), TYPE_ORDER, TYPE_LABEL, "type");
    buildChips($("#chips-cat"), CAT_ORDER, CAT_LABEL, "cat");
    buildChips($("#chips-mood"), MOOD_ORDER, MOOD_LABEL, "mood");
    var celebs = celebList();
    buildChips($("#chips-celeb"), celebs, celebs.reduce(function (o, c) { o[c] = c; return o; }, {}), "celeb");

    readURL();
    syncControls();
    paintChips();
    renderGrid();
    initStats();
    initAds();
    updateCloset();
    quizHTML();
    syncFilterMore();
    bindChips();
    bindQuiz();
    bind();

    var p = new URLSearchParams(location.search);
    if (p.get("look")) openModal(p.get("look"));
    if (p.get("test") === "1") {
      document.getElementById("mood-test").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
