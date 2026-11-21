/* =========================================================
   스타핏픽 — 착장 이상형 월드컵 (worldcup.js)
   · data/looks.js 55벌 중 16벌(또는 8벌) 토너먼트
   · 진행 상황은 localStorage, 우승 결과는 링크로 공유
   ========================================================= */
(function () {
  "use strict";

  var LOOKS = window.SFP_LOOKS || [];
  var CFG = window.SFP_CONFIG || {};
  var byId = {};
  LOOKS.forEach(function (l) { byId[l.id] = l; });

  var CLOSET_KEY = "sfp:closet:v1";
  var STORE_KEY = "sfp:worldcup:v1";
  var HIST_KEY = "sfp:worldcup:wins:v1";
  var ROUND_NAMES = { 16: ["16강", "8강", "4강", "결승"], 8: ["8강", "4강", "결승"] };

  var stageEl = document.getElementById("wc-stage");
  var liveEl = document.getElementById("wc-live");
  var histEl = document.getElementById("wc-history");
  var startEl = document.getElementById("wc-start");
  var playEl = document.getElementById("wc-play");
  var resumeEl = document.getElementById("wc-resume");
  var startBtn = document.getElementById("wc-start-btn");

  var game = null;
  var mode = 16;
  var busy = false;

  /* ---------------- utils ---------------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function won(n) { return Number(n || 0).toLocaleString("ko-KR") + "원"; }
  function priceOf(l) { return l.item.salePrice && l.item.salePrice < l.item.price ? l.item.salePrice : l.item.price; }
  function saveRate(l) { return Math.round((1 - l.alt.price / priceOf(l)) * 100); }
  function saveAmount(l) { return Math.max(0, priceOf(l) - l.alt.price); }
  function hrefLook(l) { return "look-" + l.id + ".html"; }
  function buildLink(p, q) { return CFG.buildLink ? CFG.buildLink(p, q) : "#"; }
  function newSeed() { return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0; }
  function picture(l, eager) {
    var alt = l.imageAlt || (l.celeb + " " + l.item.name);
    return "<picture>" +
      (l.image ? '<source srcset="' + esc(l.image) + '" type="image/webp">' : "") +
      '<img src="' + esc(l.imageJpg || l.image) + '" alt="' + esc(alt) + '" width="720" height="900"' +
      (eager ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"') + ' decoding="async">' +
      "</picture>";
  }

  /* ---------------- deterministic draw ---------------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function draw(size, seed) {
    var rnd = mulberry32(seed);
    var pool = LOOKS.map(function (l) { return l.id; });
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    return pool.slice(0, size);
  }
  function derive() {
    var order = draw(game.size, game.seed);
    var round = 0, idx = 0, winners = [], log = [];
    game.picks.forEach(function (p) {
      var a = order[idx * 2], b = order[idx * 2 + 1];
      log.push({ round: round, idx: idx, a: a, b: b, win: p.win });
      winners.push(p.win);
      if ((idx + 1) * 2 >= order.length) {
        order = winners; winners = []; round += 1; idx = 0;
      } else idx += 1;
    });
    return { order: order, winners: winners, round: round, idx: idx, log: log };
  }
  function roundName(r) {
    var names = ROUND_NAMES[game.size] || ROUND_NAMES[16];
    return names[r] || "결승";
  }

  /* ---------------- storage ---------------- */
  function readStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || (o.size !== 16 && o.size !== 8) || !o.seed || !Array.isArray(o.picks)) return null;
      o.picks = o.picks.filter(function (p) { return p && byId[p.win]; });
      if (o.picks.length > o.size - 1) o.picks = o.picks.slice(0, o.size - 1);
      return o;
    } catch (e) { return null; }
  }
  function saveStore() {
    try {
      if (game && !game.shared) localStorage.setItem(STORE_KEY, JSON.stringify({ size: game.size, seed: game.seed, picks: game.picks }));
    } catch (e) {}
  }
  function readHistory() {
    try {
      var raw = localStorage.getItem(HIST_KEY);
      var a = raw ? JSON.parse(raw) : [];
      return Array.isArray(a) ? a.filter(function (x) { return x && byId[x.id]; }).slice(0, 5) : [];
    } catch (e) { return []; }
  }
  function pushHistory(id) {
    var list = readHistory();
    if (list.length && list[0].id === id) return;
    list.unshift({ id: id, at: Date.now() });
    try { localStorage.setItem(HIST_KEY, JSON.stringify(list.slice(0, 5))); } catch (e) {}
  }
  function readCloset() {
    try {
      var raw = localStorage.getItem(CLOSET_KEY);
      var a = raw ? JSON.parse(raw) : [];
      return Array.isArray(a) ? a.filter(function (id) { return !!byId[id]; }) : [];
    } catch (e) { return []; }
  }
  function toggleCloset(id) {
    var c = readCloset();
    var i = c.indexOf(id);
    if (i > -1) c.splice(i, 1); else c.push(id);
    try { localStorage.setItem(CLOSET_KEY, JSON.stringify(c)); } catch (e) {}
    paintClosetCount();
    return i === -1;
  }
  function paintClosetCount() {
    var el = document.getElementById("wc-closet-count");
    if (el) el.textContent = readCloset().length;
  }

  /* ---------------- stage ---------------- */
  function announce(msg) {
    if (liveEl) liveEl.textContent = msg;
  }

  function fighterHTML(l, order) {
    return '<button type="button" class="wc-fighter" data-pick="' + l.id + '" aria-label="' +
      esc(l.celeb + " " + l.headline + " 선택") + '">' +
      '<span class="wc-fighter-art">' + picture(l, true) +
        '<span class="wc-tag">' + esc(l.show) + "</span>" +
        '<span class="wc-save">대안 ' + saveRate(l) + "%↓</span>" +
      "</span>" +
      '<span class="wc-fighter-body">' +
        '<span class="wc-name">' + esc(l.celeb) + "<em>" + esc(l.group) + "</em></span>" +
        '<span class="wc-line">' + esc(l.headline) + "</span>" +
        '<span class="wc-brand">' + esc(l.item.brand) + " · " + esc(l.item.name) + "</span>" +
        '<span class="wc-price">' + won(priceOf(l)) + "<small>대안 " + won(l.alt.price) + "</small></span>" +
        '<span class="wc-pick">이 룩 고르기</span>' +
      "</span>" +
    "</button>";
  }

  function roundsBar(d) {
    var names = ROUND_NAMES[game.size] || ROUND_NAMES[16];
    return names.map(function (n, i) {
      var cls = i < d.round ? "done" : i === d.round ? "on" : "";
      return '<span class="wc-round ' + cls + '">' + n + "</span>";
    }).join('<span class="wc-round-sep" aria-hidden="true">›</span>');
  }

  function renderStage() {
    if (!game) return;
    var d = derive();
    if (playEl) playEl.hidden = false;
    if (startEl) startEl.hidden = true;
    var heroInner = document.querySelector(".wc-hero-inner");
    if (heroInner) heroInner.classList.add("is-playing");

    if (!LOOKS.length) {
      stageEl.innerHTML = '<p class="wc-error">착장 데이터를 불러오지 못했습니다. 새로고침해 주세요.</p>';
      return;
    }
    if (d.order.length === 1 && game.picks.length) {
      renderWinner(d);
      return;
    }

    var a = byId[d.order[d.idx * 2]];
    var b = byId[d.order[d.idx * 2 + 1]];
    if (!a || !b) {
      stageEl.innerHTML = '<p class="wc-error">대진을 불러오지 못했습니다. 처음부터 다시 시작해 주세요.</p>';
      return;
    }

    var total = game.size - 1;
    var done = game.picks.length;
    stageEl.innerHTML =
      '<div class="wc-stage-head">' +
        '<div class="wc-rounds">' + roundsBar(d) + "</div>" +
        '<div class="wc-progress"><span class="wc-progress-track"><i style="width:' +
          Math.round((done / total) * 100) + '%"></i></span><b>' + done + " / " + total + " 경기 완료</b></div>" +
      "</div>" +
      '<p class="wc-match-label">' + roundName(d.round) + " · " + (d.idx + 1) + "/" + Math.floor(d.order.length / 2) + " 경기</p>" +
      '<div class="wc-duel">' +
        fighterHTML(a) +
        '<div class="wc-vs" aria-hidden="true"><span>VS</span></div>' +
        fighterHTML(b) +
      "</div>" +
      '<div class="wc-tools">' +
        '<button type="button" class="wc-tool" data-undo="1"' + (done ? "" : " disabled") + ">← 이전 선택</button>" +
        '<button type="button" class="wc-tool" data-restart="1">처음부터</button>' +
        '<span class="wc-hint">마음에 드는 쪽을 누르면 다음 경기로 넘어갑니다.</span>' +
      "</div>";

    if (done === 0) announce(roundName(0) + " 대진이 시작되었습니다. " + a.celeb + " vs " + b.celeb + ".");
  }

  function pick(id) {
    if (busy || !game) return;
    var d = derive();
    var a = d.order[d.idx * 2], b = d.order[d.idx * 2 + 1];
    if (id !== a && id !== b) return;

    busy = true;
    var chosen = stageEl.querySelector('[data-pick="' + id + '"]');
    var otherId = id === a ? b : a;
    var other = stageEl.querySelector('[data-pick="' + otherId + '"]');
    if (chosen) chosen.classList.add("is-picked");
    if (other) other.classList.add("is-out");

    setTimeout(function () {
      var prevRound = d.round;
      game.picks.push({ win: id });
      saveStore();
      var next = derive();
      var w = byId[id];
      if (next.order.length === 1) announce(w.celeb + "의 " + w.headline + ", 최종 우승!");
      else if (next.round > prevRound) announce(w.celeb + "의 " + w.headline + ", " + roundName(next.round) + " 진출!");
      else {
        var na = byId[next.order[next.idx * 2]], nb = byId[next.order[next.idx * 2 + 1]];
        announce(w.celeb + " 승리 · 다음 경기 " + (na && nb ? na.celeb + " vs " + nb.celeb : ""));
      }
      busy = false;
      renderStage();
      if (stageEl && stageEl.offsetHeight) {
        var y = stageEl.getBoundingClientRect().top + window.pageYOffset - 84;
        if (window.pageYOffset > y + 40 || window.pageYOffset < y - 400) window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 190);
  }

  function undo() {
    if (!game || !game.picks.length) return;
    game.picks.pop();
    saveStore();
    renderStage();
    announce("이전 경기로 돌아갔습니다.");
  }

  function renderWinner(d, opts) {
    opts = opts || {};
    var w = byId[d.order[0]];
    var final = d.log[d.log.length - 1];
    var runner = final ? byId[final.win === final.a ? final.b : final.a] : null;
    var cur = priceOf(w);
    var rate = saveRate(w);
    var saved = saveAmount(w);
    var inCloset = readCloset().indexOf(w.id) > -1;
    var saleRow = w.item.salePrice && w.item.salePrice < w.item.price
      ? "<small>정가 " + won(w.item.price) + " · " + esc(w.item.saleNote || "") + "</small>" : "";
    var qOfficial = w.item.brand + " " + w.item.name;
    var firstRound = (ROUND_NAMES[game.size] || ROUND_NAMES[16])[0];
    var sub = opts.shared
      ? "공유받은 우승 결과 · " + esc(w.show) + " 착장"
      : firstRound + " " + (game.size - 1) + "경기 끝에 뽑힌 내 취향 1위";

    if (!opts.shared) {
      pushHistory(w.id);
      if (game) game.finished = true;
      try { localStorage.removeItem(STORE_KEY); } catch (e) {}
      try {
        var url = new URL(location.href);
        url.search = "";
        url.searchParams.set("win", w.id);
        history.replaceState(null, "", url.pathname + url.search);
      } catch (e) {}
      renderHistory();
    }

    stageEl.innerHTML =
      '<div class="wc-winner">' +
        '<div class="wc-winner-head">' +
          '<p class="eyebrow">FINAL WINNER</p>' +
          "<h2>" + esc(w.celeb) + " <small>" + esc(w.group) + "</small></h2>" +
          '<p class="wc-winner-sub">' + sub + "</p>" +
        "</div>" +
        '<div class="wc-winner-card">' +
          '<figure class="wc-winner-art">' + picture(w, true) +
            "<figcaption>👑 우승 · " + esc(w.show) + " · " + esc(w.headline) + "</figcaption></figure>" +
          '<div class="wc-winner-body">' +
            '<p class="wc-winner-brand">' + esc(w.item.brand) + " <span>" + esc(w.item.name) + "</span></p>" +
            '<div class="wc-price-row"><b>' + won(cur) + "</b>" + saleRow + "</div>" +
            '<h3 class="wc-h">정품 vs 10만 원 이하 대안</h3>' +
            '<div class="modal-compare"><table class="cmp">' +
              '<caption class="sr-only">우승 착장 정품과 가성비 대안 비교</caption>' +
              '<thead><tr><th scope="col">구분</th><th scope="col">정품</th><th scope="col">가성비 대안</th></tr></thead>' +
              "<tbody>" +
                '<tr><th scope="row">가격</th><td><b>' + won(cur) + "</b>" + saleRow + "</td>" +
                  '<td class="is-alt"><b>' + won(w.alt.price) + "</b><small>" + rate + "% 저렴</small></td></tr>" +
                '<tr><th scope="row">브랜드</th><td>' + esc(w.item.brand) + "</td>" +
                  '<td class="is-alt">' + esc(w.alt.brand) + "</td></tr>" +
                '<tr><th scope="row">제품</th><td>' + esc(w.item.name) + "<small>품번 " + esc(w.item.sku) + "</small></td>" +
                  '<td class="is-alt">' + esc(w.alt.name) + "</td></tr>" +
                '<tr><th scope="row">아쉬운 점</th><td>' + esc(w.item.cons || "—") + "</td>" +
                  '<td class="is-alt">' + esc(w.alt.cons || "—") + "</td></tr>" +
              "</tbody>" +
              '<tfoot><tr><td colspan="3"><div class="save-row"><span>대안으로 맞추면</span> <b>' + won(saved) +
                ' 절약</b> <em>정품 대비 ' + rate + "%↓</em></div></td></tr></tfoot>" +
            "</table></div>" +
            '<h3 class="wc-h">정품 구매 좌표</h3>' +
            '<div class="buy-row">' +
              '<a class="buy-btn" href="' + esc(w.item.officialUrl) + '" target="_blank" rel="noopener sponsored">공식몰 상품 페이지 ↗</a>' +
              '<a class="buy-btn sub" href="' + esc(buildLink("naver", qOfficial)) + '" target="_blank" rel="noopener sponsored">' + (CFG.naverPick && CFG.naverPick(qOfficial) ? "네이버 쇼핑커넥트 ↗" : "네이버 쇼핑 ↗") + '</a>' +
              '<a class="buy-btn sub" href="' + esc(buildLink("musinsa", qOfficial)) + '" target="_blank" rel="noopener sponsored">무신사 ↗</a>' +
            "</div>" +
            '<h3 class="wc-h">가성비 대안 (10만 원 이하)</h3>' +
            '<div class="alt-block">' +
              '<p class="alt-name">' + esc(w.alt.brand) + " · " + esc(w.alt.name) + "</p>" +
              '<p class="alt-meta">' + esc(w.alt.note) + "</p>" +
              '<div class="alt-price-row"><b>' + won(w.alt.price) + "</b><span>정품 " + won(cur) + " 대비 " + rate + "% 저렴</span></div>" +
              '<div class="buy-row">' +
                (w.alt.platform !== "official" && CFG.naverPick && CFG.naverPick(w.alt.query) ? '<a class="buy-btn sub" href="' + esc(buildLink("naver", w.alt.query)) + '" target="_blank" rel="noopener sponsored" title="' + esc(CFG.naverPick(w.alt.query).p || "네이버 쇼핑커넥트 상품") + '">네이버 쇼핑커넥트 ↗</a>' : "") +
                '<a class="buy-btn" href="' + esc(buildLink(w.alt.platform === "official" ? "naver" : w.alt.platform, w.alt.query)) + '" target="_blank" rel="noopener sponsored">' +
                  (w.alt.platform === "coupang" ? "비슷한 스타일 쿠팡에서 보기 ↗" : w.alt.platform === "musinsa" ? "무신사에서 보기 ↗" : (CFG.naverPick && CFG.naverPick(w.alt.query) ? "네이버 쇼핑커넥트 ↗" : "공식 판매처에서 보기 ↗")) + "</a>" +
                '<a class="buy-btn sub" href="' + esc(buildLink("coupang", w.alt.query)) + '" target="_blank" rel="noopener sponsored">쿠팡 검색 ↗</a>' +
                '<a class="buy-btn sub" href="' + esc(buildLink("elevenst", w.alt.query)) + '" target="_blank" rel="noopener sponsored">11번가 검색 ↗</a>' +
              "</div>" +
              '<p class="aff-note" style="font-size:11px;line-height:1.5;color:#8b8b8b;margin:8px 0 0">이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다. 네이버 쇼핑커넥트 활동의 일환으로, 판매 발생 시 수수료를 제공받습니다. 네이버 쇼핑커넥트 버튼은 같은 무드의 네이버 판매 상품으로 연결됩니다.</p>' +
            "</div>" +
            '<div class="wc-actions">' +
              '<button type="button" class="btn" data-again="1">' + (opts.shared ? "나도 월드컵 하기" : "다시 하기") + "</button>" +
              (!opts.shared ? '<button type="button" class="btn ghost" data-same="1">같은 대진 다시</button>' : "") +
              '<button type="button" class="btn ghost" data-copy="' + w.id + '">결과 링크 복사</button>' +
              '<button type="button" class="btn ghost" data-heart="' + w.id + '" aria-pressed="' + inCloset + '">' +
                (inCloset ? "♥ 내 옷장에서 빼기" : "♡ 내 옷장에 담기") + "</button>" +
              '<a class="btn ghost" href="' + esc(hrefLook(w)) + '">우승 룩 자세히 보기 →</a>' +
            "</div>" +
            '<p class="wc-note">가격은 2026년 11월 20일 확인 기준입니다. 구매 링크에는 제휴 파라미터가 포함될 수 있습니다.</p>' +
          "</div>" +
        "</div>" +
        (runner ? '<p class="wc-runner">결승에서 만난 <b>' + esc(runner.celeb) + "</b>의 " + esc(runner.headline) +
          '도 <a href="' + esc(hrefLook(runner)) + '">여기</a>에서 볼 수 있어요.</p>' : "") +
      "</div>";
  }

  function renderHistory() {
    if (!histEl) return;
    var list = readHistory();
    if (!list.length) { histEl.hidden = true; return; }
    histEl.hidden = false;
    histEl.innerHTML = '<p class="wc-history-title">🏆 이 브라우저의 지난 우승 기록</p><ul class="wc-history-list">' +
      list.map(function (x) {
        var l = byId[x.id];
        return '<li><a href="' + esc(hrefLook(l)) + '"><b>' + esc(l.celeb) + "</b><span>" + esc(l.headline) + "</span></a></li>";
      }).join("") + "</ul>";
  }

  /* ---------------- start / share ---------------- */
  function start(size, seed, silent) {
    game = { size: size, seed: seed >>> 0, picks: [], finished: false };
    busy = false;
    saveStore();
    try {
      var u = new URL(location.href);
      if (u.searchParams.get("win")) {
        u.searchParams.delete("win");
        history.replaceState(null, "", u.pathname + (u.search || "") + u.hash);
      }
    } catch (e) {}
    if (resumeEl) resumeEl.hidden = true;
    renderStage();
    if (!silent) {
      var y = playEl ? playEl.getBoundingClientRect().top + window.pageYOffset - 76 : 0;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }

  function showShared(id) {
    var l = byId[id];
    if (!l) return false;
    game = { size: 16, seed: 1, picks: [], shared: true };
    if (playEl) playEl.hidden = false;
    if (startEl) startEl.hidden = true;
    var heroInner = document.querySelector(".wc-hero-inner");
    if (heroInner) heroInner.classList.add("is-playing");
    renderWinner({ order: [id], log: [], round: 4, idx: 0 }, { shared: true });
    announce("공유받은 우승 결과입니다: " + l.celeb + " " + l.headline);
    return true;
  }

  function copyResult(id) {
    var url = location.origin + location.pathname + "?win=" + encodeURIComponent(id);
    var done = function () { announce("결과 링크를 복사했습니다."); flash("결과 링크를 복사했습니다"); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { promptCopy(url); });
    } else promptCopy(url);
  }
  function promptCopy(url) {
    window.prompt("아래 주소를 복사해 주세요", url);
  }
  function flash(msg) {
    if (liveEl) { liveEl.textContent = msg; }
    var t = document.getElementById("wc-toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(flash.timer);
    flash.timer = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  /* ---------------- events ---------------- */
  function bind() {
    if (stageEl) {
      stageEl.addEventListener("click", function (e) {
        var pickBtn = e.target.closest("[data-pick]");
        if (pickBtn) { pick(pickBtn.getAttribute("data-pick")); return; }
        if (e.target.closest("[data-undo]")) { undo(); return; }
        if (e.target.closest("[data-restart]")) { start(game ? game.size : mode, newSeed()); return; }
        if (e.target.closest("[data-again]")) { start(mode, newSeed()); return; }
        if (e.target.closest("[data-same]")) { start(game.size, game.seed); return; }
        var cp = e.target.closest("[data-copy]");
        if (cp) { copyResult(cp.getAttribute("data-copy")); return; }
        var hb = e.target.closest("[data-heart]");
        if (hb) {
          var added = toggleCloset(hb.getAttribute("data-heart"));
          hb.innerHTML = added ? "♥ 내 옷장에서 빼기" : "♡ 내 옷장에 담기";
          hb.setAttribute("aria-pressed", added ? "true" : "false");
          flash(added ? "내 옷장에 담았습니다" : "내 옷장에서 뺐습니다");
        }
      });
    }

    document.querySelectorAll(".wc-mode").forEach(function (btn) {
      btn.addEventListener("click", function () {
        mode = Number(btn.getAttribute("data-size")) === 8 ? 8 : 16;
        document.querySelectorAll(".wc-mode").forEach(function (b) {
          b.classList.toggle("is-on", b === btn);
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
      });
    });

    if (startBtn) startBtn.addEventListener("click", function () {
      start(mode, newSeed());
    });

    if (resumeEl) resumeEl.addEventListener("click", function () {
      var saved = readStore();
      if (!saved) return;
      game = { size: saved.size, seed: saved.seed, picks: saved.picks.slice(), finished: false };
      mode = saved.size;
      renderStage();
      var y = playEl ? playEl.getBoundingClientRect().top + window.pageYOffset - 76 : 0;
      window.scrollTo({ top: y, behavior: "smooth" });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && liveEl) { /* no-op: page has no modal */ }
    });
  }

  /* ---------------- init ---------------- */
  function init() {
    paintClosetCount();
    renderHistory();
    var params = new URLSearchParams(location.search);
    var win = params.get("win");

    var saved = readStore();
    if (saved && saved.picks.length && saved.picks.length < saved.size - 1 && resumeEl) {
      resumeEl.hidden = false;
      resumeEl.textContent = "저장된 대전 이어서 하기 (" + saved.picks.length + "/" + (saved.size - 1) + " 경기)";
    }

    bind();

    if (win && byId[win]) { showShared(win); return; }
    if (playEl) playEl.hidden = true;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
