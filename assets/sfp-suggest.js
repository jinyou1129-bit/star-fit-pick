/* =========================================================
   스타핏픽 — 검색 즉시 추천(연관 검색 드롭다운)
   ---------------------------------------------------------
   index.html / posts.html 공용.
   · 입력창에 포커스하거나 글자를 입력하면 후보 6개를 바로 띄운다.
   · 키보드 ↑↓ · Enter · Esc 지원, ARIA combobox 패턴.
   · 후보를 고르면 opts.onPick(item) 이 실행된다(페이지가 필터 적용).
   ========================================================= */
(function () {
  "use strict";
  var seq = 0;

  function attach(input, opts) {
    if (!input || input._sfpSuggest) return null;
    opts = opts || {};
    var limit = opts.limit || 6;
    var listId = "sfp-sg-" + (++seq);
    var wrap = document.createElement("div");
    wrap.className = "sfp-sg-wrap";
    var list = document.createElement("div");
    list.className = "sfp-sg";
    list.id = listId;
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", opts.label || "연관 검색 후보");
    list.hidden = true;
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    wrap.appendChild(list);

    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", listId);
    input.setAttribute("autocomplete", "off");

    var items = [];
    var active = -1;

    function esc(s) {
      return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }
    function close() {
      if (list.hidden) return;
      list.hidden = true;
      list.innerHTML = "";
      items = [];
      active = -1;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
    }
    function paint() {
      if (!items.length) { close(); return; }
      list.innerHTML =
        (opts.heading ? '<p class="sfp-sg-head">' + esc(opts.heading) + "</p>" : "") +
        items.map(function (it, i) {
          return '<button type="button" class="sfp-sg-item' + (i === active ? " on" : "") + '" role="option"' +
            ' id="' + listId + "-o" + i + '" aria-selected="' + (i === active) + '"' +
            ' data-i="' + i + '">' +
            '<span class="sg-label">' + esc(it.label) + "</span>" +
            (it.meta ? '<span class="sg-meta">' + esc(it.meta) + "</span>" : "") +
            (it.type ? '<span class="sg-type">' + esc(it.type) + "</span>" : "") +
            "</button>";
        }).join("");
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
      if (active > -1) input.setAttribute("aria-activedescendant", listId + "-o" + active);
      else input.removeAttribute("aria-activedescendant");
    }
    function open(q) {
      var found = (opts.items ? opts.items(q) : []) || [];
      items = found.slice(0, limit);
      active = -1;
      paint();
    }
    function pick(i) {
      var it = items[i];
      if (!it) return;
      close();
      if (opts.onPick) opts.onPick(it, input.value);
    }

    input.addEventListener("focus", function () { open(input.value.trim()); });
    input.addEventListener("click", function () { if (list.hidden) open(input.value.trim()); });
    input.addEventListener("input", function () { open(input.value.trim()); });
    input.addEventListener("keydown", function (e) {
      if (list.hidden && (e.key === "ArrowDown" || e.key === "ArrowUp")) { open(input.value.trim()); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        active = Math.min(items.length - 1, active + 1);
        paint();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        active = Math.max(0, active - 1);
        paint();
      } else if (e.key === "Enter") {
        if (!list.hidden && active > -1) { e.preventDefault(); pick(active); }
        else close();
      } else if (e.key === "Escape") {
        close();
      }
    });
    input.addEventListener("blur", function () { setTimeout(close, 120); });
    list.addEventListener("mousedown", function (e) { e.preventDefault(); });
    list.addEventListener("click", function (e) {
      var b = e.target.closest(".sfp-sg-item");
      if (b) pick(Number(b.getAttribute("data-i")));
    });
    document.addEventListener("click", function (e) {
      if (!wrap.contains(e.target)) close();
    });

    input._sfpSuggest = { close: close, open: open };
    return input._sfpSuggest;
  }

  window.SFPSuggest = { attach: attach };
})();
