(() => {
  const LOGO = "https://kfc.az/_next/static/media/logo.ada03bf3.svg";
  const COLONEL = "https://kfc.az/_next/static/media/kfcLogo.0ef986cb.svg";
  const APP_BG = "https://kfc.az/_next/static/media/bgImage.3e1ec708.jpg";
  const RESEARCH = "https://kfc.az/_next/static/media/research.b18c9c0f.png";
  const PLAY = "https://kfc.az/GetItOnGooglePlay_Badge_Web_color_English.png";
  const APPLE = "https://kfc.az/Download_on_the_App_Store_Badge_US-UK_RGB_blk_092917.svg";
  const EMPTY_BASKET = "https://kfc.az/_next/static/media/emptyBasket.050b7be2.gif";
  const COURIER = "https://kfc.az/_next/static/media/courier.289c6799.gif";
  const CAREER_BANNER = "https://api.kfc.az/api/media/kfc-career/1600c135-475d-4d1d-b723-54b7053321b5.webp";

  const PROMO = { KFC10: 0.1, BUCKET15: 0.15, TAPWIN: 0.12, FRIEND5: 0.05 };
  const state = {
    drawer: false,
    cat: new URLSearchParams(location.search).get("cat") || "sandwiches",
    menuQuery: "",
    menuFilter: localStorage.getItem("kfc_filter") || "",
    branch: 0,
    query: "",
    slide: 0,
    toast: "",
    pay: "cash",
    delivery: localStorage.getItem("kfc_delivery") || "delivery",
    address: localStorage.getItem("kfc_address") || "",
    phone: localStorage.getItem("kfc_phone") || "",
    branchName: localStorage.getItem("kfc_branch") || "",
    note: "",
    coupon: localStorage.getItem("kfc_coupon") || "",
    couponDraft: "",
    productId: 0,
    productQty: 1,
    sauceId: 0,
    drinkId: 0,
    sideId: 0,
    noticeKey: "",
    noticeExtra: "",
    formError: "",
    sent: "",
    introPlayed: false,
    printedId: 0,
    printToken: 0,
    gameOpen: false,
    gameHits: 0,
    gameLeft: 0,
    gameWon: false,
    gameOver: false,
    confetti: false,
    installReady: false,
    user: null,
    favIds: [],
    overrides: {},
    orders: [],
    ready: false
  };
  let gameTimer = 0;
  let statusTimer = 0;
  let deferredInstall = null;

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      ...opts
    });
    let data = null;
    try { data = await res.json(); } catch { data = null; }
    if (!res.ok) {
      const err = new Error((data && (data.detail || data.message)) || res.statusText || "error");
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }
  async function refreshSession() {
    try {
      const data = await api("/api/auth/me");
      state.user = data.user || null;
    } catch {
      state.user = null;
    }
  }
  async function refreshOverrides() {
    try {
      const data = await api("/api/overrides");
      state.overrides = data.overrides || {};
    } catch {
      state.overrides = {};
    }
  }
  async function refreshFavs() {
    if (!state.user) { state.favIds = []; return; }
    try {
      const data = await api("/api/favorites");
      state.favIds = data.ids || [];
    } catch {
      state.favIds = [];
    }
  }
  async function refreshOrders() {
    if (!state.user) { state.orders = []; return; }
    try {
      const data = await api("/api/orders");
      state.orders = data.orders || [];
    } catch {
      state.orders = [];
    }
  }
  async function boot() {
    await Promise.all([refreshSession(), refreshOverrides()]);
    await Promise.all([refreshFavs(), refreshOrders()]);
    state.ready = true;
    render(false);
  }

  const ICONS = {
    sandwiches: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 9c1.5-3 14.5-3 16 0"/><path d="M4 12h16M5 12c.6 2.4 13.4 2.4 14 0"/><path d="M6 15h12"/></svg>',
    burgers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 9c1.2-3 12.8-3 14 0H5zM4 13h16M6 16c1 2 11 2 12 0"/></svg>',
    snacks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 7h10v3a5 5 0 0 1-10 0V7zM9 17h6"/></svg>',
    chicken: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 14c-3 0-4-3-3-5 2 0 3 1 4 2 1-3 4-5 7-4 1 2 0 4-1 5 2 1 3 3 2 5-3 1-6 0-9-3z"/></svg>',
    sauces: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 3h4v3H10zM9 6h6l1 4c.4 2-1 4-3 4h-2c-2 0-3.4-2-3-4l1-4zM11 14c0 3-1 5-2 7M13 14c0 3 1 5 2 7"/></svg>',
    desserts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 10h12l-1 9H7l-1-9zM8 10c0-3 8-3 8 0"/></svg>',
    drinks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 3h8l-1 8a3 3 0 0 1-6 0L8 3zM12 14v5M9 21h6"/></svg>',
    baskets: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 9h14l-1.2 10H6.2L5 9zM8 9l1.5-4h5L16 9"/></svg>',
    boxes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8l8-4 8 4-8 4-8-4zM4 8v8l8 4 8-4V8"/><path d="M12 12v8"/></svg>',
    combos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/></svg>'
  };

  const allergen = {
    az: "Əsas allergenlər: buğda (qlüten), süd, yumurta, soya, küncüt və xardal. Tərkib məhsula görə dəyişir. Ətraflı sual üçün *8888 nömrəsinə zəng edin.",
    en: "Main allergens: wheat (gluten), milk, egg, soy, sesame and mustard. The exact list depends on the item. Call *8888 if you need a detail.",
    ru: "Основные аллергены: пшеница (глютен), молоко, яйцо, соя, кунжут и горчица. Состав зависит от блюда. За подробностями звоните на *8888."
  };

  function lang() { return localStorage.getItem("kfc_lang") || "az"; }
  function theme() { return localStorage.getItem("kfc_theme") === "dark" ? "dark" : "light"; }
  function applyTheme() {
    document.documentElement.classList.toggle("theme-dark", theme() === "dark");
  }
  applyTheme();
  function t(path) {
    const read = (root) => path.split(".").reduce((node, key) => (node ? node[key] : undefined), root);
    const value = read(window.I18N[lang()]);
    if (value == null) return read(window.I18N.az) ?? path;
    return value;
  }
  function pack() { return window.CONTENT[lang()] || window.CONTENT.az; }
  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }
  function img(src) {
    if (!src) return "";
    return String(src).startsWith("http") ? src : "https://api.kfc.az" + src;
  }
  function money(n) { return Number(n).toFixed(2) + " ₼"; }
  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "") ?? fallback; } catch { return fallback; }
  }
  function cart() { return read("kfc_cart", []); }
  function saveCart(items) { localStorage.setItem("kfc_cart", JSON.stringify(items)); }
  function session() { return state.user; }
  function productById(id) {
    const num = Number(id);
    let found = null;
    for (const category of window.CATALOG) {
      found = category.products.find((item) => item.id === num);
      if (found) break;
    }
    if (!found) return null;
    const over = state.overrides[num] || state.overrides[String(num)];
    if (!over) return found;
    return {
      ...found,
      price: over.price != null ? Number(over.price) : found.price,
      featured: over.featured != null ? !!over.featured : !!found.featured,
      hidden: !!over.hidden,
      soldOut: !!over.soldOut
    };
  }
  function categoryOf(id) {
    const num = Number(id);
    return window.CATALOG.find((category) => category.products.some((item) => item.id === num)) || null;
  }
  function picks(key, limit) {
    const category = window.CATALOG.find((item) => item.key === key);
    if (!category) return [];
    return category.products
      .map((item) => productById(item.id))
      .filter((item) => item && !item.hidden && !item.soldOut)
      .slice(0, limit);
  }
  function myOrders() {
    return state.orders || [];
  }
  function total() {
    return cart().reduce((sum, row) => {
      const product = productById(row.id);
      return sum + (product ? product.price * row.qty : 0);
    }, 0);
  }
  function favs() { return state.favIds || []; }
  function isFav(id) { return favs().includes(Number(id)); }
  async function toggleFav(id) {
    if (!state.user) {
      state.toast = t("ui.needLogin");
      render(true);
      setTimeout(() => { state.toast = ""; document.querySelector(".toast")?.remove(); }, 1800);
      return;
    }
    const num = Number(id);
    try {
      if (isFav(num)) {
        const data = await api("/api/favorites/" + num, { method: "DELETE" });
        state.favIds = data.ids || [];
      } else {
        const data = await api("/api/favorites", { method: "POST", body: JSON.stringify({ product_id: num }) });
        state.favIds = data.ids || [];
      }
    } catch {
      state.toast = t("ui.err");
    }
    render(true);
  }
  function discountRate() {
    const code = String(state.coupon || "").trim().toUpperCase();
    return PROMO[code] || 0;
  }
  function discountAmt() {
    return +(total() * discountRate()).toFixed(2);
  }
  function grandTotal() {
    return Math.max(0, +(total() - discountAmt()).toFixed(2));
  }
  function tagsOf(product) {
    const blob = (product.name + " " + (product.description || "")).toLowerCase();
    const cat = categoryOf(product.id);
    const key = cat ? cat.key : "";
    const tags = [];
    if (/acıl|acı\b|spicy|hot|zinger|buffalo|acika/.test(blob)) tags.push("spicy");
    if (/veget|vegetarian|koulslou|qarğıdalı|qargidali/.test(blob) || key === "desserts" || key === "drinks" || key === "sauces") tags.push("veg");
    if (product.price <= 4.5 || /koulslou|qarğıdalı|i-tvister|kiçik fri|kicik fri/.test(blob) || key === "sauces") tags.push("light");
    return tags;
  }
  function kcalOf(product) {
    const cat = categoryOf(product.id);
    const base = ({ sandwiches: 420, burgers: 480, snacks: 260, chicken: 360, sauces: 40, desserts: 320, drinks: 140, baskets: 720, boxes: 680, combos: 780 })[cat ? cat.key : ""] || 350;
    return Math.round(base + product.price * 18);
  }
  function syncOrderStatuses() { /* server-side */ }
  function trackSteps(order) {
    const delivery = order.delivery !== "pickup";
    const status = order.status || "new";
    const steps = [
      { key: "new", label: t("ui.trackPrep") },
      { key: "preparing", label: t("ui.trackCook") },
      delivery ? { key: "onway", label: t("ui.trackWay") } : { key: "ready", label: t("ui.statusReady") },
      { key: "done", label: t("ui.trackDone") }
    ];
    const rank = { new: 0, preparing: 1, ready: delivery ? 1 : 2, onway: 2, done: 3 };
    const current = rank[status] ?? 0;
    return steps.map((step, index) => ({
      ...step,
      on: index <= current,
      live: index === current
    }));
  }
  function dailyCombo() {
    const combos = window.CATALOG.find((item) => item.key === "combos");
    const boxes = window.CATALOG.find((item) => item.key === "boxes");
    const pool = []
      .concat(combos ? combos.products : [])
      .concat(boxes ? boxes.products : [])
      .map((item) => productById(item.id))
      .filter((item) => item && !item.hidden && !item.soldOut);
    if (!pool.length) return null;
    const hour = new Date().getHours();
    const day = new Date().getDate();
    return pool[(hour + day) % pool.length];
  }
  function confettiLayer() {
    if (!state.confetti) return "";
    const bits = Array.from({ length: 42 }, (_, i) => {
      const left = (i * 17 + 7) % 100;
      const delay = ((i * 37) % 80) / 100;
      const color = i % 3 === 0 ? "#e6002a" : i % 3 === 1 ? "#fff" : "#202124";
      return `<i style="left:${left}%;animation-delay:${delay}s;background:${color}"></i>`;
    }).join("");
    return `<div class="confetti" aria-hidden="true">${bits}</div>`;
  }
  function gameModal() {
    if (!state.gameOpen) return "";
    const msg = state.gameWon ? t("ui.gameWin") : state.gameOver ? t("ui.gameLose") : t("ui.gameLead");
    const bucketX = 12 + ((state.gameHits * 37) % 70);
    return `<div class="modal-layer game-layer">
      <div class="backdrop" data-act="close-game"></div>
      <div class="game-modal" role="dialog" aria-modal="true">
        <button class="modal-x" type="button" data-act="close-game" aria-label="Close">✕</button>
        <h2>${esc(t("ui.game"))}</h2>
        <p>${esc(msg)}</p>
        <div class="game-meta"><span>${state.gameHits} ${esc(t("ui.gameHits"))}</span><span>${(state.gameLeft / 1000).toFixed(1)}s</span></div>
        <div class="game-arena">
          ${state.gameOver || state.gameWon
            ? `<button class="btn-red" type="button" data-act="game-start">${esc(t("ui.gameAgain"))}</button>`
            : `<button class="bucket-btn" type="button" data-act="game-hit" style="left:${bucketX}%"><span>KFC</span></button>`}
        </div>
      </div>
    </div>`;
  }
  function installBanner() {
    if (!state.installReady || localStorage.getItem("kfc_pwa_hide")) return "";
    return `<aside class="install-banner">
      <div><strong>${esc(t("ui.installApp"))}</strong><span>${esc(t("ui.installLead"))}</span></div>
      <button class="btn-red" type="button" data-act="install">${esc(t("ui.installDone"))}</button>
      <button class="texty" type="button" data-act="install-hide">✕</button>
    </aside>`;
  }
  async function applyCoupon(code) {
    const clean = String(code || "").trim().toUpperCase();
    try {
      const data = await api("/api/promo/validate", { method: "POST", body: JSON.stringify({ code: clean }) });
      state.coupon = data.code;
      localStorage.setItem("kfc_coupon", data.code);
      state.noticeKey = "ui.couponOk";
      state.noticeExtra = Math.round(data.rate * 100) + "% " + t("ui.couponOff");
      return true;
    } catch {
      state.noticeKey = "ui.couponBad";
      state.noticeExtra = "";
      return false;
    }
  }
  function startGame() {
    clearInterval(gameTimer);
    state.gameOpen = true;
    state.gameHits = 0;
    state.gameLeft = 3000;
    state.gameWon = false;
    state.gameOver = false;
    render(true);
    const started = Date.now();
    gameTimer = setInterval(() => {
      state.gameLeft = Math.max(0, 3000 - (Date.now() - started));
      if (state.gameLeft <= 0) {
        clearInterval(gameTimer);
        state.gameOver = !state.gameWon;
        render(true);
        return;
      }
      const meta = document.querySelector(".game-meta span:last-child");
      if (meta) meta.textContent = (state.gameLeft / 1000).toFixed(1) + "s";
    }, 80);
  }
  async function hitGame() {
    if (state.gameOver || state.gameWon || !state.gameOpen) return;
    state.gameHits += 1;
    if (state.gameHits >= 5) {
      clearInterval(gameTimer);
      state.gameWon = true;
      try {
        if (state.user) await api("/api/promo/grant-tapwin", { method: "POST", body: "{}" });
        state.coupon = "TAPWIN";
        localStorage.setItem("kfc_coupon", "TAPWIN");
        state.toast = t("ui.gameWin");
      } catch {
        state.toast = t("ui.needLogin");
      }
    }
    render(true);
    setTimeout(() => { state.toast = ""; const node = document.querySelector(".toast"); if (node) node.remove(); }, 2200);
  }
  function launchConfetti() {
    state.confetti = true;
    setTimeout(() => {
      state.confetti = false;
      const node = document.querySelector(".confetti");
      if (node) node.remove();
    }, 2600);
  }
  function haversine(aLat, aLng, bLat, bLng) {
    const toRad = (n) => n * Math.PI / 180;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }
  function pinMap(selectedIndex) {
    const pins = window.BRANCHES.map((item, index) => {
      if (!item.lat || !item.lng) return "";
      const x = ((item.lng - 49.65) / 0.55) * 100;
      const y = ((40.65 - item.lat) / 0.35) * 100;
      if (x < 0 || x > 100 || y < 0 || y > 100) return "";
      return `<button type="button" class="map-pin${index === selectedIndex ? " on" : ""}" style="left:${x}%;top:${y}%" data-act="branch" data-i="${index}" title="${esc(item.name)}"></button>`;
    }).join("");
    return `<div class="pin-map" aria-label="${esc(t("ui.mapPins"))}"><div class="pin-map-grid"></div>${pins}</div>`;
  }

  let slideTimer;
  function render(keepScroll) {
    syncOrderStatuses();
    const y = keepScroll ? window.scrollY : 0;
    const page = document.body.dataset.page || "home";
    document.body.className = page === "home" ? "is-home" : "";
    applyTheme();
    document.documentElement.lang = lang() === "az" ? "az" : lang();
    document.title = t("titles." + page);
    document.getElementById("root").innerHTML = [
      header(),
      main(page),
      footer(),
      cookieBar(),
      installBanner(),
      state.drawer ? backdrop() + drawer() : "",
      state.productId ? productModal() : "",
      gameModal(),
      confettiLayer(),
      state.toast ? `<div class="toast">${esc(state.toast)}</div>` : "",
      kitchenTape(),
      courierCard(),
      `<button class="scroll-top" type="button" data-act="top" aria-label="Top" hidden>
         <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 14.5 12 8l6 6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
       </button>`
    ].join("");
    if (page === "home") armSlider();
    if (!state.introPlayed) {
      state.introPlayed = true;
      armIntro();
    }
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      if (document.body.dataset.page === "orders" && state.user) {
        refreshOrders().then(() => render(true));
      }
    }, 8000);
    window.scrollTo(0, y);
    syncHeader();
    syncScrollTop();
  }

  function syncHeader() {
    const header = document.querySelector(".header");
    if (!header) return;
    header.classList.toggle("is-solid", document.body.classList.contains("is-home") && window.scrollY > 48);
  }

  function syncScrollTop() {
    const button = document.querySelector(".scroll-top");
    if (!button) return;
    button.hidden = window.scrollY < 320;
  }

  function header() {
    const user = session();
    const slug = (location.pathname.split("/").pop() || "").toLowerCase().replace(/\.html$/, "");
    const here = !slug || slug === "index" ? "/" : "/" + slug;
    const link = (href, label, extra) => `<a class="${extra || ""}${here === href.split("#")[0] ? " on" : ""}" href="${href}">${esc(label)}</a>`;
    const account = user
      ? `<a class="user-chip" href="/orders">${esc(user.name.split(" ")[0])}</a>`
      : link("/login", t("nav.login"), "hide-sm");
    const count = cart().reduce((sum, row) => sum + row.qty, 0);
    return `<header class="header">
      <a class="logo" href="/"><img src="${LOGO}" alt="KFC"></a>
      <nav class="nav">
        ${link("/career", t("nav.career"), "hide-sm")}
        ${link("/offers", t("nav.offers"), "hide-sm")}
        ${link("/menu", t("nav.menu"), "hide-sm")}
        ${link("/favorites", t("ui.favorites"), "hide-sm")}
        <a class="btn-order" href="/menu">${esc(t("nav.order"))}</a>
        ${account}
        <div class="lang-switch" role="group" aria-label="Language">
          ${["az", "en", "ru"].map((code) => `<button type="button" data-act="lang" data-lang="${code}" class="${lang() === code ? "on" : ""}">${code.toUpperCase()}</button>`).join("")}
        </div>
        <button class="theme-btn icon-btn${theme() === "dark" ? " is-sun" : " is-moon"}" type="button" data-act="theme" aria-label="${theme() === "dark" ? "Light" : "Dark"}" title="${theme() === "dark" ? "Gündüz" : "Gecə"}">
          ${theme() === "dark"
            ? `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><path fill="currentColor" d="M12 2.2a1 1 0 0 1 1 1V5a1 1 0 1 1-2 0V3.2a1 1 0 0 1 1-1zm0 14.8a1 1 0 0 1 1 1v1.8a1 1 0 1 1-2 0V18a1 1 0 0 1 1-1zM3.2 11a1 1 0 0 1 1-1H6a1 1 0 1 1 0 2H4.2a1 1 0 0 1-1-1zm14.8 0a1 1 0 0 1 1-1H21a1 1 0 1 1 0 2h-1.8a1 1 0 0 1-1-1zM5.64 5.64a1 1 0 0 1 1.41 0l1.27 1.27a1 1 0 0 1-1.41 1.41L5.64 7.05a1 1 0 0 1 0-1.41zm10.04 10.04a1 1 0 0 1 1.41 0l1.27 1.27a1 1 0 1 1-1.41 1.41l-1.27-1.27a1 1 0 0 1 0-1.41zM18.36 5.64a1 1 0 0 1 0 1.41l-1.27 1.27a1 1 0 1 1-1.41-1.41l1.27-1.27a1 1 0 0 1 1.41 0zM8.32 15.68a1 1 0 0 1 0 1.41L7.05 18.36a1 1 0 1 1-1.41-1.41l1.27-1.27a1 1 0 0 1 1.41 0z"/></svg>`
            : `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M21.2 14.1A8.8 8.8 0 0 1 9.9 2.8 8.9 8.9 0 1 0 21.2 14.1z"/></svg>`}
        </button>
        <button class="icon-btn bag" type="button" data-act="drawer" aria-label="Menu">
          <svg width="22" height="16" viewBox="0 0 22 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1h20M1 8h20M1 15h20"/></svg>
          ${count ? `<span class="badge">${count}</span>` : ""}
        </button>
      </nav>
    </header>`;
  }

  function footer() {
    const user = session();
    const accountLinks = user
      ? `<a href="/orders">${esc(user.name)}</a><a href="/orders">${esc(t("ui.myOrders"))}</a><a href="/favorites">${esc(t("ui.favorites"))}</a><button class="texty" type="button" data-act="logout" style="color:#212529;font-size:13.6px;padding:0">${esc(t("drawer.out"))}</button>`
      : `<a href="/login">${esc(t("drawer.in"))}</a><a href="/register">${esc(t("drawer.up"))}</a>`;
    return `<footer class="footer">
      <div class="footer-grid">
        <div class="foot-brand">
          <img class="foot-logo" src="${COLONEL}" alt="KFC">
          <a class="phone" href="tel:*8888">${esc(t("ui.phoneLine"))}</a>
        </div>
        <div>
          <h3>${esc(t("ui.info"))}</h3>
          <a href="/">${esc(t("ui.home"))}</a>
          <a href="/menu">${esc(t("nav.menu"))}</a>
          <a href="/favorites">${esc(t("ui.favorites"))}</a>
          <a href="/about">${esc(t("drawer.about"))}</a>
          <a href="/ingredients">${esc(t("drawer.ing"))}</a>
          <a href="/terms">${esc(t("ui.terms"))}</a>
          <a href="/privacy">${esc(t("ui.privacy"))}</a>
          <a href="https://kfc.az/kfc_allergens.pdf" target="_blank" rel="noreferrer">${esc(t("ui.allergens"))}</a>
        </div>
        <div>
          <h3>${esc(t("drawer.help"))}</h3>
          <a href="/contact">${esc(t("drawer.contact"))}</a>
          <a href="/career">${esc(t("nav.career"))}</a>
          <a href="/branches">${esc(t("drawer.branches"))}</a>
        </div>
        <div>
          <h3>${esc(t("drawer.account"))}</h3>
          ${accountLinks}
          <a href="/admin">Admin</a>
        </div>
        <div>
          <h3>${esc(t("ui.follow"))}</h3>
          <div class="socials">
            <a href="https://www.instagram.com/kfc.az/" target="_blank" rel="noreferrer" aria-label="Instagram"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 4.5A4.5 4.5 0 1 0 16.5 12 4.5 4.5 0 0 0 12 7.5zm6.2-.9a1.1 1.1 0 1 0 1.1 1.1 1.1 1.1 0 0 0-1.1-1.1zM12 9.2A2.8 2.8 0 1 1 9.2 12 2.8 2.8 0 0 1 12 9.2z"/></svg></a>
            <a href="https://www.facebook.com/KFC.AZ" target="_blank" rel="noreferrer" aria-label="Facebook"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1z"/></svg></a>
            <a href="https://www.linkedin.com/showcase/kfc-azerbaijan/" target="_blank" rel="noreferrer" aria-label="LinkedIn"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6.5 9H4v11h2.5zM5.2 4A1.6 1.6 0 1 0 5.2 7.2 1.6 1.6 0 0 0 5.2 4zM20 13.4c0-2.6-1.4-4.4-3.8-4.4a3.3 3.3 0 0 0-3 1.6h-.1V9H10.6c0 1.4 0 11 0 11H13v-6.1c0-.3 0-.7.1-1 .3-.7.9-1.4 2-1.4 1.4 0 2 1.1 2 2.7V20H20z"/></svg></a>
          </div>
          <div class="stores">
            <img src="${PLAY}" alt="Google Play" width="150" height="44">
            <img src="${APPLE}" alt="App Store" width="150" height="50">
          </div>
        </div>
      </div>
      <div class="copy"><span>${esc(t("ui.rights"))}</span><span>${esc(t("ui.company"))}</span></div>
    </footer>`;
  }

  function cookieBar() {
    if (localStorage.getItem("kfc_cookie")) return "";
    return `<div class="cookie">
      <div>${esc(t("ui.cookie"))} <a href="/privacy">${esc(t("ui.privacy"))}</a>.</div>
      <div class="actions">
        <button class="ghost" type="button" data-act="cookie" data-val="no">${esc(t("ui.decline"))}</button>
        <button class="ok" type="button" data-act="cookie" data-val="yes">${esc(t("ui.accept"))}</button>
      </div>
    </div>`;
  }

  function branchOpen(item) {
    if (item.allDay) return true;
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const [oh, om] = item.open.split(":").map(Number);
    const [ch, cm] = item.close.split(":").map(Number);
    const open = oh * 60 + om;
    const close = ch * 60 + cm;
    if (close <= open) return cur >= open || cur < close;
    return cur >= open && cur < close;
  }

  function openNowLabel() {
    const count = window.BRANCHES.filter(branchOpen).length;
    const copy = {
      az: `İndi ${count} restoran açıqdır`,
      en: `${count} restaurants are open now`,
      ru: `Сейчас открыто ${count} ресторанов`
    };
    return copy[lang()] || copy.az;
  }

  function courierCard() {
    const order = (state.orders || []).find((item) => item.status !== "done" && item.status !== "cancelled");
    if (!order || sessionStorage.getItem("kfc_courier_hide") === order.number) return "";
    const statusMap = {
      new: t("ui.statusNew"),
      preparing: t("ui.statusPreparing"),
      ready: t("ui.statusReady"),
      onway: t("ui.statusOnWay"),
      done: t("ui.statusDone")
    };
    const copy = {
      az: { win: "Pəncərə", close: "Bağla" },
      en: { win: "Window", close: "Close" },
      ru: { win: "Окно", close: "Закрыть" }
    }[lang()] || { win: "Pəncərə", close: "Bağla" };
    const windowNo = (Number(String(order.number).replace(/\D/g, "")) % 6) + 1;
    return `<aside class="courier">
      <img src="${COURIER}" alt="">
      <span><b>${esc(order.number)}</b><em>${esc(statusMap[order.status] || statusMap.new)}</em><small>${esc(copy.win)} ${windowNo}</small></span>
      <a class="courier-link" href="/orders">${esc(t("ui.track"))}</a>
      <button type="button" data-act="courier" aria-label="${esc(copy.close)}">×</button>
    </aside>`;
  }

  function kitchenTape() {
    const rows = cart().map((row) => ({ row, product: productById(row.id) })).filter((item) => item.product);
    if (!rows.length) return "";
    const copy = {
      az: { head: "Mətbəx lenti", heat: "çıxış 85°" },
      en: { head: "Kitchen tape", heat: "out 85°" },
      ru: { head: "Лента кухни", heat: "выход 85°" }
    }[lang()] || { head: "Mətbəx lenti", heat: "çıxış 85°" };
    const lines = rows.map(({ row, product }) => `<p class="${product.id === state.printedId ? "fresh" : ""}"><b>${esc(product.name)}</b><span>×${row.qty}</span></p>`).join("");
    return `<button class="kds" type="button" data-act="drawer" aria-label="${esc(copy.head)}">
      <span class="kds-head"><span>${esc(copy.head)}</span><i></i></span>
      <span class="kds-paper">${lines}<em>${esc(copy.heat)}</em></span>
    </button>`;
  }

  function backdrop() { return `<div class="backdrop" data-act="close"></div>`; }

  function drawer() {
    const user = session();
    const rows = cart().map((row, index) => {
      const product = productById(row.id);
      if (!product) return "";
      return `<div class="cart-row">
        <img src="${esc(img(product.image))}" alt="">
        <div>
          <strong style="font-size:14px">${esc(product.name)}</strong>
          ${row.note ? `<small class="cart-note">${esc(row.note)}</small>` : ""}
          <div class="qty">
            <button type="button" data-act="qty" data-i="${index}" data-dir="-1">−</button>
            <span>${row.qty}</span>
            <button type="button" data-act="qty" data-i="${index}" data-dir="1">+</button>
          </div>
        </div>
        <div>
          <div style="font-size:14px;font-weight:700">${money(product.price * row.qty)}</div>
          <button class="texty" type="button" data-act="qty" data-i="${index}" data-dir="0" style="color:#e4002b;font-size:12px">${esc(t("drawer.remove"))}</button>
        </div>
      </div>`;
    }).join("");
    const account = user
      ? `<p style="margin:0;font-size:14px">${esc(t("ui.welcome"))}, <strong>${esc(user.name)}</strong></p>
         <a href="/orders">${esc(t("ui.myOrders"))}</a>
         <a href="/favorites">${esc(t("ui.favorites"))}</a>
         <button class="texty" type="button" data-act="logout">${esc(t("drawer.out"))}</button>`
      : `<a href="/login">${esc(t("drawer.in"))}</a><a href="/register">${esc(t("drawer.up"))}</a>`;
    const branchOpts = [`<option value="">${esc(t("ui.choose"))}</option>`]
      .concat(window.BRANCHES.map((item) => `<option value="${esc(item.name)}" ${state.branchName === item.name ? "selected" : ""}>${esc(item.name)}</option>`))
      .join("");
    const rate = discountRate();
    const checkout = cart().length
      ? `<div class="cart-total"><span>${esc(t("ui.subtotal"))}</span><span>${money(total())}</span></div>
         ${rate ? `<div class="cart-total is-disc"><span>${esc(t("ui.discount"))} (${Math.round(rate * 100)}%)</span><span>−${money(discountAmt())}</span></div>` : ""}
         <div class="cart-total"><span>${esc(t("drawer.total"))}</span><span>${money(grandTotal())}</span></div>
         <div class="coupon-row">
           <label class="field" style="flex:1;margin:0"><span>${esc(t("ui.coupon"))}</span><input id="co-coupon" value="${esc(state.couponDraft || state.coupon)}" placeholder="${esc(t("ui.couponPh"))}"></label>
           <button class="btn-red" type="button" data-act="coupon" style="align-self:end">${esc(t("ui.couponApply"))}</button>
         </div>
         <div class="delivery-switch" role="group">
           <button type="button" data-act="delivery" data-val="delivery" class="${state.delivery === "delivery" ? "on" : ""}">${esc(t("ui.delivery"))}</button>
           <button type="button" data-act="delivery" data-val="pickup" class="${state.delivery === "pickup" ? "on" : ""}">${esc(t("ui.pickup"))}</button>
         </div>
         <label class="field"><span>${esc(t("ui.restaurant"))}</span><select id="co-branch">${branchOpts}</select></label>
         ${state.delivery === "delivery" ? `<label class="field"><span>${esc(t("ui.address"))}</span><input id="co-address" value="${esc(state.address)}" placeholder="${esc(t("ui.addressPh"))}"></label>` : ""}
         <label class="field"><span>${esc(t("ui.phone"))}</span><input id="co-phone" value="${esc(state.phone || (user && user.phone) || "")}" placeholder="+994 ..."></label>
         <label class="field"><span>${esc(t("ui.orderNote"))}</span><input id="co-note" value="${esc(state.note)}" placeholder="${esc(t("ui.orderNotePh"))}"></label>
         <div class="field"><span>${esc(t("ui.pay"))}</span>
           <select id="pay">
             <option value="cash" ${state.pay === "cash" ? "selected" : ""}>${esc(t("ui.cash"))}</option>
             <option value="card" ${state.pay === "card" ? "selected" : ""}>${esc(t("ui.card"))}</option>
           </select>
         </div>
         ${state.noticeKey ? `<p class="note">${esc(t(state.noticeKey))}${state.noticeExtra ? " " + esc(state.noticeExtra) : ""}</p>` : ""}
         <button class="btn-red" type="button" data-act="checkout" style="width:100%">${esc(t("drawer.checkout"))}</button>
         <button class="ghost-link" type="button" data-act="open-game">${esc(t("ui.game"))}</button>`
      : `<div class="empty-basket"><img src="${EMPTY_BASKET}" alt=""><p class="empty">${esc(t("drawer.empty"))}</p></div>
         <button class="ghost-link" type="button" data-act="open-game">${esc(t("ui.game"))} — ${esc(t("ui.gameLead"))}</button>`;
    return `<aside class="drawer">
      <div class="drawer-head"><h3 style="margin:0;font-size:18px">${esc(t("drawer.order"))}</h3><button class="icon-btn" type="button" data-act="close" aria-label="Close">✕</button></div>
      ${rows || ""}
      ${checkout}
      <h4>${esc(t("drawer.account"))}</h4>
      ${account}
      <h4>${esc(t("drawer.menu"))}</h4>
      <a href="/menu">${esc(t("drawer.all"))}</a>
      <a href="/favorites">${esc(t("ui.favorites"))}</a>
      <a href="/offers">${esc(t("drawer.offers"))}</a>
      <h4>${esc(t("drawer.brand"))}</h4>
      <a href="/about">${esc(t("drawer.about"))}</a>
      <a href="/ingredients">${esc(t("drawer.ing"))}</a>
      <h4>${esc(t("drawer.help"))}</h4>
      <a href="/contact">${esc(t("drawer.contact"))}</a>
      <a href="/branches">${esc(t("drawer.branches"))}</a>
      <a href="/career">${esc(t("drawer.career"))}</a>
      <h4>${esc(t("drawer.lang"))}</h4>
      <div class="lang-row">
        ${["az", "en", "ru"].map((code) => `<button type="button" data-act="lang" data-lang="${code}" class="${lang() === code ? "on" : ""}">${code.toUpperCase()}</button>`).join("")}
      </div>
    </aside>`;
  }

  const STRIPE = '<div class="kfc-stripe" aria-hidden="true"><span></span><span class="soft"></span><span></span><span class="soft"></span><span></span></div>';
  const CHILI = '<span class="chili" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="#e6002a" d="M13.2 3.2c.6 1.5 2 2.4 3.5 2.3-.3 1-.2 2 .2 2.9 1.5.4 2.6 1.7 2.9 3.3 1.6 1 2.7 2.8 2.7 4.8 0 3.6-2.8 7.4-6.6 8.4-2.3.6-4.6.1-6.3-1.4C6.6 21.8 4.5 18.6 4.5 15c0-2.1 1-4 2.6-5.1.3-1.7 1.6-3.1 3.2-3.4.4-1 .5-2 .2-2.9.9-.2 1.8-.6 2.7-.4z"/><path fill="#2f9e44" d="M14 2.4c1.6-.8 3.5-.3 4.7.9-1 .2-1.9.8-2.5 1.6-.9-.7-1.7-1.6-2.2-2.5z"/></svg></span>';

  function card(product) {
    const spicy = /acıl|acı|spicy|hot/i.test(product.name);
    const sold = !!product.soldOut;
    const liked = isFav(product.id);
    return `<article class="pcard${sold ? " is-sold" : ""}" data-act="open" data-id="${product.id}">
      <div class="photo">
        <button class="fav-btn${liked ? " on" : ""}" type="button" data-act="fav" data-id="${product.id}" aria-label="${esc(liked ? t("ui.favRemove") : t("ui.favAdd"))}">${liked ? "♥" : "♡"}</button>
        ${spicy ? CHILI : ""}
        ${sold ? `<span class="sold-badge">${esc(t("ui.soldOut"))}</span>` : ""}
        <img src="${esc(img(product.image))}" alt="${esc(product.name)}" loading="lazy">
      </div>
      <div class="body">
        <h3>${esc(product.name)}</h3>
        <p>${esc(product.description || "")}</p>
        <div class="meta-row"><div class="price">${money(product.price)}</div><small class="kcal">${kcalOf(product)} ${esc(t("ui.kcal"))}</small></div>
        ${sold
          ? `<button class="btn-red is-disabled" type="button" disabled>${esc(t("ui.soldOut"))}</button>`
          : `<button class="btn-red" type="button" data-act="open" data-id="${product.id}">${esc(t("ui.orderBtn"))}</button>`}
      </div>
    </article>`;
  }

  function pickRow(label, items, selected, act) {
    if (!items.length) return "";
    return `<div class="pick-block">
      <h4>${esc(label)}</h4>
      <div class="pick-row">
        ${items.map((item) => `<button type="button" class="pick${selected === item.id ? " on" : ""}" data-act="${act}" data-id="${item.id}">
          <img src="${esc(img(item.image))}" alt="">
          <span>${esc(item.name)}</span>
        </button>`).join("")}
      </div>
    </div>`;
  }

  function productModal() {
    const product = productById(state.productId);
    if (!product || product.hidden) return "";
    const cat = categoryOf(product.id);
    const key = cat ? cat.key : "";
    const needsSauce = ["sandwiches", "burgers", "chicken", "boxes", "baskets"].includes(key);
    const needsCombo = ["combos", "boxes", "baskets"].includes(key);
    const sauces = needsSauce ? picks("sauces", 6) : [];
    const drinks = needsCombo ? picks("drinks", 6) : [];
    const sides = needsCombo ? picks("snacks", 6) : [];
    const sold = !!product.soldOut;
    return `<div class="modal-layer">
      <div class="backdrop" data-act="close-product"></div>
      <div class="product-modal" role="dialog" aria-modal="true">
        <button class="modal-x" type="button" data-act="close-product" aria-label="Close">✕</button>
        <div class="product-modal-grid">
          <div class="product-modal-media"><img src="${esc(img(product.image))}" alt="${esc(product.name)}"></div>
          <div class="product-modal-copy">
            <div class="modal-title-row">
              <h2>${esc(product.name)}</h2>
              <button class="fav-btn inline${isFav(product.id) ? " on" : ""}" type="button" data-act="fav" data-id="${product.id}" aria-label="${esc(isFav(product.id) ? t("ui.favRemove") : t("ui.favAdd"))}">${isFav(product.id) ? "♥" : "♡"}</button>
            </div>
            <p>${esc(product.description || t("ui.menuLead"))}</p>
            <div class="meta-row"><div class="price">${money(product.price)}</div><small class="kcal">${kcalOf(product)} ${esc(t("ui.kcal"))}</small></div>
            ${pickRow(t("ui.sauce"), sauces, state.sauceId, "sauce")}
            ${pickRow(t("ui.drink"), drinks, state.drinkId, "drink")}
            ${pickRow(t("ui.side"), sides, state.sideId, "side")}
            <div class="modal-actions">
              <div class="qty big">
                <button type="button" data-act="pqty" data-dir="-1">−</button>
                <span>${state.productQty}</span>
                <button type="button" data-act="pqty" data-dir="1">+</button>
              </div>
              ${sold
                ? `<button class="btn-red is-disabled" type="button" disabled>${esc(t("ui.soldOut"))}</button>`
                : `<button class="btn-red" type="button" data-act="add-configured">${esc(t("ui.addCart"))} · ${money(product.price * state.productQty)}</button>`}
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  function branchOptions() {
    return [`<option value="">${esc(t("ui.choose"))}</option>`]
      .concat(window.BRANCHES.map((item) => `<option value="${esc(item.name)}">${esc(item.name)}</option>`))
      .join("");
  }

  function main(page) {
    const pages = { home: home, menu: menu, offers: offers, about: about, contact: contact, branches: branches, career: career, ingredients: ingredients, login: login, register: register, terms: terms, privacy: privacy, orders: orders, favorites: favoritesPage };
    return (pages[page] || home)();
  }

  const CHEV_L = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M14.5 5.2 8 12l6.5 6.8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CHEV_R = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9.5 5.2 16 12l-6.5 6.8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function home() {
    const featured = window.CATALOG.flatMap((category) => category.products)
      .map((item) => productById(item.id))
      .filter((item) => item && item.featured && !item.hidden);
    const pick = dailyCombo();
    return `<section class="hero">
      <div class="hero-viewport">
        <div class="hero-track" style="transform:translateX(-${state.slide * 100}%)">
          ${window.SLIDES.map((src, index) => `<div class="hero-slide${index === state.slide ? " live" : ""}"><img src="${esc(src)}" alt="KFC"></div>`).join("")}
        </div>
        <div class="hero-progress run"></div>
        <button class="hero-btn prev" type="button" data-act="prev" aria-label="Previous">${CHEV_L}</button>
        <button class="hero-btn next" type="button" data-act="next" aria-label="Next">${CHEV_R}</button>
        <div class="hero-bars">
          ${window.SLIDES.map((_, index) => `<button type="button" data-act="slide" data-i="${index}" class="${index === state.slide ? "on" : ""}" aria-label="Slide ${index + 1}"></button>`).join("")}
        </div>
      </div>
    </section>
    ${pick ? `<section class="daily-band">
      <div class="daily-copy">
        <p class="eyebrow">${esc(t("ui.dailyPick"))}</p>
        <h2>${esc(pick.name)}</h2>
        <p>${esc(t("ui.dailyLead"))}</p>
        <div class="daily-actions">
          <button class="btn-red" type="button" data-act="open" data-id="${pick.id}">${esc(t("ui.orderBtn"))} · ${money(pick.price)}</button>
          <button class="ghost-btn" type="button" data-act="open-game">${esc(t("ui.game"))}</button>
        </div>
      </div>
      <button class="daily-shot" type="button" data-act="open" data-id="${pick.id}">
        <img src="${esc(img(pick.image))}" alt="${esc(pick.name)}">
      </button>
    </section>` : ""}
    <section class="offers-band">
      <div class="offers-head">
        <h2>${esc(t("ui.offers"))}</h2>
        <a class="open-now" href="/branches"><i></i>${esc(openNowLabel())}</a>
      </div>
      <div class="offer-row">${featured.map((item) => `<a class="offer-shot" href="/offers"><img src="${esc(img(item.image))}" alt="${esc(item.name)}"></a>`).join("")}</div>
    </section>
    <section class="story-band">
      <div class="story-photo" style="background-image:url('${APP_BG}')"></div>
      <div class="story-overlay">
        <div class="story-box">
          <h2>${esc(t("ui.aboutTitle"))}</h2>
          <p>${esc(t("story"))}</p>
        </div>
      </div>
    </section>
    <section class="home-bottom">
      <article class="join-card">
        <div>
          <h2>${esc(t("ui.appTitle"))}</h2>
          <p>${esc(t("ui.appText"))}</p>
          <a class="btn-red" href="/career">${esc(t("ui.more"))}</a>
        </div>
        <img src="${RESEARCH}" alt="KFC">
      </article>
      <article class="feedback-card">
        <h2>${esc(t("ui.feedback"))}</h2>
        ${state.sent === "feedback" ? `<p class="note">${esc(t("ui.sent"))}</p>` : `<form data-form="feedback">
          <label class="field"><span>${esc(t("ui.restaurant"))}</span><select name="restaurant" required>${branchOptions()}</select></label>
          <label class="field"><span>${esc(t("ui.text"))}</span><textarea id="fb" name="text" maxlength="500" required placeholder="${esc(t("ui.textPh"))}"></textarea></label>
          <div class="row-between"><span class="counter" id="count">0/500</span><button class="btn-red" id="fb-send" type="submit" disabled>${esc(t("ui.send"))}</button></div>
        </form>`}
      </article>
    </section>`;
  }

  function menuWords() {
    return {
      az: { count: "məhsul", search: "Məhsul axtar", empty: "Bu axtarışa uyğun məhsul yoxdur." },
      en: { count: "items", search: "Search the menu", empty: "No items match this search." },
      ru: { count: "блюд", search: "Поиск по меню", empty: "Ничего не найдено." }
    }[lang()] || { count: "məhsul", search: "Məhsul axtar", empty: "Bu axtarışa uyğun məhsul yoxdur." };
  }

  function menuItems(category) {
    const query = state.menuQuery.trim().toLowerCase();
    const filter = state.menuFilter;
    return category.products
      .map((item) => productById(item.id))
      .filter((item) => item && !item.hidden)
      .filter((item) => !query || (item.name + " " + item.description).toLowerCase().includes(query))
      .filter((item) => !filter || tagsOf(item).includes(filter));
  }

  function menu() {
    const current = window.CATALOG.find((category) => category.key === state.cat) || window.CATALOG[0];
    const words = menuWords();
    const items = menuItems(current);
    const filters = [
      ["", t("ui.filterAll")],
      ["spicy", t("ui.filterSpicy")],
      ["veg", t("ui.filterVeg")],
      ["light", t("ui.filterLight")]
    ];
    return `<div class="layout menu-page">
      <aside class="side">
        ${window.CATALOG.map((category) => {
          const thumb = category.products.find((p) => p.image)?.image;
          const mark = thumb
            ? `<img src="${esc(img(thumb))}" alt="" loading="lazy" decoding="async">`
            : (ICONS[category.key] || "");
          return `<button type="button" data-act="cat" data-cat="${category.key}" class="${category.key === current.key ? "on" : ""}"><span class="bubble">${mark}</span><span>${esc(t("cats." + category.key))}</span><em>${category.products.length}</em></button>`;
        }).join("")}
      </aside>
      <div class="menu-wrap catalog">
        <div class="menu-head">
          <div>
            ${STRIPE}
            <h1>${esc(t("cats." + current.key))}</h1>
            <p id="menu-count">${menuItems(current).length} ${esc(words.count)}</p>
          </div>
          <input class="search" id="menu-q" value="${esc(state.menuQuery)}" placeholder="${esc(words.search)}">
        </div>
        <div class="filter-row" role="group">
          ${filters.map(([key, label]) => `<button type="button" data-act="filter" data-val="${key}" class="${state.menuFilter === key ? "on" : ""}">${esc(label)}</button>`).join("")}
        </div>
        <div class="card-grid menu-grid" id="menu-grid">${items.length ? items.map(card).join("") : `<p class="empty">${esc(words.empty)}</p>`}</div>
      </div>
    </div>`;
  }

  function favoritesPage() {
    const ids = favs();
    const items = ids.map((id) => productById(id)).filter((item) => item && !item.hidden);
    return `<section class="page catalog">
      ${STRIPE}
      <h1 class="page-title">${esc(t("ui.favorites"))}</h1>
      <p class="lead">${esc(t("ui.favLead"))}</p>
      <div class="card-grid menu-grid" style="margin-top:22px">${items.length ? items.map(card).join("") : `<p class="empty">${esc(t("ui.favEmpty"))}</p>`}</div>
    </section>`;
  }

  function offers() {
    const items = window.CATALOG.filter((category) => category.key === "combos" || category.key === "boxes")
      .flatMap((category) => category.products)
      .map((item) => productById(item.id))
      .filter((item) => item && !item.hidden);
    return `<section class="page catalog offers-catalog">
      ${STRIPE}
      <h1 class="page-title">${esc(t("ui.offers"))}</h1>
      <p class="lead">${esc(t("ui.offersLead"))}</p>
      <div class="card-grid menu-grid" style="margin-top:22px">${items.map(card).join("")}</div>
    </section>`;
  }

  function about() {
    const events = pack().timeline.map((item, index) => `<article class="year${index % 2 ? " year-alt" : ""}">
      <div class="year-card">
        <img src="${esc(img(item.image))}" alt="">
        <div><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div>
      </div>
      <div class="year-mark"><span>${esc(item.year)}</span></div>
    </article>`).join("");
    return `<section class="page">
      ${STRIPE}
      <h1 class="page-title">${esc(t("about.title"))}</h1>
      <p class="lead">${esc(t("about.lead"))}</p>
      <div class="timeline">${events}</div>
    </section>`;
  }

  function orders() {
    const user = session();
    if (!user) {
      return `<section class="page">
        ${STRIPE}
        <h1 class="page-title">${esc(t("ui.myOrders"))}</h1>
        <p class="lead">${esc(t("ui.needLogin"))}</p>
        <a class="btn-red" href="/login">${esc(t("drawer.in"))}</a>
      </section>`;
    }
    const list = myOrders();
    const statusMap = {
      new: t("ui.statusNew"),
      preparing: t("ui.statusPreparing"),
      ready: t("ui.statusReady"),
      onway: t("ui.statusOnWay"),
      done: t("ui.statusDone"),
      cancelled: t("ui.statusCancelled")
    };
    const cards = list.length
      ? list.map((order) => {
          const lines = (order.items || []).map((row) => {
            const product = productById(row.id);
            return `<li><span>${esc(product ? product.name : "#" + row.id)}${row.note ? ` <em>(${esc(row.note)})</em>` : ""}</span><strong>×${row.qty}</strong></li>`;
          }).join("");
          const when = order.at ? new Date(order.at).toLocaleString(lang() === "ru" ? "ru-RU" : lang() === "en" ? "en-GB" : "az-AZ") : "";
          const steps = trackSteps(order).map((step) => `<li class="${step.on ? "on" : ""}${step.live ? " live" : ""}"><i></i><span>${esc(step.label)}</span></li>`).join("");
          return `<article class="order-card">
            <div class="order-card-top">
              <div><strong>${esc(order.number)}</strong><small>${esc(when)}</small></div>
              <span class="order-pill ${esc(order.status || "new")}">${esc(statusMap[order.status] || order.status || statusMap.new)}</span>
            </div>
            <ol class="track-line" aria-label="${esc(t("ui.track"))}">${steps}</ol>
            <ul>${lines}</ul>
            <div class="order-card-meta">
              <span>${esc(order.delivery === "pickup" ? t("ui.pickup") : t("ui.delivery"))}${order.branch ? " · " + esc(order.branch) : ""}${order.coupon ? " · " + esc(order.coupon) : ""}</span>
              <strong>${money(order.total || 0)}</strong>
            </div>
            ${order.address ? `<p class="order-address">${esc(order.address)}</p>` : ""}
            <button class="btn-red reorder-btn" type="button" data-act="reorder" data-no="${esc(order.number)}">${esc(t("ui.reorder"))}</button>
          </article>`;
        }).join("")
      : `<p class="empty">${esc(t("ui.noOrders"))}</p>`;
    return `<section class="page">
      ${STRIPE}
      <h1 class="page-title">${esc(t("ui.myOrders"))}</h1>
      <p class="lead">${esc(t("ui.ordersLead"))}</p>
      <div class="order-list">${cards}</div>
    </section>`;
  }

  function contact() {
    return `<section class="page">
      <div class="split">
        <div>
          ${STRIPE}
          <h1 class="page-title">${esc(t("drawer.contact"))}</h1>
          <p class="lead">${esc(t("ui.contactLead"))}</p>
          <p style="font-size:28px;font-weight:700;margin:8px 0 0"><a href="tel:*8888">${esc(t("ui.phoneLine"))}</a></p>
          <p style="font-size:15px;color:#444">OPTİMA GROUP CO.</p>
          ${state.sent === "contact" ? `<p class="note">${esc(t("ui.sent"))}</p>` : `<form data-form="contact">
            ${field("name", t("ui.name"))}
            ${field("phone", t("ui.phone"))}
            ${field("email", t("ui.email"), "email")}
            <label class="field"><span>${esc(t("ui.restaurant"))}</span><select name="restaurant" required>${branchOptions()}</select></label>
            <label class="field"><span>${esc(t("ui.msg"))}</span><textarea name="message" required maxlength="500"></textarea></label>
            ${state.formError ? `<p class="error">${esc(state.formError)}</p>` : ""}
            <button class="btn-red" type="submit">${esc(t("ui.send"))}</button>
          </form>`}
        </div>
        <div class="map-card">
          <iframe title="KFC" src="https://www.openstreetmap.org/export/embed.html?bbox=49.80,40.35,49.90,40.42&layer=mapnik&marker=40.37998,49.84934"></iframe>
          <div class="map-meta"><h2>KFC Dəmiryol Stansiyası</h2><p>Fikrət Əmirov 24</p><p>08:00 – 01:00</p></div>
        </div>
      </div>
    </section>`;
  }

  function field(name, label, type) {
    return `<label class="field"><span>${esc(label)}</span><input name="${name}" type="${type || "text"}" required></label>`;
  }

  function branches() {
    const query = state.query.trim().toLowerCase();
    const list = window.BRANCHES.map((item, index) => ({ item, index })).filter(({ item }) => {
      const blob = (item.name + " " + item.address).toLowerCase();
      return !query || blob.includes(query);
    });
    if (!list.some(({ index }) => index === state.branch) && list[0]) state.branch = list[0].index;
    const selected = window.BRANCHES[state.branch] || list[0]?.item;
    const items = list.map(({ item, index }) => `<button type="button" class="branch-item ${index === state.branch ? "on" : ""}" data-act="branch" data-i="${index}">
      <b>${esc(item.name)}</b>
      <span>${esc(item.address)}</span>
      <span>${item.allDay ? esc(t("ui.allday")) : esc(item.open + " – " + item.close)} · ${esc(t("ui.open"))}</span>
    </button>`).join("") || `<p class="empty" style="padding:16px">${esc(t("ui.noBranch"))}</p>`;
    const map = selected && selected.lat && selected.lng
      ? `<iframe title="${esc(selected.name)}" src="https://www.openstreetmap.org/export/embed.html?bbox=${selected.lng - 0.03}%2C${selected.lat - 0.02}%2C${selected.lng + 0.03}%2C${selected.lat + 0.02}&layer=mapnik&marker=${selected.lat}%2C${selected.lng}"></iframe>`
      : `<div style="height:220px;display:grid;place-items:center;color:#777">${esc(t("ui.map"))}</div>`;
    const hours = !selected ? "" : selected.allDay ? t("ui.allday") : `${selected.open} – ${selected.close}`;
    return `<section class="page">
      ${STRIPE}
      <h1 class="page-title">${esc(t("drawer.branches"))}</h1>
      <div class="branch-tools">
        <button class="btn-red" type="button" data-act="nearest">${esc(t("ui.nearest"))}</button>
        <p class="lead" style="margin:0">${esc(t("ui.mapPins"))}</p>
      </div>
      ${pinMap(state.branch)}
      <div class="branch-layout">
        <div>
          <input class="search" id="q" value="${esc(state.query)}" placeholder="${esc(t("ui.search"))}">
          <div class="branch-list" id="branch-list">${items}</div>
        </div>
        <article class="map-card">
          ${map}
          ${selected ? `<div class="map-meta">
            <h2>${esc(selected.name)}</h2>
            <p><strong>${esc(t("ui.address"))}:</strong> ${esc(selected.address)}</p>
            <p><strong>${esc(t("ui.hours"))}:</strong> ${esc(hours)}</p>
            <p><strong>${esc(t("ui.phone"))}:</strong> <a href="tel:${esc(selected.phone)}">${esc(selected.phone)}</a></p>
            <p style="color:#1b7f3a;font-weight:600">${esc(branchOpen(selected) ? t("ui.open") : "—")}</p>
            <button class="btn-red" type="button" data-act="pick-branch" data-name="${esc(selected.name)}">${esc(t("ui.choose"))}</button>
          </div>` : ""}
        </article>
      </div>
    </section>`;
  }

  function career() {
    const copy = t("career");
    const cards = pack().careerCards.map((item, index) => `<article class="career-row${index % 2 ? " alt" : ""}">
      <img src="${esc(img(item.image))}" alt="">
      <div><h3>${esc(item.title)}</h3>${item.points.length > 1 ? `<ul>${item.points.map((point) => `<li>${esc(point)}</li>`).join("")}</ul>` : `<p>${esc(item.points[0])}</p>`}</div>
    </article>`).join("");
    return `<div class="page-hero" style="background-image:linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.55)),url('${CAREER_BANNER}')"><h1>${esc(copy.t1)}</h1></div>
    <section class="page">
      <p class="lead">${esc(copy.d1)}</p>
      <h2 style="font-size:26px;margin:28px 0 8px">${esc(copy.t2)}</h2>
      <p class="lead">${esc(copy.d2)}</p>
      <div class="career-list">${cards}</div>
      <div style="max-width:640px;margin-top:28px">
        ${state.sent === "career" ? `<p class="note">${esc(t("ui.applied"))}</p>` : `<form data-form="career">
          ${field("name", t("ui.name"))}
          ${field("phone", t("ui.phone"))}
          ${field("email", t("ui.email"), "email")}
          ${field("position", t("ui.position"))}
          <label class="field"><span>${esc(t("ui.cv"))}</span><textarea name="note" required></textarea></label>
          ${state.formError ? `<p class="error">${esc(state.formError)}</p>` : ""}
          <button class="btn-red" type="submit">${esc(t("ui.apply"))}</button>
        </form>`}
      </div>
    </section>`;
  }

  function ingredients() {
    const heads = { az: "Bizim yeməklərimizi xüsusi edən nədir", en: "What makes our food special", ru: "Что делает нашу еду особенной" };
    const rows = pack().ingredients.map((item) => `<article class="ing">
      <div class="ing-photo"><img src="${esc(img(item.image))}" alt=""></div>
      <div class="ing-copy"><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div>
    </article>`).join("");
    return `<section class="page ing-page">
      <h1>${esc(heads[lang()] || heads.az)}</h1>
      <div class="ing-list">${rows}</div>
      <div id="allergens" style="margin-top:28px">
        <h2 style="font-size:22px">${esc(t("ui.allergens"))}</h2>
        <p class="lead">${esc(allergen[lang()] || allergen.az)}</p>
      </div>
    </section>`;
  }

  function authCard(mode) {
    const isLogin = mode === "login";
    return `<section class="auth-wrap"><div class="auth-card">
      <h1>${esc(t(isLogin ? "ui.loginTitle" : "ui.registerTitle"))}</h1>
      <p class="sub">${esc(t(isLogin ? "ui.loginSub" : "ui.registerSub"))}</p>
      ${session() ? `<p class="note">${esc(t("ui.welcome"))}, ${esc(session().name)}.</p><button class="btn-red" type="button" data-act="logout">${esc(t("drawer.out"))}</button>` : `<form data-form="${mode}">
        ${isLogin ? "" : field("name", t("ui.name"))}
        ${field("email", t("ui.email"), "email")}
        ${isLogin ? "" : field("phone", t("ui.phone"))}
        ${field("password", t("ui.password"), "password")}
        ${isLogin ? "" : field("password2", t("ui.password2"), "password")}
        ${state.formError ? `<p class="error">${esc(state.formError)}</p>` : ""}
        <button class="btn-red" type="submit">${esc(t(isLogin ? "nav.login" : "drawer.up"))}</button>
      </form>`}
      <p class="switch">${esc(t(isLogin ? "ui.noacc" : "ui.have"))} <a href="${isLogin ? "/register" : "/login"}">${esc(t(isLogin ? "drawer.up" : "drawer.in"))}</a></p>
    </div></section>`;
  }
  function login() { return authCard("login"); }
  function register() { return authCard("register"); }

  function legal(kind) {
    const blocks = t(kind).map(([title, text]) => `<h2>${esc(title)}</h2><p>${esc(text)}</p>`).join("");
    const heading = kind === "terms" ? t("ui.terms") : t("ui.privacy");
    return `<section class="page legal"><h1>${esc(heading)}</h1>${blocks}</section>`;
  }
  function terms() { return legal("terms"); }
  function privacy() { return legal("privacy"); }

  function goSlide(index) {
    const count = window.SLIDES.length;
    state.slide = (index + count) % count;
    const track = document.querySelector(".hero-track");
    if (track) track.style.transform = `translateX(-${state.slide * 100}%)`;
    document.querySelectorAll(".hero-slide").forEach((slide, item) => slide.classList.toggle("live", item === state.slide));
    document.querySelectorAll(".hero-bars button").forEach((button, item) => button.classList.toggle("on", item === state.slide));
    const bar = document.querySelector(".hero-progress");
    if (bar) {
      bar.classList.remove("run");
      void bar.offsetWidth;
      bar.classList.add("run");
    }
  }

  function armIntro() {
    if (document.querySelector(".intro")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const skip = { az: "Keç", en: "Skip", ru: "Пропустить" }[lang()] || "Keç";
    const node = document.createElement("div");
    node.className = "intro";
    node.innerHTML = `<div class="intro-panel top"></div><div class="intro-panel bottom"></div><div class="intro-ring"></div><div class="intro-mark"><img src="${COLONEL}" alt=""><strong>KFC</strong></div><button type="button" class="intro-skip">${esc(skip)}</button>`;
    document.body.classList.add("intro-lock");
    document.body.appendChild(node);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      node.classList.add("out");
      document.body.classList.remove("intro-lock");
      node.addEventListener("animationend", (event) => {
        if (event.target === node.querySelector(".intro-panel.top")) node.remove();
      });
    };
    node.addEventListener("click", close);
    setTimeout(close, 350);
    setTimeout(() => node.remove(), 860);
  }

  function armDepth() {
    const selector = ".pcard, .offer-shot, .ing, .year-card, .career-row, .join-card";
    const motion = window.matchMedia("(pointer: coarse), (prefers-reduced-motion: reduce)");
    let current = null;
    let pending = null;
    let frame = 0;
    const reset = (card) => {
      if (!card) return;
      card.classList.remove("is-down", "is-tilt");
      card.style.transform = "";
    };
    const paint = () => {
      frame = 0;
      const point = pending;
      pending = null;
      if (!point || motion.matches) return;
      const card = point.target.closest(selector);
      if (current && current !== card) reset(current);
      current = card;
      if (!card || card.classList.contains("is-down")) return;
      card.classList.add("is-tilt");
      const box = card.getBoundingClientRect();
      const x = (point.x - box.left) / box.width - 0.5;
      const y = (point.y - box.top) / box.height - 0.5;
      card.style.transform = `perspective(860px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 7).toFixed(2)}deg) translate3d(0,-6px,0)`;
    };
    document.addEventListener("pointermove", (event) => {
      if (motion.matches) return;
      pending = { x: event.clientX, y: event.clientY, target: event.target };
      if (!frame) frame = requestAnimationFrame(paint);
    }, { passive: true });
    document.addEventListener("pointerdown", (event) => {
      const card = event.target.closest(selector);
      if (!card) return;
      current = card;
      card.classList.add("is-down");
      card.style.transform = "perspective(860px) rotateX(2deg) translateY(2px) scale(0.972)";
    });
    document.addEventListener("pointerup", () => reset(current));
    document.addEventListener("pointercancel", () => reset(current));
  }

  function armSlider() {
    clearInterval(slideTimer);
    const hero = document.querySelector(".hero");
    if (hero && !hero.dataset.bound) {
      hero.dataset.bound = "1";
      hero.addEventListener("mouseenter", () => { state.sliderHold = true; });
      hero.addEventListener("mouseleave", () => { state.sliderHold = false; });
    }
    goSlide(state.slide);
    slideTimer = setInterval(() => {
      if (document.body.dataset.page !== "home" || state.sliderHold) return;
      goSlide(state.slide + 1);
    }, 4200);
  }

  function add(id, qty = 1, note = "") {
    const product = productById(id);
    if (!product || product.soldOut || product.hidden) return;
    const items = cart();
    const row = items.find((item) => item.id === Number(id) && (item.note || "") === (note || ""));
    if (row) row.qty += qty;
    else items.push({ id: Number(id), qty, note: note || "" });
    saveCart(items);
    state.noticeKey = "";
    state.noticeExtra = "";
    state.toast = t("ui.added");
    state.printedId = Number(id);
    state.productId = 0;
    const wide = window.innerWidth > 760;
    state.drawer = !wide;
    setTimeout(() => render(true), 0);
    if (wide) {
      const token = ++state.printToken;
      setTimeout(() => {
        if (state.printToken !== token) return;
        state.drawer = true;
        state.printedId = 0;
        render(true);
      }, 900);
    }
    setTimeout(() => { state.toast = ""; const node = document.querySelector(".toast"); if (node) node.remove(); }, 1800);
  }

  function addConfigured() {
    const product = productById(state.productId);
    if (!product) return;
    const bits = [];
    if (state.sauceId) {
      const sauce = productById(state.sauceId);
      if (sauce) bits.push(t("ui.sauce") + ": " + sauce.name);
    }
    if (state.drinkId) {
      const drink = productById(state.drinkId);
      if (drink) bits.push(t("ui.drink") + ": " + drink.name);
    }
    if (state.sideId) {
      const side = productById(state.sideId);
      if (side) bits.push(t("ui.side") + ": " + side.name);
    }
    add(product.id, state.productQty, bits.join(" · "));
  }

  function changeQty(index, dir) {
    let items = cart();
    const i = Number(index);
    const row = items[i];
    if (!row) return;
    if (dir === 0) items.splice(i, 1);
    else row.qty += dir;
    items = items.filter((item) => item.qty > 0);
    saveCart(items);
    render(true);
  }

  async function checkout() {
    if (!session()) {
      state.noticeKey = "ui.needLogin";
      render(true);
      return;
    }
    if (!cart().length) return;
    const branch = document.getElementById("co-branch")?.value || state.branchName;
    const phone = document.getElementById("co-phone")?.value?.trim() || state.phone;
    const address = document.getElementById("co-address")?.value?.trim() || state.address;
    const note = document.getElementById("co-note")?.value?.trim() || state.note;
    const pay = document.getElementById("pay")?.value || state.pay;
    const couponInput = document.getElementById("co-coupon")?.value?.trim();
    if (couponInput && couponInput.toUpperCase() !== state.coupon) await applyCoupon(couponInput);
    if (!branch) { state.noticeKey = "ui.needBranch"; render(true); return; }
    if (!phone) { state.noticeKey = "ui.needPhone"; render(true); return; }
    if (state.delivery === "delivery" && !address) { state.noticeKey = "ui.needAddress"; render(true); return; }
    state.pay = pay;
    state.branchName = branch;
    state.phone = phone;
    state.address = address;
    state.note = note;
    localStorage.setItem("kfc_delivery", state.delivery);
    localStorage.setItem("kfc_branch", branch);
    localStorage.setItem("kfc_phone", phone);
    localStorage.setItem("kfc_address", address);
    try {
      const data = await api("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          items: cart().map((row) => ({ id: row.id, qty: row.qty, note: row.note || "" })),
          delivery: state.delivery,
          branch,
          address: state.delivery === "delivery" ? address : "",
          phone,
          pay,
          note,
          coupon: state.coupon || ""
        })
      });
      const number = data.order.number;
      saveCart([]);
      localStorage.removeItem("kfc_coupon");
      state.coupon = "";
      state.couponDraft = "";
      state.noticeKey = "ui.success";
      state.noticeExtra = number;
      state.toast = t("ui.success") + " " + number;
      state.note = "";
      state.drawer = false;
      await refreshOrders();
      launchConfetti();
      render(true);
    } catch (err) {
      const detail = String(err.data?.detail || "");
      if (detail.includes("needBranch")) state.noticeKey = "ui.needBranch";
      else if (detail.includes("needPhone")) state.noticeKey = "ui.needPhone";
      else if (detail.includes("needAddress")) state.noticeKey = "ui.needAddress";
      else if (detail.includes("coupon")) state.noticeKey = "ui.couponBad";
      else state.noticeKey = "ui.err";
      state.noticeExtra = "";
      render(true);
    }
  }

  function reorder(number) {
    const order = (state.orders || []).find((item) => item.number === number);
    if (!order || !order.items) return;
    saveCart(order.items.map((row) => ({ id: row.id, qty: row.qty, note: row.note || "" })));
    state.drawer = true;
    state.toast = t("ui.reorder");
    render(true);
    setTimeout(() => { state.toast = ""; const node = document.querySelector(".toast"); if (node) node.remove(); }, 1800);
  }

  document.addEventListener("click", (event) => {
    const el = event.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    if (act === "drawer") { state.drawer = true; state.productId = 0; render(true); }
    if (act === "close") { state.drawer = false; render(true); }
    if (act === "close-product") { state.productId = 0; render(true); }
    if (act === "open") {
      const product = productById(el.dataset.id);
      if (!product || product.hidden) return;
      state.productId = product.id;
      state.productQty = 1;
      state.sauceId = 0;
      state.drinkId = 0;
      state.sideId = 0;
      state.drawer = false;
      render(true);
    }
    if (act === "sauce") { state.sauceId = Number(el.dataset.id); render(true); }
    if (act === "drink") { state.drinkId = Number(el.dataset.id); render(true); }
    if (act === "side") { state.sideId = Number(el.dataset.id); render(true); }
    if (act === "pqty") {
      state.productQty = Math.max(1, state.productQty + Number(el.dataset.dir));
      render(true);
    }
    if (act === "add-configured") addConfigured();
    if (act === "delivery") {
      state.delivery = el.dataset.val;
      localStorage.setItem("kfc_delivery", state.delivery);
      render(true);
    }
    if (act === "lang") { localStorage.setItem("kfc_lang", el.dataset.lang); state.formError = ""; render(false); }
    if (act === "theme") {
      localStorage.setItem("kfc_theme", theme() === "dark" ? "light" : "dark");
      applyTheme();
      render(true);
    }
    if (act === "add") {
      const product = productById(el.dataset.id);
      if (product && !product.soldOut) {
        state.productId = product.id;
        state.productQty = 1;
        state.sauceId = 0;
        state.drinkId = 0;
        state.sideId = 0;
        render(true);
      }
    }
    if (act === "qty") changeQty(el.dataset.i, Number(el.dataset.dir));
    if (act === "cat") { state.cat = el.dataset.cat; state.menuQuery = ""; render(true); }
    if (act === "branch") { state.branch = Number(el.dataset.i); render(true); }
    if (act === "cookie") { localStorage.setItem("kfc_cookie", el.dataset.val); render(true); }
    if (act === "courier") {
      const order = (state.orders || []).find((item) => item.status !== "done" && item.status !== "cancelled");
      if (order) sessionStorage.setItem("kfc_courier_hide", order.number);
      render(true);
    }
    if (act === "logout") {
      api("/api/auth/logout", { method: "POST", body: "{}" }).finally(() => {
        state.user = null;
        state.favIds = [];
        state.orders = [];
        state.formError = "";
        render(true);
      });
    }
    if (act === "slide") { goSlide(Number(el.dataset.i)); armSlider(); }
    if (act === "prev" || act === "next") {
      goSlide(state.slide + (act === "next" ? 1 : -1));
      armSlider();
    }
    if (act === "checkout") checkout();
    if (act === "coupon") {
      const code = document.getElementById("co-coupon")?.value || state.couponDraft;
      applyCoupon(code).then(() => render(true));
    }
    if (act === "fav") {
      event.preventDefault();
      event.stopPropagation();
      toggleFav(el.dataset.id);
    }
    if (act === "filter") {
      state.menuFilter = el.dataset.val || "";
      localStorage.setItem("kfc_filter", state.menuFilter);
      render(true);
    }
    if (act === "reorder") reorder(el.dataset.no);
    if (act === "open-game") { state.drawer = false; startGame(); }
    if (act === "close-game") { clearInterval(gameTimer); state.gameOpen = false; render(true); }
    if (act === "game-start") startGame();
    if (act === "game-hit") hitGame();
    if (act === "nearest") {
      if (!navigator.geolocation) {
        state.toast = t("ui.nearestFail");
        render(true);
        return;
      }
      navigator.geolocation.getCurrentPosition((pos) => {
        let best = 0;
        let bestDist = Infinity;
        window.BRANCHES.forEach((item, index) => {
          if (!item.lat || !item.lng) return;
          const dist = haversine(pos.coords.latitude, pos.coords.longitude, item.lat, item.lng);
          if (dist < bestDist) { bestDist = dist; best = index; }
        });
        state.branch = best;
        state.branchName = window.BRANCHES[best].name;
        localStorage.setItem("kfc_branch", state.branchName);
        state.toast = t("ui.nearestOk");
        render(true);
        setTimeout(() => { state.toast = ""; const node = document.querySelector(".toast"); if (node) node.remove(); }, 2000);
      }, () => {
        state.toast = t("ui.nearestFail");
        render(true);
      }, { enableHighAccuracy: true, timeout: 8000 });
    }
    if (act === "pick-branch") {
      state.branchName = el.dataset.name || "";
      localStorage.setItem("kfc_branch", state.branchName);
      state.toast = state.branchName;
      render(true);
    }
    if (act === "install") {
      if (deferredInstall) {
        deferredInstall.prompt();
        deferredInstall.userChoice.finally(() => { deferredInstall = null; state.installReady = false; render(true); });
      } else {
        state.toast = t("ui.installLead");
        render(true);
      }
    }
    if (act === "install-hide") {
      localStorage.setItem("kfc_pwa_hide", "1");
      state.installReady = false;
      render(true);
    }
    if (act === "top") window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.addEventListener("change", (event) => {
    if (event.target.id === "pay") state.pay = event.target.value;
    if (event.target.id === "co-branch") {
      state.branchName = event.target.value;
      localStorage.setItem("kfc_branch", state.branchName);
    }
  });
  document.addEventListener("input", (event) => {
    if (event.target.id === "co-address") state.address = event.target.value;
    if (event.target.id === "co-phone") state.phone = event.target.value;
    if (event.target.id === "co-note") state.note = event.target.value;
    if (event.target.id === "co-coupon") state.couponDraft = event.target.value;
    if (event.target.id === "fb") {
      const count = document.getElementById("count");
      const button = document.getElementById("fb-send");
      if (count) count.textContent = event.target.value.length + "/500";
      if (button) button.disabled = event.target.value.trim().length === 0;
    }
    if (event.target.id === "menu-q") {
      state.menuQuery = event.target.value;
      const current = window.CATALOG.find((category) => category.key === state.cat) || window.CATALOG[0];
      const words = menuWords();
      const items = menuItems(current);
      const grid = document.getElementById("menu-grid");
      const count = document.getElementById("menu-count");
      if (grid) grid.innerHTML = items.length ? items.map(card).join("") : `<p class="empty">${esc(words.empty)}</p>`;
      if (count) count.textContent = items.length + " " + words.count;
    }
    if (event.target.id === "q") {
      state.query = event.target.value;
      const box = document.getElementById("branch-list");
      if (!box) return;
      const before = state.branch;
      const html = branches();
      const holder = document.createElement("div");
      holder.innerHTML = html;
      const next = holder.querySelector("#branch-list");
      if (next) box.innerHTML = next.innerHTML;
      if (state.branch !== before) {
        const map = document.querySelector(".map-card");
        const fresh = holder.querySelector(".map-card");
        if (map && fresh) map.replaceWith(fresh);
      }
    }
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const kind = form.dataset.form;
    state.formError = "";
    if (kind === "feedback" || kind === "contact" || kind === "career") {
      const missing = Object.values(data).some((value) => !String(value).trim());
      if (missing) { state.formError = t("ui.required"); render(true); return; }
      api("/api/messages", {
        method: "POST",
        body: JSON.stringify({ kind, ...data })
      }).then(() => {
        state.sent = kind;
        render(true);
      }).catch(() => {
        state.formError = t("ui.err");
        render(true);
      });
      return;
    }
    if (kind === "register") {
      if (!data.name || !data.email || !data.phone || !data.password) { state.formError = t("ui.required"); render(true); return; }
      if (data.password.length < 6) { state.formError = t("ui.short"); render(true); return; }
      if (data.password !== data.password2) { state.formError = t("ui.mismatch"); render(true); return; }
      api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.trim(),
          phone: data.phone.trim(),
          password: data.password,
          password2: data.password2
        })
      }).then(() => { location.href = "/"; }).catch((err) => {
        const detail = String(err.data?.detail || "");
        state.formError = detail === "exists" ? t("ui.exists") : detail === "short" ? t("ui.short") : detail === "mismatch" ? t("ui.mismatch") : t("ui.err");
        render(true);
      });
      return;
    }
    if (kind === "login") {
      api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: data.email, password: data.password })
      }).then(() => { location.href = "/"; }).catch(() => {
        state.formError = t("ui.bad");
        render(true);
      });
    }
  });

  window.addEventListener("scroll", () => {
    syncHeader();
    syncScrollTop();
  }, { passive: true });
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstall = event;
    state.installReady = true;
    const banner = document.querySelector(".install-banner");
    if (!banner && !localStorage.getItem("kfc_pwa_hide")) render(true);
  });
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
  armDepth();
  boot();
})();
