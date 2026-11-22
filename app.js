/* =========================================================
   스타핏픽 — app.js
   필터 · 검색 · 내 옷장 · 무드 테스트 · 상세 모달
   ========================================================= */
(function () {
  "use strict";

  var CFG = window.SFP_CONFIG;
  var LOOKS = window.SFP_LOOKS || [];
  var MODELS = window.SFP_MODELS || [];

  /* ---------------- labels ---------------- */
  var TYPE_LABEL = { airport: "공항", variety: "예능", daily: "일상" };
  var CAT_LABEL = { outer: "아우터", top: "상의", bottom: "하의", dress: "원피스", shoes: "신발", acc: "잡화" };
  var MOOD_LABEL = { minimal: "미니멀", lovely: "러블리", vintage: "빈티지", street: "스트리트" };
  var TYPE_ORDER = ["airport", "variety", "daily"];
  var CAT_ORDER = ["outer", "top", "bottom", "dress", "shoes", "acc"];
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
  var RECENT_KEY = "sfp:recent:v1";
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
  var state = { q: "", type: "", cat: "", mood: "", celeb: "", brand: "", band: "", model: "", ids: [], budget: false, closet: false, discount: false, sort: "recent" };
  var lastFocus = null;

  function readURL() {
    var p = new URLSearchParams(location.search);
    state.q = (p.get("q") || "").trim();
    state.type = TYPE_ORDER.indexOf(p.get("type")) > -1 ? p.get("type") : "";
    state.cat = CAT_ORDER.indexOf(p.get("cat")) > -1 ? p.get("cat") : "";
    state.mood = MOOD_ORDER.indexOf(p.get("mood")) > -1 ? p.get("mood") : "";
    state.celeb = p.get("celeb") || "";
    state.model = MODELS.some(function (m) { return m.id === p.get("model"); }) ? p.get("model") : "";
    state.brand = p.get("brand") || "";
    state.band = ["u10", "10to30", "30to100", "o100"].indexOf(p.get("band")) > -1 ? p.get("band") : "";
    state.ids = (p.get("ids") || "").split(",").filter(Boolean);
    state.budget = p.get("budget") === "1";
    state.closet = p.get("closet") === "1";
    state.discount = p.get("discount") === "80";
    state.sort = ["recent", "save", "price-low", "price-high"].indexOf(p.get("sort")) > -1 ? p.get("sort") : "recent";
  }
  function writeURL(extra) {
    var p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    if (state.type) p.set("type", state.type);
    if (state.cat) p.set("cat", state.cat);
    if (state.mood) p.set("mood", state.mood);
    if (state.celeb) p.set("celeb", state.celeb);
    if (state.model) p.set("model", state.model);
    if (state.brand) p.set("brand", state.brand);
    if (state.band) p.set("band", state.band);
    if (state.ids && state.ids.length) p.set("ids", state.ids.join(","));
    if (state.budget) p.set("budget", "1");
    if (state.closet) p.set("closet", "1");
    if (state.discount) p.set("discount", "80");
    if (state.sort !== "recent") p.set("sort", state.sort);
    if (extra && extra.look) p.set("look", extra.look);
    var qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  }

  /* ---------------- photo credit helpers ---------------- */
  function modelOf(look) {
    if (!look || !look.modelId) return null;
    for (var i = 0; i < MODELS.length; i++) if (MODELS[i].id === look.modelId) return MODELS[i];
    return null;
  }
  function photoCredit(look) {
    if (look && look.model) return "가상인물 · AI 모델 " + look.model + " 착용 컷";
    var ph = look.photo || {};
    if (!ph.label) return "";
    return (ph.kind === "product" ? "제품 이미지 · " : "사진 · ") + ph.label;
  }
  function artStyle() { return "background:#f4f6f8"; }
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
  function buildCelebChips() {
    var el = $("#chips-celeb");
    if (!el) return;
    var counts = {};
    LOOKS.forEach(function (l) { counts[l.celeb] = (counts[l.celeb] || 0) + 1; });
    var all = celebList();
    var main = all.filter(function (c) { return counts[c] >= 2; });
    var rest = all.filter(function (c) { return counts[c] < 2; });
    function chip(c) {
      return '<button type="button" class="chip" data-key="celeb" data-value="' + esc(c) + '" aria-pressed="false">' + esc(c) + '<span class="num">' + counts[c] + "</span></button>";
    }
    el.innerHTML = main.map(chip).join("") +
      (rest.length ? '<button type="button" class="chip chip-more" id="celeb-more">+' + rest.length + "명 전체 보기</button>" : "");
    var more = $("#celeb-more");
    if (more) more.addEventListener("click", function () {
      el.innerHTML = all.map(chip).join("");
      paintChips();
    });
  }
  function celebList() {
    var seen = {}, out = [];
    LOOKS.forEach(function (l) { if (!seen[l.celeb]) { seen[l.celeb] = 1; out.push(l.celeb); } });
    return out;
  }

  /* ---------------- 80%↑ 초특가 필터 ---------------- */
  function heatCount() {
    return LOOKS.filter(function (l) { return saveRate(l) >= 80; }).length;
  }
  function paintHeat() {
    var btn = $("#heat-filter");
    if (!btn) return;
    btn.setAttribute("aria-pressed", state.discount ? "true" : "false");
    var n = $("#heat-count");
    if (n) n.textContent = heatCount();
  }
  function bindHeat() {
    var btn = $("#heat-filter");
    if (!btn) return;
    btn.addEventListener("click", function () {
      state.discount = !state.discount;
      paintHeat();
      renderGrid();
      writeURL();
      if (state.discount) {
        var t = $("#look-grid");
        if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  /* ---------------- 방금 본 착장 (localStorage sfp:recent:v1) ---------------- */
  function readRecent() {
    try {
      var raw = localStorage.getItem(RECENT_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter(function (x) { return x && x.id && findLook(x.id); }) : [];
    } catch (e) { return []; }
  }
  function writeRecent(arr) {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(arr)); } catch (e) {}
  }
  function recordRecent(look) {
    if (!look || !look.id) return;
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
    renderRecent();
  }
  function renderRecent() {
    var sec = $("#recent-sec"), strip = $("#recent-strip");
    if (!sec || !strip) return;
    var list = readRecent();
    if (list.length < 2) { sec.hidden = true; strip.innerHTML = ""; return; }
    strip.innerHTML = list.map(function (x) {
      var l = findLook(x.id);
      var img = l.imageJpg || l.image;
      return '<a class="recent-card" href="look-' + l.id + '.html">' +
        '<picture>' + (l.image ? '<source srcset="' + esc(l.image) + '" type="image/webp">' : "") +
        '<img src="' + esc(img) + '" alt="' + esc(l.celeb + " " + l.headline) + '" width="180" height="225" loading="lazy" decoding="async"></picture>' +
        '<b>' + esc(l.celeb) + '</b><small>' + esc(l.headline) + "</small></a>";
    }).join("");
    sec.hidden = false;
  }
  function bindRecent() {
    var clear = $("#recent-clear");
    if (!clear) return;
    clear.addEventListener("click", function () {
      writeRecent([]);
      renderRecent();
      toast("방금 본 착장 기록을 지웠습니다");
    });
  }

  /* ---------------- 검색 즉시 추천 (연관 검색 드롭다운) ---------------- */
  var SUGGEST_POOL = null;
  function suggestPool() {
    if (SUGGEST_POOL) return SUGGEST_POOL;
    var celebs = {}, brands = {}, out = [];
    LOOKS.forEach(function (l) {
      celebs[l.celeb] = (celebs[l.celeb] || 0) + 1;
      brands[l.item.brand] = (brands[l.item.brand] || 0) + 1;
    });
    LOOKS.forEach(function (l) {
      out.push({ label: l.celeb, meta: (l.group || l.show) + " · " + celebs[l.celeb] + "벌", type: "셀럽", value: l.celeb, act: "celeb", key: (l.celeb + " " + (l.group || "")).toLowerCase() });
    });
    Object.keys(brands).forEach(function (b) {
      out.push({ label: b, meta: brands[b] + "벌의 정품 브랜드", type: "브랜드", value: b, act: "brand", weight: brands[b], key: b.toLowerCase() });
    });
    LOOKS.forEach(function (l) {
      out.push({ label: l.item.name, meta: l.item.brand + " · " + won(price(l)), type: "아이템", value: l.item.name, act: "q", key: (l.item.name + " " + (l.item.nameEn || "") + " " + (l.item.brandEn || "") + " " + l.headline + " " + (l.show || "") + " " + CAT_LABEL[l.category] + " " + (l.mood || []).map(function (m) { return MOOD_LABEL[m]; }).join(" ")).toLowerCase() });
    });
    SUGGEST_POOL = out;
    return out;
  }
  function popularSuggest() {
    var pool = suggestPool();
    var picks = ["장원영", "김지원", "카리나"], seen = {}, out = [];
    pool.forEach(function (x) {
      if (x.act === "celeb" && picks.indexOf(x.label) > -1 && !seen[x.label]) { seen[x.label] = 1; out.push(x); }
    });
    var brands = pool.filter(function (x) { return x.act === "brand"; })
      .sort(function (a, b) { return b.weight - a.weight; });
    return out.concat(brands.slice(0, 3)).slice(0, 6);
  }
  function findSuggest(q) {
    var pool = suggestPool();
    var key = q.toLowerCase();
    if (!key) return popularSuggest();
    var scored = [];
    pool.forEach(function (x) {
      var i = x.key.indexOf(key);
      if (i === -1) return;
      var score = i === 0 || x.label.toLowerCase().indexOf(key) === 0 ? 0 : i;
      if (x.act === "celeb") score -= 0.5;
      scored.push({ x: x, s: score });
    });
    scored.sort(function (a, b) { return a.s - b.s; });
    var seen = {}, out = [];
    scored.forEach(function (r) {
      var k = r.x.type + r.x.label;
      if (seen[k]) return;
      seen[k] = 1;
      out.push(r.x);
    });
    return out.slice(0, 6);
  }
  function applySuggest(item, fromHero) {
    if (item.act === "celeb") { state.celeb = item.value; state.q = ""; }
    else if (item.act === "brand") { state.brand = item.value; state.q = ""; }
    else { state.q = item.value; state.celeb = ""; state.brand = ""; }
    syncControls(); paintChips(); paintQuick(); renderGrid(); writeURL(); syncFilterMore();
    if (fromHero) {
      var t = document.getElementById("looks");
      if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  function initSuggest() {
    if (!window.SFPSuggest) return;
    var q = $("#q"), qh = $("#q-hero");
    if (q) {
      window.SFPSuggest.attach(q, {
        items: findSuggest,
        heading: "연관 검색 · 바로 필터",
        label: "연관 검색 후보",
        onPick: function (item) { q.blur(); applySuggest(item, false); }
      });
    }
    if (qh) {
      window.SFPSuggest.attach(qh, {
        items: findSuggest,
        heading: "연관 검색 · 바로 필터",
        label: "연관 검색 후보",
        onPick: function (item) { qh.blur(); applySuggest(item, true); }
      });
    }
  }

  /* ---------------- filtering ---------------- */
  function matches(look) {
    if (state.type && look.type !== state.type) return false;
    if (state.cat && look.category !== state.cat) return false;
    if (state.mood && (look.mood || []).indexOf(state.mood) === -1) return false;
    if (state.celeb && look.celeb !== state.celeb) return false;
    if (state.model && look.modelId !== state.model) return false;
    if (state.brand && look.item.brand !== state.brand) return false;
    if (state.band) {
      var pv = price(look);
      if (state.band === "u10" && pv > 100000) return false;
      if (state.band === "10to30" && (pv <= 100000 || pv > 300000)) return false;
      if (state.band === "30to100" && (pv <= 300000 || pv > 1000000)) return false;
      if (state.band === "o100" && pv <= 1000000) return false;
    }
    if (state.ids && state.ids.length && state.ids.indexOf(look.id) === -1) return false;
    if (state.budget && look.alt.price > BUDGET_CAP) return false;
    if (state.discount && saveRate(look) < 80) return false;
    if (state.closet && closet.indexOf(look.id) === -1) return false;
    if (state.q) {
      var hay = [
        look.celeb, look.group, look.show, look.scene, look.headline,
        look.item.brand, look.item.brandEn, look.item.name, look.item.nameEn, look.item.sku,
        look.alt.brand, look.alt.name,
        (look.mood || []).map(function (m) { return MOOD_LABEL[m]; }).join(" "),
        CAT_LABEL[look.category], TYPE_LABEL[look.type], look.model || ""
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
    var ph = look.photo || {};
    return '<article class="card" data-id="' + look.id + '" data-cat="' + look.category + '">' +
      '<a class="card-media" href="' + href + '" aria-label="' + esc(look.celeb + " " + look.headline + " 상세 보기") + '">' +
        '<span class="card-img">' + picture(look, index < 4) + "</span>" +
        '<span class="card-scrim" aria-hidden="true"></span>' +
        '<span class="card-badge scene">' + esc(sceneLabel(look)) + "</span>" +
        (saved > 0 ? '<span class="card-badge save">대안 ' + saved + "%↓</span>" : "") +
        '<span class="card-cap">' +
          '<span class="card-credit">' + esc(photoCredit(look)) + "</span>" +
          "<b>" + esc(look.celeb) + "</b><i>" + esc(look.headline) + "</i>" +
        "</span>" +
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
    if (state.model) {
      var mm = MODELS.filter(function (m) { return m.id === state.model; })[0];
      parts.push("AI 모델 " + esc(mm ? mm.name : state.model));
    }
    if (state.brand) parts.push(esc(state.brand));
    if (state.band) {
      parts.push({ u10: "정품 10만 원 이하", "10to30": "정품 10~30만 원", "30to100": "정품 30~100만 원", o100: "정품 100만 원 이상" }[state.band]);
    }
    if (state.type) parts.push(TYPE_LABEL[state.type]);
    if (state.cat) parts.push(CAT_LABEL[state.cat]);
    if (state.mood) parts.push(MOOD_LABEL[state.mood] + " 무드");
    if (state.budget) parts.push("대안템 10만 원 이하");
    if (state.discount) parts.push("80%↑ 초특가 대안");
    if (state.closet) parts.push("내 옷장");
    if (state.ids && state.ids.length) {
      var at = activeTag();
      parts.push(at ? at.label : state.ids.length + "벌 선택");
    }
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
      else if (key === "model") on = state.model === val;
      else if (key === "brand") on = state.brand === val;
      else if (key === "band") on = state.band === val;
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
      if (prop === "brand" || prop === "band") paintQuick();
      paintChips();
      renderGrid();
      writeURL();
      highlightModelCards();
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
    updateClosetCalc();
  }
  function openClosetPanel(open) {
    var panel = $("#closet-panel");
    var trigger = $("#closet-trigger");
    panel.hidden = !open;
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    updateClosetCalc();
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
    recordRecent(look);
    lastFocus = document.activeElement;
    var modal = $("#modal");
    modal.hidden = false;
    document.body.classList.add("modal-open");

    var ph = look.photo || {};
    $("#modal-art").setAttribute("style", artStyle());
    $("#modal-art").innerHTML = picture(look, true) +
      '<span class="modal-art-shade" aria-hidden="true"></span>' +
      '<div class="modal-art-meta">' +
      '<span class="modal-art-label" id="modal-art-label"></span>' +
      '<span class="modal-art-note">' + esc("가상인물 · 스타핏픽 전속 AI 모델 " + (look.model || "") + " 착용 연출 컷" + (ph.label ? " · 원본 착장 확인: " + ph.label + (ph.what ? " " + ph.what : "") : "")) + "</span>" +
      (ph.url ? '<a class="modal-art-src" href="' + esc(ph.url) + '" target="_blank" rel="noopener nofollow">원본 착장 출처 열기 ↗</a>' : "") +
      '</div>';
    $("#modal-art-label").textContent = look.celeb + " · " + look.headline;
    // 다른 착장으로 넘어올 때 본문/시트 스크롤을 맨 위로
    var mbody = document.querySelector("#modal .modal-body");
    if (mbody) mbody.scrollTop = 0;
    var mcard = document.querySelector("#modal .modal-card");
    if (mcard) mcard.scrollTop = 0;
    $("#modal-eyebrow").textContent = look.show + " · " + look.group;
    $("#modal-title").textContent = look.item.name;
    $("#modal-scene").textContent = look.scene;
    $("#modal-story").textContent = look.story;
    var mpost = $("#modal-post");
    if (mpost) mpost.href = "look-" + look.id + ".html";
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
          '<tr><th scope="row">핏</th>' +
            '<td>' + esc(look.item.fit || "—") + "</td>" +
            '<td class="is-alt">' + esc(look.alt.fit || "—") + "</td></tr>" +
          '<tr><th scope="row">아쉬운 점</th>' +
            '<td>' + esc(look.item.cons || "—") + "</td>" +
            '<td class="is-alt">' + esc(look.alt.cons || "—") + "</td></tr>" +
        '</tbody>' +
        '<tfoot><tr><td colspan="3"><div class="save-row"><span>대안템 선택 시</span> <b>' + won(saved) + ' 절약</b> <em>정품 대비 ' + rate + '%↓</em></div></td></tr></tfoot>' +
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
    // 네이버 쇼핑커넥트(브랜드커넥트)에서 실제 발급받은 고유 링크가 있는 검색어만 제휴 버튼으로 노출합니다.
    var nvItem = CFG.naverPick(qOfficial);
    var nvAlt = CFG.naverPick(look.alt.query);
    // 수익 버튼(네이버 쇼핑커넥트·쿠팡)은 큰 CTA, 공식 페이지는 중간, 단순 검색은 작은 칩
    $("#modal-buy").innerHTML =
      (nvItem ? '<a class="buy-btn cta cta-naver" href="' + esc(nvItem.u) + '" target="_blank" rel="noopener sponsored" title="' + esc(nvItem.p || "네이버 쇼핑커넥트 상품") + '">네이버 쇼핑커넥트 ↗</a>' : '') +
      '<a class="buy-btn cta cta-coupang' + (nvItem ? '' : ' wide') + '" href="' + esc(CFG.buildLink("coupang", qOfficial)) + '" target="_blank" rel="noopener sponsored">쿠팡에서 비슷한 스타일 보기 ↗</a>' +
      '<a class="buy-btn mid" href="' + esc(look.item.officialUrl) + '" target="_blank" rel="noopener sponsored">공식몰 · 상품 페이지 ↗</a>' +
      (nvItem ? '' : '<a class="buy-btn chip" href="' + esc(CFG.buildLink("naver", qOfficial)) + '" target="_blank" rel="noopener sponsored">네이버 쇼핑 검색 ↗</a>') +
      '<a class="buy-btn chip" href="' + esc(CFG.buildLink("musinsa", look.item.brand + " " + look.item.name)) + '" target="_blank" rel="noopener sponsored">무신사 검색 ↗</a>';

    $("#modal-alt").innerHTML =
      '<p class="alt-name">' + esc(look.alt.brand) + " · " + esc(look.alt.name) + "</p>" +
      '<p class="alt-meta">' + esc(look.alt.note) + "</p>" +
      '<div class="alt-price-row"><b>' + won(look.alt.price) + "</b><span>정품 " + won(cur) + " 대비 " + rate + "% 저렴 · 확인일 2026.11.20</span></div>" +
      '<div class="buy-row">' +
        (nvAlt ? '<a class="buy-btn cta cta-naver" href="' + esc(nvAlt.u) + '" target="_blank" rel="noopener sponsored" title="' + esc(nvAlt.p || "네이버 쇼핑커넥트 상품") + '">네이버 쇼핑커넥트 ↗</a>' : '') +
        '<a class="buy-btn cta cta-coupang' + (nvAlt ? '' : ' wide') + '" href="' + esc(CFG.buildLink("coupang", look.alt.query)) + '" target="_blank" rel="noopener sponsored">쿠팡에서 비슷한 스타일 보기 ↗</a>' +
        ((look.alt.platform === "coupang" || (nvAlt && look.alt.platform === "official")) ? "" :
          '<a class="buy-btn mid" href="' + esc(CFG.buildLink(look.alt.platform === "official" ? "naver" : look.alt.platform, look.alt.query)) + '" target="_blank" rel="noopener sponsored">' +
          (look.alt.platform === "official" ? (nvAlt ? "네이버 쇼핑커넥트 ↗" : "공식 판매처 검색 ↗") : look.alt.platform === "musinsa" ? "무신사에서 보기 ↗" : "11번가에서 보기 ↗") + "</a>") +
        '<a class="buy-btn chip" href="' + esc(CFG.buildLink("elevenst", look.alt.query)) + '" target="_blank" rel="noopener sponsored">11번가 검색 ↗</a>' +
      '</div>' +
      '<p class="aff-note" style="font-size:11px;line-height:1.5;color:#8b8b8b;margin:8px 0 0">가상인물 포함 · 이 게시물은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다. 네이버 쇼핑커넥트 활동의 일환으로, 판매 발생 시 수수료를 제공받습니다. ' +
        (nvAlt ? "네이버 쇼핑커넥트 버튼은 같은 무드의 네이버 판매 상품으로 연결됩니다." : "") + '</p>';

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
    if (!(CFG.ads && CFG.ads.adsenseClient)) return;
    var slots = [{ id: "ad-top", body: "#ad-top-body", slot: CFG.ads.slots.top }, { id: "ad-mid", body: "#ad-mid-body", slot: CFG.ads.slots.mid }];
    slots.forEach(function (s) {
      var box = $("#" + s.id), body = $(s.body);
      if (!box || !body) return;
      box.hidden = false;
      body.innerHTML = '<ins class="adsbygoogle" style="display:block" data-ad-client="' + esc(CFG.ads.adsenseClient) +
        '" data-ad-slot="' + esc(s.slot || "") + '" data-ad-format="auto" data-full-width-responsive="true"></ins>';
    });
    var script = document.createElement("script");
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(CFG.ads.adsenseClient);
    script.async = true; script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }

  /* ---------------- 인기 검색 태그 빠른 필터 ---------------- */
  var IDOL_GROUPS = ["IVE", "aespa", "(여자)아이들", "르세라핌", "KiiiKiii", "Hearts2Hearts", "MEOVV", "BLACKPINK", "소녀시대"];
  var MALE_CELEBS = ["우영", "유연석", "신승호", "양세찬", "하하", "유재석", "육성재", "송강"];
  function idsWhere(fn) {
    return LOOKS.filter(fn).map(function (l) { return l.id; });
  }
  var HOT_TAGS = [
    { id: "airport", label: "#공항패션", patch: function () { return { type: "airport" }; } },
    { id: "budget", label: "#10만원이하대안", patch: function () { return { budget: true }; } },
    { id: "winter", label: "#가을겨울아우터", patch: function () { return { cat: "outer" }; } },
    { id: "idol", label: "#여자아이돌", patch: function () { return { ids: idsWhere(function (l) { return IDOL_GROUPS.indexOf(l.group) > -1; }) }; } },
    { id: "male", label: "#남자캐주얼", patch: function () { return { ids: idsWhere(function (l) { return MALE_CELEBS.indexOf(l.celeb) > -1; }) }; } }
  ];
  function findTag(id) {
    for (var i = 0; i < HOT_TAGS.length; i++) if (HOT_TAGS[i].id === id) return HOT_TAGS[i];
    return null;
  }
  function tagIsActive(t) {
    var p = t.patch(), keys = Object.keys(p);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i], v = p[k];
      if (k === "budget") { if (state.budget !== v) return false; }
      else if (k === "ids") { if ((state.ids || []).join(",") !== v.join(",")) return false; }
      else if ((state[k] || "") !== v) return false;
    }
    return true;
  }
  function activeTag() {
    for (var i = 0; i < HOT_TAGS.length; i++) if (tagIsActive(HOT_TAGS[i])) return HOT_TAGS[i];
    return null;
  }
  function paintHotTags() {
    $all(".hot-tag").forEach(function (b) {
      var t = findTag(b.getAttribute("data-tag"));
      var on = !!(t && tagIsActive(t));
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.classList.toggle("on", on);
    });
  }
  function applyTag(id) {
    var t = findTag(id);
    if (!t) return;
    var wasOn = tagIsActive(t);
    resetFilters();
    if (wasOn) return;
    var patch = t.patch();
    Object.keys(patch).forEach(function (k) { state[k] = patch[k]; });
    syncControls(); paintChips(); paintHotTags(); renderGrid(); writeURL(); syncFilterMore();
    var target = document.getElementById("looks");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function initTags() {
    var box = $("#hot-tags");
    if (!box) return;
    box.addEventListener("click", function (e) {
      var b = e.target.closest(".hot-tag");
      if (b) applyTag(b.getAttribute("data-tag"));
    });
    paintHotTags();
  }

  /* ---------------- 이번 주 에디터스 픽 ---------------- */
  function trendScore(l) {
    var recency = Math.max(0, 30 - LOOKS.indexOf(l));
    var save = Math.round(saveRate(l) * 0.7);
    var budget = l.alt.price <= BUDGET_CAP ? 10 : 0;
    return recency + save + budget;
  }
  function pickList() {
    var arr = LOOKS.slice().sort(function (a, b) { return trendScore(b) - trendScore(a); });
    var out = [], cats = {}, celebs = {};
    arr.forEach(function (l) {
      if (out.length < 3 && !cats[l.category] && !celebs[l.celeb]) { out.push(l); cats[l.category] = 1; celebs[l.celeb] = 1; }
    });
    arr.forEach(function (l) {
      if (out.length < 3 && !celebs[l.celeb] && out.indexOf(l) === -1) { out.push(l); celebs[l.celeb] = 1; }
    });
    arr.forEach(function (l) { if (out.length < 3 && out.indexOf(l) === -1) out.push(l); });
    return out;
  }
  function pickWhy(l) {
    return l.alt.brand + " " + l.alt.name + "로 바꾸면 " + won(saveAmount(l)) + " 아낍니다. " +
      (l.alt.price <= BUDGET_CAP ? "대안가 10만 원 이하." : "대안가 " + won(l.alt.price) + ".");
  }
  function pickCardHTML(l, i) {
    var href = "?look=" + encodeURIComponent(l.id);
    var save = saveRate(l);
    return '<article class="pick-card">' +
      '<a class="pick-media" href="' + href + '" data-open="' + l.id + '" aria-label="' + esc(l.celeb + " " + l.headline + " 상세 보기") + '">' +
        picture(l, i === 0) +
        '<span class="pick-rank">0' + (i + 1) + '</span>' +
        '<span class="pick-scene">' + esc(sceneLabel(l)) + '</span>' +
        '<span class="pick-save">대안 ' + save + '%↓</span>' +
      '</a>' +
      '<div class="pick-body">' +
        '<p class="pick-kicker">EDITOR&rsquo;S PICK · ' + esc(l.group || l.show) + '</p>' +
        '<h3><a href="' + href + '" data-open="' + l.id + '">' + esc(l.celeb) + ' · ' + esc(l.headline) + '</a></h3>' +
        '<p class="pick-brand">' + esc(l.item.brand) + ' ' + esc(l.item.name) + '</p>' +
        '<div class="pick-prices"><span>정품 <b>' + won(price(l)) + '</b></span><span class="pick-alt">대안 <b>' + won(l.alt.price) + '</b></span></div>' +
        '<p class="pick-why">' + esc(pickWhy(l)) + '</p>' +
        '<div class="pick-actions">' +
          '<button type="button" class="btn small" data-open="' + l.id + '">착장 상세</button>' +
          '<a class="btn ghost small" href="' + esc(altUrlOf(l)) + '" target="_blank" rel="noopener sponsored">대안 보기</a>' +
        '</div>' +
      '</div>' +
    '</article>';
  }
  function initPicks() {
    var grid = $("#picks-grid");
    if (!grid) return;
    var list = pickList();
    grid.innerHTML = list.map(pickCardHTML).join("");
    var count = $("#picks-count");
    if (count) count.textContent = "TOP " + list.length;
    grid.addEventListener("click", function (e) {
      var opener = e.target.closest("[data-open]");
      if (opener) { e.preventDefault(); openModal(opener.getAttribute("data-open")); }
    });
  }

  /* ---------------- 10초 핏 추천기 ---------------- */
  var FIT_STORE = "sfp:fit:v1";
  var FIT_HEIGHT = [
    { v: "h1", t: "155~160cm", d: "작은 키", len: ["골반 위", "허벅지 중간", "무릎 아래 5cm"], cm: ["52~58cm", "68~76cm", "98~105cm"], prefer: ["short"],
      tip: "기장을 줄이기보다 허리선을 보여 주는 편이 효과적입니다. 크롭 이너나 벨트로 비율을 잡으세요." },
    { v: "h2", t: "160~168cm", d: "보통 키", len: ["골반", "허벅지 중간~아래", "무릎 아래 10cm"], cm: ["56~62cm", "72~80cm", "102~110cm"], prefer: ["short", "long"],
      tip: "숏패딩은 골반, 코트는 무릎 아래 10cm에서 끝나면 가장 안정적입니다." },
    { v: "h3", t: "168~175cm", d: "큰 키", len: ["골반~엉덩이", "무릎 위 10cm", "종아리 중간"], cm: ["60~66cm", "76~84cm", "106~114cm"], prefer: ["long"],
      tip: "미드 다운은 무릎 위 10cm에서 끊고, 롱코트는 종아리 중간이 균형점입니다." },
    { v: "h4", t: "175cm 이상", d: "아주 큰 키", len: ["엉덩이 중간", "무릎 위", "발목 위"], cm: ["64~70cm", "80~88cm", "110~118cm"], prefer: ["long"],
      tip: "롱코트는 발목 위, 숏패딩은 엉덩이 중간이 비율을 살립니다. 소매가 짧으면 가장 먼저 티가 납니다." }
  ];
  var FIT_BODY = [
    { v: "b1", t: "상체가 발달", d: "어깨·가슴", tag: "상체 보완",
      tip: "넥라인이 열린 카라·브이넥, 세트인 소매가 깔끔합니다. 목이 높은 니트보다 라운드 넥이 얼굴을 살립니다.",
      fit: function (l) { return l.category === "outer" || /카라|셔츠|집업|베스트|자켓|재킷/.test(l.item.name); } },
    { v: "b2", t: "하체가 발달", d: "힙·허벅지", tag: "하체 보완",
      tip: "상의는 엉덩이 중간에서 끝나게, 하의는 일자로 떨어지는 핏. 와이드 팬츠에는 짧은 상의를 맞춥니다.",
      fit: function (l) { return /미드|롱|코트|다운/.test(l.item.name + l.headline) || l.category === "bottom"; } },
    { v: "b3", t: "마른 편", d: "볼륨 보완", tag: "볼륨 보완",
      tip: "헤어리 니트·퀼팅·퍼처럼 볼륨이 있는 소재. 기장은 짧게, 상의에 볼륨을 주고 하의는 일자로.",
      fit: function (l) { return /퍼|플리스|앤고라|야크|퀼팅|무스탕|카디건|후디/.test(l.item.name); } },
    { v: "b0", t: "해당 없음", d: "고민 없음",
      tip: "기장만 맞추면 무난합니다. 상·하의 색을 두 가지로 줄이면 어떤 착장도 정리돼 보입니다.",
      fit: function () { return true; } }
  ];
  var FIT_MOOD = [
    { v: "minimal", t: "미니멀", d: "무채색·선", moodKey: "minimal", tip: "무채색 두 색에 실루엣으로 말하기. 포인트는 한 곳만 남깁니다." },
    { v: "lovely", t: "러블리", d: "포근한 질감", moodKey: "lovely", tip: "포근한 질감 한 아이템과 부드러운 색. 파스텔은 한 곳에만 쓰면 성숙하게 정리됩니다." },
    { v: "vintage", t: "빈티지", d: "체크·워싱", moodKey: "vintage", tip: "체크·워싱·야크 같은 결을 고르세요. 새것보다 몇 번 입은 질감이 잘 맞습니다." },
    { v: "street", t: "스트리트", d: "볼륨·활동성", moodKey: "street", tip: "볼륨 있는 실루엣에 쿠셔닝 좋은 신발. 색은 두 가지 안에서만 씁니다." }
  ];
  var FIT_BUDGET = [
    { v: "b10", t: "10만 원 이하", d: "대안템 기준", fit: function (l) { return l.alt.price <= BUDGET_CAP; } },
    { v: "b30", t: "30만 원 이하", d: "정품 판매가", fit: function (l) { return price(l) <= 300000; } },
    { v: "bany", t: "상관없음", d: "정품·대안 모두", fit: function () { return true; } }
  ];
  var fitPick = { height: "", body: "", mood: "", budget: "" };
  function fitOpt(list, v) {
    for (var i = 0; i < list.length; i++) if (list[i].v === v) return list[i];
    return null;
  }
  function outerLength(l) {
    var n = l.item.name + " " + l.headline;
    if (/미드|롱|코트|다운/.test(n)) return "long";
    if (/숏|크롭|퍼|플리스|무스탕|블루종|바이커|패딩|자켓|재킷|집업|카디건|후디/.test(n)) return "short";
    return null;
  }
  function fitScore(l) {
    var h = fitOpt(FIT_HEIGHT, fitPick.height), b = fitOpt(FIT_BODY, fitPick.body),
      m = fitOpt(FIT_MOOD, fitPick.mood), bu = fitOpt(FIT_BUDGET, fitPick.budget);
    var score = 26, hits = [];
    if (h) {
      var len = outerLength(l);
      if (!len) { score += 8; }
      else if (h.prefer.indexOf(len) > -1) { score += 20; hits.push("기장 적합"); }
      else { score += 2; }
    }
    if (b && b.fit(l)) { score += 10; if (b.tag) hits.push(b.tag); }
    if (m && (l.mood || []).indexOf(m.moodKey) > -1) { score += 22; hits.push(m.t); }
    if (bu && bu.fit(l)) { score += 18; hits.push(bu.t); }
    return { score: score, hits: hits };
  }
  function paintFit() {
    $all("[data-fit]").forEach(function (b) {
      var key = b.getAttribute("data-fit");
      b.setAttribute("aria-pressed", fitPick[key] === b.getAttribute("data-val") ? "true" : "false");
    });
    var n = 0;
    ["height", "body", "mood", "budget"].forEach(function (k) { if (fitPick[k]) n++; });
    var c = $("#fit-count");
    if (c) c.textContent = n + " / 4 선택";
  }
  function fitCardHTML(x, i) {
    var l = x.l;
    var inCloset = closet.indexOf(l.id) > -1;
    return '<article class="fit-look">' +
      '<button type="button" class="fit-look-media" data-open="' + l.id + '" aria-label="' + esc(l.celeb + " " + l.item.name + " 상세 보기") + '">' +
        picture(l, i === 0) +
        '<span class="fit-look-rank">TOP ' + (i + 1) + '</span>' +
      '</button>' +
      '<div class="fit-look-body">' +
        '<h4>' + esc(l.celeb) + ' · ' + esc(l.headline) + '</h4>' +
        '<p class="fit-look-brand">' + esc(l.item.brand) + ' ' + esc(l.item.name) + '</p>' +
        (x.hits.length ? '<div class="fit-look-reasons">' + x.hits.map(function (h) { return "<span>" + esc(h) + "</span>"; }).join("") + '</div>' : "") +
        '<div class="fit-look-prices"><b>정품 ' + won(price(l)) + '</b><small>대안 ' + won(l.alt.price) + ' · ' + saveRate(l) + '%↓</small></div>' +
        '<div class="fit-look-actions">' +
          '<button type="button" class="btn ghost small" data-open="' + l.id + '">상세</button>' +
          '<a class="btn ghost small" href="' + esc(altUrlOf(l)) + '" target="_blank" rel="noopener sponsored">대안 보기</a>' +
          '<button type="button" class="btn ghost small fit-heart" data-fit-heart="' + l.id + '" aria-pressed="' + inCloset + '" aria-label="' + esc(l.item.name + " 내 옷장에 담기") + '">' + (inCloset ? "♥" : "♡") + '</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }
  function renderFit() {
    var res = $("#fit-result");
    if (!res) return;
    var n = 0;
    ["height", "body", "mood", "budget"].forEach(function (k) { if (fitPick[k]) n++; });
    if (n < 4) {
      res.innerHTML = '<p class="fit-empty">' + (n ? (4 - n) + "가지만 더 고르면 기장 가이드와 추천 3벌이 나옵니다." : "네 가지를 고르면 기장 가이드와 추천 3벌이 여기에 나타납니다.") + "</p>";
      return;
    }
    var h = fitOpt(FIT_HEIGHT, fitPick.height), b = fitOpt(FIT_BODY, fitPick.body),
      m = fitOpt(FIT_MOOD, fitPick.mood), bu = fitOpt(FIT_BUDGET, fitPick.budget);
    var scored = LOOKS.map(function (l) { var s = fitScore(l); return { l: l, score: s.score, hits: s.hits }; });
    scored.sort(function (a, c) {
      if (c.score !== a.score) return c.score - a.score;
      return saveRate(c.l) - saveRate(a.l);
    });
    var picked = [], used = {};
    scored.forEach(function (x) { if (picked.length < 3 && !used[x.l.celeb]) { used[x.l.celeb] = 1; picked.push(x); } });
    scored.forEach(function (x) { if (picked.length < 3 && picked.indexOf(x) === -1) picked.push(x); });

    res.innerHTML =
      '<div class="fit-out">' +
        '<div class="fit-panel">' +
          '<p class="fit-panel-kicker">ON-BODY LENGTH</p>' +
          '<h3>' + esc(h.t) + ' 아우터 기장 가이드</h3>' +
          '<ul class="fit-len">' +
            '<li><span class="fit-len-name">숏패딩 · 크롭 재킷</span><b>' + esc(h.len[0]) + '</b><i>' + esc(h.cm[0]) + '</i></li>' +
            '<li><span class="fit-len-name">미드 다운 · 하프 코트</span><b>' + esc(h.len[1]) + '</b><i>' + esc(h.cm[1]) + '</i></li>' +
            '<li><span class="fit-len-name">롱코트 · 롱패딩</span><b>' + esc(h.len[2]) + '</b><i>' + esc(h.cm[2]) + '</i></li>' +
          '</ul>' +
          '<p class="fit-len-note">기준점은 골반뼈 · 무릎 위 10cm · 발목뼈 위 5cm입니다. 총장(cm)은 브랜드·사이즈에 따라 다르므로 실측표를 함께 보세요.</p>' +
          '<div class="fit-tips">' +
            '<p><b>' + esc(b.t) + '</b> ' + esc(b.tip) + '</p>' +
            '<p><b>키</b> ' + esc(h.tip) + '</p>' +
            '<p><b>' + esc(m.t) + ' 무드</b> ' + esc(m.tip) + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="fit-picks">' +
          '<div class="fit-picks-head"><h3>' + esc(h.t) + ' · ' + esc(m.t) + ' · ' + esc(bu.t) + ' 기준 3벌</h3><p>적합도 순 · 사진 출처와 가격은 상세에서</p></div>' +
          '<div class="fit-cards">' + picked.map(fitCardHTML).join("") + '</div>' +
          '<div class="fit-picks-actions">' +
            '<button type="button" class="btn small" data-fit-add="' + picked.map(function (x) { return x.l.id; }).join(",") + '">3벌 모두 옷장에 담기</button>' +
            '<button type="button" class="btn ghost small" data-open="' + picked[0].l.id + '">1순위 상세 보기</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }
  function saveFit() {
    try { localStorage.setItem(FIT_STORE, JSON.stringify(fitPick)); } catch (e) {}
  }
  function readFit() {
    try {
      var o = JSON.parse(localStorage.getItem(FIT_STORE) || "null");
      if (!o) return;
      if (fitOpt(FIT_HEIGHT, o.height)) fitPick.height = o.height;
      if (fitOpt(FIT_BODY, o.body)) fitPick.body = o.body;
      if (fitOpt(FIT_MOOD, o.mood)) fitPick.mood = o.mood;
      if (fitOpt(FIT_BUDGET, o.budget)) fitPick.budget = o.budget;
    } catch (e) {}
  }
  function initFit() {
    var groups = [
      { key: "height", el: "#fit-height", list: FIT_HEIGHT },
      { key: "body", el: "#fit-body", list: FIT_BODY },
      { key: "mood", el: "#fit-mood", list: FIT_MOOD },
      { key: "budget", el: "#fit-budget", list: FIT_BUDGET }
    ];
    var any = false;
    groups.forEach(function (g) {
      var el = $(g.el);
      if (!el) return;
      any = true;
      el.innerHTML = g.list.map(function (o) {
        return '<button type="button" class="fit-opt" data-fit="' + g.key + '" data-val="' + o.v + '" aria-pressed="false">' +
          '<b>' + esc(o.t) + '</b><small>' + esc(o.d) + '</small></button>';
      }).join("");
      el.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-fit]");
        if (!btn) return;
        var key = btn.getAttribute("data-fit"), val = btn.getAttribute("data-val");
        fitPick[key] = fitPick[key] === val ? "" : val;
        paintFit(); renderFit(); saveFit();
      });
    });
    if (!any) return;
    var reset = $("#fit-reset");
    if (reset) reset.addEventListener("click", function () {
      fitPick = { height: "", body: "", mood: "", budget: "" };
      paintFit(); renderFit(); saveFit();
    });
    var res = $("#fit-result");
    if (res) res.addEventListener("click", function (e) {
      var heart = e.target.closest("[data-fit-heart]");
      if (heart) {
        var added = toggleCloset(heart.getAttribute("data-fit-heart"));
        heart.setAttribute("aria-pressed", added ? "true" : "false");
        heart.textContent = added ? "♥" : "♡";
        return;
      }
      var all = e.target.closest("[data-fit-add]");
      if (all) {
        var ids = all.getAttribute("data-fit-add").split(",");
        ids.forEach(function (id) { if (closet.indexOf(id) === -1) closet.push(id); });
        writeCloset(closet);
        updateCloset();
        renderFit();
        toast(ids.length + "벌을 내 옷장에 담았습니다");
        return;
      }
      var opener = e.target.closest("[data-open]");
      if (opener) { e.preventDefault(); openModal(opener.getAttribute("data-open")); }
    });
    readFit();
    paintFit();
    renderFit();
  }

  /* ---------------- 코디 추천기 (예산·장면·스타일) ---------------- */
  var recPick = { budget: "", scene: "", style: "" };
  var REC_GROUPS = [
    {
      key: "budget", el: "#rec-budget", opts: [
        { v: "b10", t: "10만 원 이하", d: "대안템 기준", tag: "대안 10만 원 이하", fit: function (l) { return l.alt.price <= 100000; } },
        { v: "b30", t: "30만 원 이하", d: "정품 판매가 기준", tag: "정품 30만 원 이하", fit: function (l) { return price(l) <= 300000; } },
        { v: "bany", t: "상관없음", d: "정품·대안 모두", tag: "예산 무관", fit: function () { return true; } }
      ]
    },
    {
      key: "scene", el: "#rec-scene", opts: [
        { v: "airport", t: "공항", d: "출국·입국길", tag: "공항 착장", fit: function (l) { return l.type === "airport"; } },
        { v: "daily", t: "데일리", d: "일상·예능 사복", tag: "데일리 착장", fit: function (l) { return l.type === "daily" || l.type === "variety"; } },
        {
          v: "event", t: "연말·행사", d: "모임·파티", tag: "연말·행사 무드",
          fit: function (l) { return /벨벳|퍼|시어링|레이스|블루종|무스탕|코트|가죽|베스트/.test(l.item.name + " " + (l.item.material || "")); }
        }
      ]
    },
    {
      key: "style", el: "#rec-style", opts: [
        { v: "casual", t: "캐주얼·고프코어", d: "스웨트·스니커·패딩", tag: "캐주얼·고프코어", fit: function (l) { return (l.mood || []).indexOf("street") > -1; } },
        { v: "lovely", t: "러블리·니트", d: "니트·앙고라·퍼", tag: "러블리·니트", fit: function (l) { return (l.mood || []).indexOf("lovely") > -1; } },
        { v: "chic", t: "시크·코트", d: "코트·미니멀", tag: "시크·코트", fit: function (l) { return (l.mood || []).indexOf("minimal") > -1; } }
      ]
    }
  ];
  function recOpt(key, v) {
    if (!v) return null;
    for (var i = 0; i < REC_GROUPS.length; i++) {
      if (REC_GROUPS[i].key !== key) continue;
      var opts = REC_GROUPS[i].opts;
      for (var j = 0; j < opts.length; j++) if (opts[j].v === v) return opts[j];
    }
    return null;
  }
  function recScore(l) {
    var b = recOpt("budget", recPick.budget), s = recOpt("scene", recPick.scene), st = recOpt("style", recPick.style);
    var score = 34, hits = [];
    if (b && b.fit(l)) { score += 20; hits.push(b.tag); }
    if (s && s.fit(l)) { score += 24; hits.push(s.tag); }
    if (st && st.fit(l)) { score += 22; hits.push(st.tag); }
    return { score: score, hits: hits };
  }
  function paintRec() {
    $all("[data-rec]").forEach(function (b) {
      var key = b.getAttribute("data-rec");
      b.setAttribute("aria-pressed", recPick[key] === b.getAttribute("data-val") ? "true" : "false");
    });
    var n = 0;
    if (recPick.budget) n++;
    if (recPick.scene) n++;
    if (recPick.style) n++;
    var c = $("#rec-count");
    if (c) c.textContent = n + " / 3 선택";
  }
  function recCardHTML(x, i) {
    var l = x.l;
    var reason = x.hits.map(function (h) { return "<span>" + esc(h) + "</span>"; }).join("");
    var inCloset = closet.indexOf(l.id) > -1;
    return '<article class="rec-card">' +
      '<button type="button" class="rec-card-media" data-open="' + l.id + '" aria-label="' + esc(l.celeb + " " + l.item.name + " 상세 보기") + '">' +
        picture(l, i === 0) +
        '<span class="rec-rank">TOP ' + (i + 1) + '</span>' +
        '<span class="rec-match">조건 ' + x.hits.length + '/3 일치</span>' +
      "</button>" +
      '<div class="rec-card-body">' +
        "<h4>" + esc(l.celeb) + " · " + esc(l.headline) + "<span>" + esc(l.item.brand) + " " + esc(l.item.name) + "</span></h4>" +
        (reason ? '<div class="rec-reasons">' + reason + "</div>" : "") +
        '<div class="rec-prices"><b>' + won(price(l)) + "</b><small>대안 " + won(l.alt.price) + " · " + saveRate(l) + "%↓</small></div>" +
        '<div class="rec-card-actions">' +
          '<button type="button" class="btn ghost" data-open="' + l.id + '">상세</button>' +
          '<a class="btn ghost" href="' + esc(CFG.buildLink(l.alt.platform === "official" ? "naver" : l.alt.platform, l.alt.query)) + '" target="_blank" rel="noopener sponsored">대안 보기</a>' +
          '<button type="button" class="btn ghost" data-rec-heart="' + l.id + '" aria-pressed="' + inCloset + '">' + (inCloset ? "♥" : "♡") + "</button>" +
        "</div>" +
      "</div>" +
    "</article>";
  }
  function renderRec() {
    var res = $("#rec-result");
    if (!res) return;
    var filled = 0;
    if (recPick.budget) filled++;
    if (recPick.scene) filled++;
    if (recPick.style) filled++;
    if (filled < 3) {
      res.innerHTML = '<p class="rec-empty">' + (filled ? (3 - filled) + "가지만 더 고르면 추천 3벌이 나옵니다." : "세 가지를 고르면 여기에 추천 3벌이 나타납니다.") + "</p>";
      return;
    }
    var scored = LOOKS.map(function (l) { var s = recScore(l); return { l: l, score: s.score, hits: s.hits }; });
    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return saveRate(b.l) - saveRate(a.l);
    });
    var picked = [], used = {};
    scored.forEach(function (x) {
      if (picked.length < 3 && !used[x.l.celeb]) { used[x.l.celeb] = 1; picked.push(x); }
    });
    scored.forEach(function (x) {
      if (picked.length < 3 && picked.indexOf(x) === -1) picked.push(x);
    });
    var best = picked[0];
    var label = [recOpt("budget", recPick.budget).t, recOpt("scene", recPick.scene).t, recOpt("style", recPick.style).t].join(" · ");
    res.innerHTML =
      '<div class="rec-top">' +
        "<h3>조건에 가장 가까운 3벌</h3>" +
        '<p>' + esc(label) + " · 적합도 순</p>" +
      "</div>" +
      '<div class="rec-grid">' + picked.map(recCardHTML).join("") + "</div>" +
      '<div class="rec-actions" style="margin-top:14px">' +
        '<button type="button" class="btn small" data-rec-add-all="' + picked.map(function (x) { return x.l.id; }).join(",") + '">3벌 모두 내 옷장에 담기</button>' +
        '<button type="button" class="btn ghost small" data-open="' + best.l.id + '">1순위 상세 보기</button>' +
      "</div>";
  }
  function initRec() {
    REC_GROUPS.forEach(function (g) {
      var el = $(g.el);
      if (!el) return;
      el.innerHTML = g.opts.map(function (o) {
        return '<button type="button" class="rec-opt" data-rec="' + g.key + '" data-val="' + o.v + '" aria-pressed="false">' +
          o.t + "<small>" + esc(o.d) + "</small></button>";
      }).join("");
      el.addEventListener("click", function (e) {
        var b = e.target.closest("[data-rec]");
        if (!b) return;
        var key = b.getAttribute("data-rec"), val = b.getAttribute("data-val");
        recPick[key] = recPick[key] === val ? "" : val;
        paintRec();
        renderRec();
      });
    });
    var reset = $("#rec-reset");
    if (reset) reset.addEventListener("click", function () {
      recPick = { budget: "", scene: "", style: "" };
      paintRec(); renderRec();
    });
    var res = $("#rec-result");
    if (res) res.addEventListener("click", function (e) {
      var heart = e.target.closest("[data-rec-heart]");
      if (heart) {
        var added = toggleCloset(heart.getAttribute("data-rec-heart"));
        heart.setAttribute("aria-pressed", added ? "true" : "false");
        heart.textContent = added ? "♥" : "♡";
        return;
      }
      var all = e.target.closest("[data-rec-add-all]");
      if (all) {
        var ids = all.getAttribute("data-rec-add-all").split(",");
        ids.forEach(function (id) { if (closet.indexOf(id) === -1) { closet.push(id); } });
        writeCloset(closet);
        updateCloset();
        renderRec();
        toast(ids.length + "벌을 내 옷장에 담았습니다");
        return;
      }
      var opener = e.target.closest("[data-open]");
      if (opener) { e.preventDefault(); openModal(opener.getAttribute("data-open")); }
    });
  }

  /* ---------------- 옷장 절약 계산기 ---------------- */
  function altUrlOf(l) {
    return CFG.buildLink(l.alt.platform === "official" ? "naver" : l.alt.platform, l.alt.query);
  }
  function closetTotals() {
    var items = closet.map(findLook).filter(Boolean);
    var full = 0, alt = 0;
    items.forEach(function (l) { full += price(l); alt += l.alt.price; });
    var saved = Math.max(0, full - alt);
    return { items: items, full: full, alt: alt, saved: saved, rate: full ? Math.round((saved / full) * 100) : 0 };
  }
  function updateClosetCalc() {
    var t = closetTotals();
    var calc = $("#closet-calc");
    if (calc) calc.hidden = t.items.length === 0;
    if ($("#cc-count")) $("#cc-count").textContent = t.items.length;
    if ($("#cc-full")) $("#cc-full").textContent = "₩" + t.full.toLocaleString("ko-KR");
    if ($("#cc-alt")) $("#cc-alt").textContent = "₩" + t.alt.toLocaleString("ko-KR");
    if ($("#cc-save")) $("#cc-save").textContent = "₩" + t.saved.toLocaleString("ko-KR");
    if ($("#cc-rate")) $("#cc-rate").textContent = "(" + t.rate + "%)";
    var bar = $("#cc-bar-bar");
    if (bar) bar.style.width = t.rate + "%";
    var mini = $("#closet-mini");
    if (mini) {
      var panelOpen = $("#closet-panel") && !$("#closet-panel").hidden;
      mini.hidden = !(t.items.length && !panelOpen);
      if ($("#closet-mini-text")) $("#closet-mini-text").textContent = t.items.length + "벌";
      if ($("#closet-mini-save")) $("#closet-mini-save").textContent = "₩" + t.saved.toLocaleString("ko-KR") + " 절약";
    }
  }
  function compareRows() {
    return closetTotals().items.map(function (l) {
      return { l: l, full: price(l), alt: l.alt.price, save: saveAmount(l), rate: saveRate(l) };
    });
  }
  function compareText() {
    var rows = compareRows();
    return rows.map(function (r) {
      return r.l.celeb + " " + r.l.item.brand + " " + r.l.item.name + " | 정품 " + won(r.full) + " → 대안 " + won(r.alt) + " (" + r.rate + "%↓) | " + altUrlOf(r.l);
    }).join("\n");
  }
  function openCompare() {
    var rows = compareRows();
    if (!rows.length) { toast("찜한 코디가 없습니다"); return; }
    var t = closetTotals();
    $("#compare-lead").textContent = "찜한 " + rows.length + "벌 정품 총액 ₩" + t.full.toLocaleString("ko-KR") +
      " → 가성비 대안으로 맞추면 ₩" + t.alt.toLocaleString("ko-KR") + " (총 ₩" + t.saved.toLocaleString("ko-KR") + " 절약, " + t.rate + "%)";
    $("#compare-table").innerHTML =
      "<caption class=\"sr-only\">찜한 착장별 정품·대안 가격 비교</caption>" +
      "<thead><tr><th scope=\"col\">착장</th><th scope=\"col\">정품</th><th scope=\"col\">가성비 대안</th><th scope=\"col\">절약</th><th scope=\"col\">링크</th></tr></thead><tbody>" +
      rows.map(function (r) {
        var l = r.l;
        return "<tr><th scope=\"row\">" + esc(l.celeb) + "<small>" + esc(l.headline) + "</small></th>" +
          "<td><b>" + won(r.full) + "</b><small>" + esc(l.item.brand) + "</small></td>" +
          "<td><b>" + won(r.alt) + "</b><small>" + esc(l.alt.brand) + " · " + r.rate + "%↓</small></td>" +
          "<td><b>" + won(r.save) + "</b></td>" +
          "<td><a href=\"" + esc(altUrlOf(l)) + "\" target=\"_blank\" rel=\"noopener sponsored\">대안 보기 ↗</a><a href=\"" + esc(l.item.officialUrl) + "\" target=\"_blank\" rel=\"noopener sponsored\">정품 보기 ↗</a></td></tr>";
      }).join("") +
      "</tbody><tfoot><tr><td colspan=\"5\">총 ₩" + t.saved.toLocaleString("ko-KR") + " 절약 · 대안으로 맞추면 ₩" + t.alt.toLocaleString("ko-KR") + " / 정품 ₩" + t.full.toLocaleString("ko-KR") + "</td></tr></tfoot>";
    $("#compare-modal").hidden = false;
    document.body.classList.add("modal-open");
    $("#compare-close").focus();
  }
  function closeCompare() {
    var m = $("#compare-modal");
    if (!m || m.hidden) return;
    m.hidden = true;
    if ($("#modal").hidden) document.body.classList.remove("modal-open");
  }
  function copyText(text, okMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, function () { toast("복사가 막혔습니다. 표의 링크를 하나씩 눌러 주세요"); });
    } else toast("복사가 지원되지 않는 브라우저입니다. 표의 링크를 눌러 주세요");
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
      state.mood = ""; state.cat = ""; state.type = ""; state.celeb = ""; state.brand = ""; state.band = "";
      paintChips(); paintQuick(); renderGrid(); writeURL(); openClosetPanel(false);
      document.getElementById("looks").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("#closet-clear").addEventListener("click", function () {
      closet = []; writeCloset(closet); updateCloset(); renderGrid(); toast("옷장을 비웠습니다");
    });
    var mini = $("#closet-mini");
    if (mini) mini.addEventListener("click", function () {
      openClosetPanel(true);
      $("#closet-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    var ccCompare = $("#cc-compare");
    if (ccCompare) ccCompare.addEventListener("click", openCompare);
    var ccCopy = $("#cc-copy");
    if (ccCopy) ccCopy.addEventListener("click", function () {
      if (!compareRows().length) { toast("찜한 코디가 없습니다"); return; }
      copyText(compareText(), "구매 링크 " + compareRows().length + "개를 복사했습니다");
    });
    var cmpClose = $("#compare-close");
    if (cmpClose) cmpClose.addEventListener("click", closeCompare);
    var cmpModal = $("#compare-modal");
    if (cmpModal) cmpModal.addEventListener("click", function (e) {
      if (e.target.closest("[data-cmp-close]")) closeCompare();
    });
    var cmpCopy = $("#compare-copy");
    if (cmpCopy) cmpCopy.addEventListener("click", function () {
      copyText(compareText(), "구매 링크를 모두 복사했습니다");
    });
    var cmpOpenAll = $("#compare-open-all");
    if (cmpOpenAll) cmpOpenAll.addEventListener("click", function () {
      var rows = compareRows();
      if (!rows.length) { toast("찜한 코디가 없습니다"); return; }
      rows.forEach(function (r) { window.open(altUrlOf(r.l), "_blank", "noopener"); });
      toast("새 탭으로 열었습니다. 팝업이 막히면 표의 링크를 하나씩 눌러 주세요");
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
        if ($("#compare-modal") && !$("#compare-modal").hidden) closeCompare();
        else if (!$("#modal").hidden) closeModal();
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
      readURL(); syncControls(); paintChips(); paintHotTags(); renderGrid(); highlightModelCards();
      var p = new URLSearchParams(location.search);
      if (p.get("look")) openModal(p.get("look")); else closeModal();
    });
  }

  function resetFilters() {
    state = { q: "", type: "", cat: "", mood: "", celeb: "", brand: "", band: "", model: "", ids: [], budget: false, closet: false, discount: false, sort: "recent" };
    syncControls(); paintChips(); paintQuick(); paintHeat(); renderGrid(); writeURL(); syncFilterMore(); paintHotTags();
  }
  function syncControls() {
    $("#q").value = state.q;
    $("#q-hero").value = state.q;
    $("#sort").value = state.sort;
    $("#budget-toggle").checked = state.budget;
    $("#closet-toggle").checked = state.closet;
  }


  /* ---------------- quick filter (브랜드·가격대) ---------------- */
  function bandCount(v) {
    return LOOKS.filter(function (l) {
      var p = price(l);
      if (v === "u10") return p <= 100000;
      if (v === "10to30") return p > 100000 && p <= 300000;
      if (v === "30to100") return p > 300000 && p <= 1000000;
      if (v === "o100") return p > 1000000;
      return true;
    }).length;
  }
  function buildQuick() {
    var bw = $("#qf-brand"), bandw = $("#qf-band");
    if (!bw || !bandw) return;
    var counts = {};
    LOOKS.forEach(function (l) { counts[l.item.brand] = (counts[l.item.brand] || 0) + 1; });
    var brands = Object.keys(counts).sort(function (a, b) {
      return counts[b] - counts[a] || a.localeCompare(b, "ko");
    });
    var strong = brands.filter(function (b) { return counts[b] >= 2; });
    brands = strong.length >= 6 ? strong.slice(0, 8)
      : strong.concat(brands.filter(function (b) { return counts[b] < 2; })).slice(0, 8);
    bw.innerHTML = brands.map(function (b) {
      return '<button type="button" class="chip qf-chip" data-key="brand" data-value="' + esc(b) + '" aria-pressed="false">' + esc(b) + "<small>" + counts[b] + "</small></button>";
    }).join("");
    var bands = [["u10", "10만 원 이하"], ["10to30", "10~30만"], ["30to100", "30~100만"], ["o100", "100만 이상"]];
    bandw.innerHTML = bands.map(function (x) {
      return '<button type="button" class="chip qf-chip" data-key="band" data-value="' + x[0] + '" aria-pressed="false">' + x[1] + "<small>" + bandCount(x[0]) + "</small></button>";
    }).join("");
  }
  function paintQuick() {
    $all(".qf-chip").forEach(function (btn) {
      var k = btn.getAttribute("data-key"), v = btn.getAttribute("data-value");
      var on = (k === "brand" && state.brand === v) || (k === "band" && state.band === v);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  /* ---------------- 오늘의 코디 룰렛 ---------------- */
  function initRoulette() {
    var card = $("#rl-card"), btn = $("#rl-spin"), thumbs = $("#rl-thumbs"), out = $("#rl-result");
    if (!card || !btn || !thumbs || !out) return;
    function sample(n) {
      var pool = LOOKS.slice(), pick = [];
      while (pool.length && pick.length < n) pick.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
      return pick;
    }
    function paintThumbs(list, active) {
      thumbs.innerHTML = list.map(function (l, i) {
        return '<a class="rl-thumb' + (i === active ? " on" : "") + '" href="look-' + l.id + '.html" tabindex="-1" aria-hidden="true">' +
          "<picture>" + (l.image ? '<source srcset="' + esc(l.image) + '" type="image/webp">' : "") +
          '<img src="' + esc(l.imageJpg || l.image) + '" alt="" width="180" height="225" loading="lazy" decoding="async"></picture></a>';
      }).join("");
    }
    function show(l) {
      out.innerHTML =
        '<p class="rl-kicker">TODAY\'S PICK</p>' +
        "<h3>" + esc(l.celeb) + " · " + esc(l.headline) + "</h3>" +
        '<p class="rl-brand">' + esc(l.item.brand) + " " + esc(l.item.name) + "</p>" +
        '<p class="rl-prices"><b>' + won(price(l)) + "</b><span>대안 " + won(l.alt.price) + " <i>" + saveRate(l) + "%↓</i></span></p>" +
        '<div class="rl-actions"><a class="btn small" href="look-' + l.id + '.html">착장 포스팅 보기</a>' +
        '<a class="btn ghost small" href="?look=' + encodeURIComponent(l.id) + '">가격·대안 비교</a></div>';
      card.classList.add("has-result");
    }
    paintThumbs(sample(5), -1);
    btn.addEventListener("click", function () {
      if (btn.disabled) return;
      btn.disabled = true;
      card.classList.add("spinning");
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var ticks = 0, target = 10 + Math.floor(Math.random() * 8);
      var timer = setInterval(function () {
        paintThumbs(sample(5), Math.floor(Math.random() * 5));
        ticks++;
        if (ticks >= target || reduce) {
          clearInterval(timer);
          var l = LOOKS[Math.floor(Math.random() * LOOKS.length)];
          paintThumbs([l].concat(sample(4)), 0);
          show(l);
          card.classList.remove("spinning");
          btn.disabled = false;
          btn.textContent = "🎰 다시 돌리기";
        }
      }, reduce ? 10 : 100);
    });
  }

  /* ---------------- exclusive models ---------------- */
  function modelCount(id) {
    return LOOKS.filter(function (l) { return l.modelId === id; }).length;
  }
  function initModels() {
    var chips = $("#chips-model");
    if (chips && MODELS.length) {
      chips.innerHTML = MODELS.map(function (m) {
        return '<button type="button" class="chip" data-key="model" data-value="' + m.id + '" aria-pressed="false">' +
          esc(m.name) + '<span class="num">' + modelCount(m.id) + "</span></button>";
      }).join("");
    }
    var grid = $("#model-grid");
    if (!grid) return;
    var cards = grid.querySelectorAll("[data-model]");
    Array.prototype.forEach.call(cards, function (card) {
      card.addEventListener("click", function () {
        var id = card.getAttribute("data-model");
        state.model = state.model === id ? "" : id;
        paintChips();
        renderGrid();
        writeURL();
        var target = document.getElementById("looks");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    highlightModelCards();
  }
  function highlightModelCards() {
    var grid = $("#model-grid");
    if (!grid) return;
    Array.prototype.forEach.call(grid.querySelectorAll("[data-model]"), function (card) {
      var on = card.getAttribute("data-model") === state.model;
      card.setAttribute("aria-pressed", on ? "true" : "false");
      card.classList.toggle("is-on", on);
    });
  }

  /* ---------------- init ---------------- */
  function init() {
    buildChips($("#chips-type"), TYPE_ORDER, TYPE_LABEL, "type");
    buildChips($("#chips-cat"), CAT_ORDER, CAT_LABEL, "cat");
    buildChips($("#chips-mood"), MOOD_ORDER, MOOD_LABEL, "mood");
    buildCelebChips();
    initModels();

    readURL();
    syncControls();
    paintChips();
    renderGrid();
    highlightModelCards();
    initStats();
    initAds();
    updateCloset();
    quizHTML();
    syncFilterMore();
    initRec();
    initPicks();
    initFit();
    updateClosetCalc();
    bindChips();
    buildQuick();
    paintQuick();
    paintHeat();
    bindHeat();
    bindRecent();
    renderRecent();
    initSuggest();
    initRoulette();
    initTags();
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
