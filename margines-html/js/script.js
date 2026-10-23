/* MARGINES — interakcje strony (czysty JavaScript, bez bibliotek)
   Koszyk, panel książki, wyszukiwarka, menu mobilne, filtry sklepu,
   punkty na zdjęciu strony głównej i formularz kontaktowy. */
(function () {
  "use strict";

  var DATA = window.MARGINES_DATA || { products: [], categories: [] };
  var STORAGE_KEY = "margines-cart";

  /* ---------- Pomocnicze ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function getProduct(id) {
    for (var i = 0; i < DATA.products.length; i++) if (DATA.products[i].id === id) return DATA.products[i];
    return null;
  }
  function formatPrice(n) { return n.toFixed(2).replace(".", ",") + " zł"; }
  function icon(d) {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"></path></svg>';
  }

  /* ---------- Okładka i karta produktu ---------- */
  function cover(p, small) {
    var c = p.cover;
    var style = "--c-bg:" + c.bg + ";--c-fg:" + c.fg + ";--c-acc:" + c.acc + ";--c-r:" + (c.r || "50%") + ";--c-align:" + (c.align || "center");
    return '<div class="m-cover" role="img" aria-label="Okładka: ' + esc(p.title) + ", " + esc(p.author) + '" style="' + style + '">' +
      '<span class="a">' + esc(p.author) + '</span><span class="shape"></span>' +
      '<span class="t"' + (small ? ' style="font-size:1.1rem"' : "") + ">" + esc(p.title) + "</span></div>";
  }
  function productCard(p) {
    return '<article class="card m-card h-100">' +
      '<button class="p-0 border-0 bg-transparent text-start" data-open="' + p.id + '" aria-label="Szczegóły: ' + esc(p.title) + '">' + cover(p) + "</button>" +
      '<div class="card-body d-flex flex-column"><h3 class="card-title">' + esc(p.title) + "</h3>" +
      '<p class="small text-muted-m mb-2">' + esc(p.author) + "</p>" +
      '<div class="d-flex justify-content-between align-items-center mt-auto"><span class="fw-semibold">' + formatPrice(p.price) + "</span>" +
      '<button class="m-icon-btn"' + (p.available ? ' data-add="' + p.id + '"' : " disabled") +
      ' aria-label="' + (p.available ? "Dodaj do koszyka: " + esc(p.title) : esc(p.title) + " — niedostępna") + '">' + icon("M12 5v14M5 12h14") + "</button>" +
      "</div></div></article>";
  }

  /* ---------- Koszyk (zapisywany w przeglądarce) ---------- */
  var items = [];
  try { items = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch (e) { items = []; }
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); updateCount(); }
  function lines() {
    return items.map(function (l) { return { id: l.id, qty: l.qty, product: getProduct(l.id) }; })
      .filter(function (l) { return l.product; });
  }
  function count() { return lines().reduce(function (s, l) { return s + l.qty; }, 0); }
  function total() { return lines().reduce(function (s, l) { return s + l.qty * l.product.price; }, 0); }

  function add(id) {
    var p = getProduct(id);
    if (!p || !p.available) return;
    var found = items.filter(function (l) { return l.id === id; })[0];
    if (found) found.qty += 1; else items.push({ id: id, qty: 1 });
    save();
    notify("Dodano do koszyka: „" + p.title + "”");
    if (currentPanel === "cart") openCart();
  }
  function setQty(id, qty) {
    items = qty <= 0 ? items.filter(function (l) { return l.id !== id; })
      : items.map(function (l) { return l.id === id ? { id: id, qty: qty } : l; });
    save();
  }

  var cartBtn = $('.m-icon-btn[aria-label^="Koszyk"]');
  function updateCount() {
    if (!cartBtn) return;
    var n = count();
    cartBtn.setAttribute("aria-label", "Koszyk, produktów: " + n);
    var badge = $(".m-count", cartBtn);
    if (n > 0) {
      if (!badge) { badge = document.createElement("span"); badge.className = "m-count"; badge.setAttribute("aria-hidden", "true"); cartBtn.appendChild(badge); }
      badge.textContent = n;
    } else if (badge) badge.remove();
  }

  /* ---------- Powiadomienie ---------- */
  var toastTimer;
  function notify(msg) {
    var box = $("#m-toast");
    box.innerHTML = '<div class="m-toast">' + esc(msg) + "</div>";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.innerHTML = ""; }, 2800);
  }

  /* ---------- Panel boczny ---------- */
  var overlays = $("#m-overlays");
  var currentPanel = null;
  var prevFocus = null;
  function openPanel(label, html, kind) {
    if (!currentPanel) prevFocus = document.activeElement;
    currentPanel = kind || "panel";
    overlays.innerHTML = '<div class="m-backdrop" data-close></div>' +
      '<div class="m-panel" role="dialog" aria-modal="true" aria-label="' + esc(label) + '" tabindex="-1">' +
      '<div class="d-flex justify-content-between align-items-center mb-4"><span class="m-eyebrow">' + esc(label) + "</span>" +
      '<button class="m-close" aria-label="Zamknij panel" data-close>×</button></div>' + html + "</div>";
    $(".m-panel", overlays).focus();
  }
  function closePanel() {
    if (!currentPanel) return;
    overlays.innerHTML = "";
    currentPanel = null;
    if (prevFocus && prevFocus.focus) prevFocus.focus();
  }

  function openProduct(id) {
    var p = getProduct(id);
    if (!p) return;
    openPanel("Książka",
      '<div><div style="max-width:220px" class="mb-4">' + cover(p) + "</div>" +
      '<span class="badge m-badge mb-2">' + esc(p.category) + "</span>" +
      '<h2 class="mb-1" style="font-size:2.2rem">' + esc(p.title) + "</h2>" +
      '<p class="text-muted-m mb-3">' + esc(p.author) + "</p><p>" + esc(p.description) + "</p>" +
      '<p class="fs-4 fw-semibold mb-1">' + formatPrice(p.price) + "</p>" +
      '<p class="small mb-4 ' + (p.available ? "" : "text-danger") + '">' + esc(p.stockNote) + "</p>" +
      '<div class="d-flex flex-wrap gap-2"><button class="btn btn-m-dark"' + (p.available ? ' data-add="' + p.id + '"' : " disabled") + ">Dodaj do koszyka</button>" +
      '<a href="ksiazka-' + p.id + '.html" class="btn btn-m-line">Zobacz książkę</a></div></div>');
  }

  function openCart() {
    var ls = lines();
    var html;
    if (!ls.length) {
      html = '<div><h2 style="font-size:2rem">Koszyk jest pusty</h2>' +
        '<p class="text-muted-m">Rozejrzyj się po księgarni — coś na pewno wpadnie Ci w oko.</p>' +
        '<a href="ksiazki.html" class="btn btn-m-dark">Przeglądaj książki</a></div>';
    } else {
      html = '<ul class="list-group m-list mb-4">' + ls.map(function (l) {
        var t = esc(l.product.title);
        return '<li class="list-group-item d-flex gap-3 align-items-start"><div style="width:56px;flex:none">' + cover(l.product, true) + "</div>" +
          '<div class="flex-grow-1"><h3 class="mb-0">' + t + "</h3>" +
          '<p class="small text-muted-m mb-2">' + esc(l.product.author) + " · " + formatPrice(l.product.price) + "</p>" +
          '<div class="d-flex align-items-center gap-2">' +
          '<button class="btn btn-m-line px-3" data-qty="' + l.id + '" data-delta="-1" aria-label="Zmniejsz ilość: ' + t + '">−</button>' +
          '<span aria-live="polite">' + l.qty + "</span>" +
          '<button class="btn btn-m-line px-3" data-qty="' + l.id + '" data-delta="1" aria-label="Zwiększ ilość: ' + t + '">+</button>' +
          '<button class="btn btn-link small ms-auto" data-remove="' + l.id + '">Usuń</button></div></div></li>';
      }).join("") + "</ul>" +
        '<div class="d-flex justify-content-between fs-5 mb-3"><span>Razem</span><strong>' + formatPrice(total()) + "</strong></div>" +
        '<button class="btn btn-m-dark w-100" data-checkout>Przejdź do zamówienia</button>' +
        '<p class="small text-muted-m mt-2">Koszyk demonstracyjny — bez płatności online.</p>';
    }
    openPanel("Koszyk", html, "cart");
  }

  /* ---------- Kliknięcia (jeden nasłuch dla całej strony) ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-close],[data-open],[data-add],[data-qty],[data-remove],[data-checkout],[data-spot]");
    if (!t) return;
    if (t.hasAttribute("data-close")) return closePanel();
    if (t.hasAttribute("data-add")) return add(t.getAttribute("data-add"));
    if (t.hasAttribute("data-open")) { currentPanel = null; return openProduct(t.getAttribute("data-open")); }
    if (t.hasAttribute("data-qty")) {
      var id = t.getAttribute("data-qty");
      var l = items.filter(function (x) { return x.id === id; })[0];
      if (l) setQty(id, l.qty + Number(t.getAttribute("data-delta")));
      return openCart();
    }
    if (t.hasAttribute("data-remove")) { setQty(t.getAttribute("data-remove"), 0); return openCart(); }
    if (t.hasAttribute("data-checkout")) return notify("To wersja demonstracyjna — płatności nie są obsługiwane.");
    if (t.hasAttribute("data-spot")) {
      var tpl = document.getElementById("spot-" + t.getAttribute("data-spot"));
      if (tpl) openPanel(tpl.getAttribute("data-label"), tpl.innerHTML);
    }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePanel(); });

  if (cartBtn) cartBtn.addEventListener("click", openCart);
  updateCount();

  /* ---------- Menu mobilne ---------- */
  var toggler = $(".navbar-toggler");
  var menu = $("#m-menu");
  if (toggler && menu) {
    toggler.addEventListener("click", function () {
      var open = menu.classList.toggle("show");
      toggler.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ---------- Wyszukiwarka w nagłówku ---------- */
  var searchBtn = $('.m-icon-btn[aria-controls="m-search"]');
  if (searchBtn) {
    searchBtn.addEventListener("click", function () {
      var form = $("#m-search");
      if (form) { form.remove(); searchBtn.setAttribute("aria-expanded", "false"); return; }
      form = document.createElement("form");
      form.id = "m-search";
      form.setAttribute("role", "search");
      form.action = "ksiazki.html";
      form.className = "container-fluid px-3 px-lg-4 pb-3 d-flex gap-2";
      form.innerHTML = '<label for="m-search-input" class="visually-hidden">Szukaj tytułu lub autora</label>' +
        '<input id="m-search-input" name="q" class="form-control" placeholder="Tytuł lub autor…">' +
        '<button class="btn btn-m-dark" type="submit">Szukaj</button>';
      $("nav.m-nav").appendChild(form);
      searchBtn.setAttribute("aria-expanded", "true");
      $("#m-search-input").focus();
    });
  }

  /* ---------- Sklep: wyszukiwanie i filtry ---------- */
  var shopInput = $("#shop-q");
  if (shopInput) {
    var params = new URLSearchParams(location.search);
    var state = { q: params.get("q") || "", kat: params.get("kat") || "" };
    var filterBox = $(".m-filter");
    var filters = [{ id: "", label: "Wszystko" }, { id: "nowosci", label: "Nowości" }].concat(DATA.categories);
    var countEl = $('p[aria-live="polite"]', shopInput.closest("section"));
    var listWrap = document.createElement("div");
    // zastąp statyczną listę dynamiczną
    var oldGrid = countEl.nextElementSibling;
    oldGrid.replaceWith(listWrap);

    var render = function () {
      var query = state.q.trim().toLowerCase();
      var results = DATA.products.filter(function (p) {
        return state.kat === "nowosci" ? p.isNew : !state.kat || p.category === state.kat;
      }).filter(function (p) {
        return !query || (p.title + " " + p.author).toLowerCase().indexOf(query) !== -1;
      });
      filterBox.innerHTML = filters.map(function (f) {
        var on = state.kat === f.id;
        return '<button class="btn ' + (on ? "btn-m-dark" : "btn-m-line") + '" aria-pressed="' + on + '" data-kat="' + f.id + '">' + esc(f.label) + "</button>";
      }).join("");
      countEl.textContent = "Wyniki: " + results.length;
      listWrap.innerHTML = results.length === 0
        ? '<div class="py-5 text-center"><h2>Nic nie znaleźliśmy</h2><p class="text-muted-m">Spróbuj innego hasła albo wyczyść filtry.</p><button class="btn btn-m-dark" data-clear>Wyczyść filtry</button></div>'
        : '<div class="row g-4">' + results.map(function (p) { return '<div class="col-6 col-md-4 col-lg-3">' + productCard(p) + "</div>"; }).join("") + "</div>";
      var u = new URLSearchParams();
      if (state.q) u.set("q", state.q);
      if (state.kat) u.set("kat", state.kat);
      history.replaceState(null, "", location.pathname + (u.toString() ? "?" + u : ""));
    };
    shopInput.value = state.q;
    shopInput.addEventListener("input", function () { state.q = shopInput.value; render(); });
    filterBox.addEventListener("click", function (e) {
      var b = e.target.closest("[data-kat]");
      if (b) { state.kat = b.getAttribute("data-kat"); render(); }
    });
    listWrap.addEventListener("click", function (e) {
      if (e.target.closest("[data-clear]")) { state = { q: "", kat: "" }; shopInput.value = ""; render(); }
    });
    render();
  }

  /* ---------- Formularz kontaktowy ---------- */
  var contact = $("#contact-form");
  if (contact) {
    contact.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(contact);
      var name = String(fd.get("name") || "").trim();
      var email = String(fd.get("email") || "").trim();
      var message = String(fd.get("message") || "").trim();
      var box = $('[aria-live="polite"]', contact);
      if (!name || !/^\S+@\S+\.\S+$/.test(email) || message.length < 10) {
        box.innerHTML = '<p class="text-danger small">Uzupełnij imię, poprawny e-mail i wiadomość (min. 10 znaków).</p>';
        return;
      }
      box.innerHTML = '<p class="small" style="color:var(--m-olive)">Dziękujemy! To formularz demonstracyjny — wiadomość nie została faktycznie wysłana.</p>';
      contact.reset();
    });
  }
})();
