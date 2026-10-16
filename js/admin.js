(() => {
  const STATUSES = ["new", "preparing", "ready", "onway", "done", "cancelled"];
  const STATUS_AZ = { new: "Yeni", preparing: "Hazırlanır", ready: "Hazırdır", onway: "Yoldadır", done: "Tamamlandı", cancelled: "Ləğv" };
  const KIND_AZ = { feedback: "İrad", contact: "Əlaqə", career: "Karyera" };

  const state = {
    tab: sessionStorage.getItem("kfc_admin_tab") || "dash",
    error: "",
    query: "",
    page: 1,
    toast: "",
    ok: "",
    edit: null,
    admin: false,
    dash: null,
    orders: [],
    users: [],
    messages: [],
    overrides: {}
  };

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }
  function money(n) { return Number(n || 0).toFixed(2) + " ₼"; }
  function img(src) {
    if (!src) return "";
    return String(src).startsWith("http") ? src : "https://api.kfc.az" + src;
  }
  async function api(path, opts = {}) {
    const res = await fetch(path, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
      ...opts
    });
    let data = null;
    try { data = await res.json(); } catch { data = null; }
    if (!res.ok) {
      const err = new Error((data && data.detail) || res.statusText);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function allProducts() {
    return window.CATALOG.flatMap((category) => category.products.map((product) => ({ ...product, category: category.key })));
  }

  function productById(id) {
    const num = Number(id);
    const base = allProducts().find((item) => item.id === num);
    if (!base) return null;
    const over = state.overrides[num] || state.overrides[String(num)] || {};
    return {
      ...base,
      price: over.price != null ? Number(over.price) : base.price,
      featured: over.featured != null ? !!over.featured : !!base.featured,
      soldOut: !!over.soldOut,
      hidden: !!over.hidden
    };
  }

  function catName(key) {
    try { return (window.I18N.az || {}).cats[key] || key; } catch { return key; }
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

  function when(ts) {
    try { return new Date(ts).toLocaleString("az-AZ"); } catch { return ""; }
  }

  function theme() { return localStorage.getItem("kfc_theme") === "dark" ? "dark" : "light"; }
  function applyTheme() {
    document.documentElement.classList.toggle("theme-dark", theme() === "dark");
  }
  applyTheme();

  function themeBtn() {
    const dark = theme() === "dark";
    return `<button class="admin-theme${dark ? " is-sun" : " is-moon"}" type="button" data-act="theme" title="${dark ? "Gündüz" : "Gecə"}" aria-label="${dark ? "Light" : "Dark"}">
      ${dark
        ? `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><path fill="currentColor" d="M12 2.2a1 1 0 0 1 1 1V5a1 1 0 1 1-2 0V3.2a1 1 0 0 1 1-1zm0 14.8a1 1 0 0 1 1 1v1.8a1 1 0 1 1-2 0V18a1 1 0 0 1 1-1zM3.2 11a1 1 0 0 1 1-1H6a1 1 0 1 1 0 2H4.2a1 1 0 0 1-1-1zm14.8 0a1 1 0 0 1 1-1H21a1 1 0 1 1 0 2h-1.8a1 1 0 0 1-1-1zM5.64 5.64a1 1 0 0 1 1.41 0l1.27 1.27a1 1 0 0 1-1.41 1.41L5.64 7.05a1 1 0 0 1 0-1.41zm10.04 10.04a1 1 0 0 1 1.41 0l1.27 1.27a1 1 0 1 1-1.41 1.41l-1.27-1.27a1 1 0 0 1 0-1.41zM18.36 5.64a1 1 0 0 1 0 1.41l-1.27 1.27a1 1 0 1 1-1.41-1.41l1.27-1.27a1 1 0 0 1 1.41 0zM8.32 15.68a1 1 0 0 1 0 1.41L7.05 18.36a1 1 0 1 1-1.41-1.41l1.27-1.27a1 1 0 0 1 1.41 0z"/></svg>`
        : `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M21.2 14.1A8.8 8.8 0 0 1 9.9 2.8 8.9 8.9 0 1 0 21.2 14.1z"/></svg>`}
    </button>`;
  }

  function toast(text) {
    state.toast = text;
    paint();
    setTimeout(() => {
      state.toast = "";
      document.querySelector(".admin-toast")?.remove();
    }, 1600);
  }

  function loginView() {
    return `<div class="admin-login">
      ${themeBtn()}
      <form data-form="admin-login">
        <p class="admin-kicker">KFC Azərbaycan</p>
        <h1>Admin panel</h1>
        <p>Superuser ilə daxil olun. Demo: admin / admin</p>
        <label>İstifadəçi adı<input name="user" autocomplete="username" value="admin" required></label>
        <label>Şifrə<input name="password" type="password" autocomplete="current-password" value="admin" required></label>
        ${state.error ? `<p class="admin-error">${esc(state.error)}</p>` : ""}
        <button type="submit">Daxil ol</button>
      </form>
    </div>`;
  }

  function frame(title, lead, body) {
    const links = [
      ["dash", "İdarə paneli"],
      ["orders", "Sifarişlər"],
      ["users", "İstifadəçilər"],
      ["messages", "Mesajlar"],
      ["products", "Məhsullar"],
      ["branches", "Restoranlar"]
    ];
    return `<div class="admin-app">
      <aside class="admin-side">
        <div class="admin-brand">KFC Azərbaycan</div>
        <p class="admin-side-note">Admin panel</p>
        <nav>${links.map(([id, label]) => `<button type="button" class="nav-link${state.tab === id ? " is-active" : ""}" data-act="admin-tab" data-tab="${id}">${label}</button>`).join("")}</nav>
        <a class="admin-store" href="/">Sayta qayıt</a>
      </aside>
      <div class="admin-main">
        <header class="admin-top">
          <div><strong>admin</strong><span class="admin-badge">superuser</span></div>
          <div class="admin-top-actions">${themeBtn()}<button type="button" data-act="admin-out">Çıxış</button></div>
        </header>
        <div class="admin-content">
          <h1>${esc(title)}</h1>
          <p class="admin-lead">${esc(lead)}</p>
          ${state.ok ? `<p class="admin-ok">${esc(state.ok)}</p>` : ""}
          ${body}
        </div>
      </div>
      ${state.toast ? `<div class="admin-toast">${esc(state.toast)}</div>` : ""}
      ${editModal()}
    </div>`;
  }

  function editModal() {
    if (!state.edit) return "";
    const item = state.edit;
    return `<div class="admin-modal">
      <form data-form="prod-edit">
        <h2>Məhsulu dəyiş</h2>
        <label>Ad<input name="name" value="${esc(item.name)}" readonly></label>
        <label>Qiymət<input name="price" type="number" min="0" step="0.01" value="${Number(item.price).toFixed(2)}" required></label>
        <label class="admin-check"><input name="featured" type="checkbox" ${item.featured ? "checked" : ""}> Xüsusi təklif</label>
        <label class="admin-check"><input name="soldOut" type="checkbox" ${item.soldOut ? "checked" : ""}> Satılıb</label>
        <label class="admin-check"><input name="hidden" type="checkbox" ${item.hidden ? "checked" : ""}> Saytdan gizlət</label>
        <div class="admin-actions">
          <button type="button" data-act="edit-close">Bağla</button>
          <button type="submit">Yadda saxla</button>
        </div>
      </form>
    </div>`;
  }

  function dashView() {
    const d = state.dash || { orders: 0, revenue: 0, users: 0, unread: 0, products: 0, hidden: 0, recent: [] };
    const open = window.BRANCHES.filter(branchOpen).length;
    const cards = [
      ["Sifariş", d.orders],
      ["Gəlir", money(d.revenue)],
      ["İstifadəçi", d.users],
      ["Oxunmamış", d.unread],
      ["Məhsul", d.products],
      ["Gizlədilən", d.hidden],
      ["Restoran", window.BRANCHES.length],
      ["Açıq indi", open]
    ];
    const recent = (d.recent || []).map((order) => `<tr>
      <td><strong>${esc(order.number)}</strong><span class="admin-sub">${esc(when(order.at))}</span></td>
      <td>${esc(order.email || "—")}</td>
      <td>${money(order.total)}</td>
      <td><span class="admin-pill ${esc(order.status || "new")}">${esc(STATUS_AZ[order.status || "new"])}</span></td>
    </tr>`).join("") || `<tr><td colspan="4">Məlumat yoxdur.</td></tr>`;
    return frame("İdarə paneli", "Sifarişlər, məhsullar, mesajlar və restoranlar buradan idarə olunur.",
      `<div class="admin-cards">${cards.map(([label, value]) => `<article><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`).join("")}</div>
       <table class="admin-table"><thead><tr><th>Sifariş</th><th>E-poçt</th><th>Cəm</th><th>Status</th></tr></thead><tbody>${recent}</tbody></table>`);
  }

  function ordersView() {
    const q = state.query.trim().toLowerCase();
    const rows = state.orders.filter((order) => {
      const blob = [order.number, order.email, order.pay, order.status].join(" ").toLowerCase();
      return !q || blob.includes(q);
    }).map((order) => {
      const lines = (order.items || []).map((row) => {
        const product = productById(row.id);
        return product ? `${product.name} ×${row.qty}` : `#${row.id} ×${row.qty}`;
      }).join(", ");
      const options = STATUSES.map((code) => `<option value="${code}" ${(order.status || "new") === code ? "selected" : ""}>${STATUS_AZ[code]}</option>`).join("");
      return `<tr>
        <td><strong>${esc(order.number)}</strong><span class="admin-sub">${esc(when(order.at))}</span></td>
        <td>${esc(order.email || "—")}<span class="admin-sub">${esc(order.pay === "card" ? "Kart" : "Nağd")}</span></td>
        <td>${esc(lines || "—")}</td>
        <td>${money(order.total)}</td>
        <td><select data-act="order-status" data-num="${esc(order.number)}">${options}</select></td>
        <td class="admin-row-actions"><button class="ghost" type="button" data-act="order-del" data-num="${esc(order.number)}">Sil</button></td>
      </tr>`;
    }).join("") || `<tr><td colspan="6">Məlumat yoxdur.</td></tr>`;
    return frame("Sifarişlər", `${state.orders.length} sifariş`,
      `${searchBar("Nömrə, e-poçt və ya status")}
       <table class="admin-table">
         <thead><tr><th>Sifariş</th><th>Müştəri</th><th>Məhsullar</th><th>Cəm</th><th>Status</th><th></th></tr></thead>
         <tbody>${rows}</tbody>
       </table>`);
  }

  function usersView() {
    const q = state.query.trim().toLowerCase();
    const rows = state.users.filter((user) => {
      const blob = [user.name, user.email, user.phone].join(" ").toLowerCase();
      return !q || blob.includes(q);
    }).map((user) => `<tr>
      <td>${esc(user.name)}</td>
      <td>${esc(user.email)}</td>
      <td>${esc(user.phone || "—")}</td>
      <td class="admin-row-actions"><button class="ghost" type="button" data-act="user-del" data-id="${user.id}">Sil</button></td>
    </tr>`).join("") || `<tr><td colspan="4">Məlumat yoxdur.</td></tr>`;
    return frame("İstifadəçilər", "Qeydiyyatdan keçmiş hesablar.",
      `${searchBar("Ad, e-poçt və ya telefon")}
       <table class="admin-table">
         <thead><tr><th>İstifadəçi</th><th>E-poçt</th><th>Telefon</th><th></th></tr></thead>
         <tbody>${rows}</tbody>
       </table>`);
  }

  function messagesView() {
    const q = state.query.trim().toLowerCase();
    const rows = state.messages.filter((item) => {
      const blob = [item.kind, item.name, item.email, item.phone, item.text, item.message, item.restaurant, item.position].join(" ").toLowerCase();
      return !q || blob.includes(q);
    }).map((item) => {
      const body = item.text || item.message || item.note || item.cv || "";
      return `<tr>
        <td><span class="admin-pill">${esc(KIND_AZ[item.kind] || item.kind)}</span><span class="admin-sub">${esc(when(item.at))}</span></td>
        <td>${esc(item.name || "—")}<span class="admin-sub">${esc(item.email || item.phone || "—")}</span></td>
        <td>${esc(item.restaurant || item.position || "—")}</td>
        <td class="admin-msg">${esc(body)}</td>
        <td class="admin-row-actions">
          ${item.read ? "" : `<button type="button" data-act="msg-read" data-id="${item.id}">Oxundu</button>`}
          <button class="ghost" type="button" data-act="msg-del" data-id="${item.id}">Sil</button>
        </td>
      </tr>`;
    }).join("") || `<tr><td colspan="5">Məlumat yoxdur.</td></tr>`;
    return frame("Mesajlar", "İrad, əlaqə və karyera müraciətləri.",
      `${searchBar("Ad, mətn və ya növ")}
       <table class="admin-table">
         <thead><tr><th>Növ</th><th>Göndərən</th><th>Əlavə</th><th>Mətn</th><th></th></tr></thead>
         <tbody>${rows}</tbody>
       </table>`);
  }

  function productsView() {
    const q = state.query.trim().toLowerCase();
    const filtered = allProducts().map((item) => productById(item.id)).filter((item) => {
      const blob = [item.name, item.description, item.category].join(" ").toLowerCase();
      return !q || blob.includes(q);
    });
    const per = 12;
    const pages = Math.max(1, Math.ceil(filtered.length / per));
    if (state.page > pages) state.page = pages;
    const slice = filtered.slice((state.page - 1) * per, state.page * per);
    const rows = slice.map((item) => `<tr>
      <td>
        <div class="admin-product">
          <img src="${esc(img(item.image))}" alt="">
          <div>
            <strong>${esc(item.name)}</strong>
            <span>${esc(catName(item.category))}${item.soldOut ? " · Satılıb" : ""}</span>
          </div>
        </div>
      </td>
      <td>${money(item.price)}</td>
      <td>${item.hidden ? "Gizli" : item.featured ? "Xüsusi" : "Saytda"}</td>
      <td><button type="button" data-act="prod-edit" data-id="${item.id}">Dəyiş</button></td>
    </tr>`).join("") || `<tr><td colspan="4">Məlumat yoxdur.</td></tr>`;
    return frame("Məhsullar", `${filtered.length} məhsul`,
      `${searchBar("Ad və ya kateqoriya")}
       <table class="admin-table">
         <thead><tr><th>Məhsul</th><th>Qiymət</th><th>Status</th><th></th></tr></thead>
         <tbody>${rows}</tbody>
       </table>
       <div class="admin-pager">
         <button type="button" data-act="page" data-dir="-1" ${state.page <= 1 ? "disabled" : ""}>Əvvəl</button>
         <span>${state.page} / ${pages}</span>
         <button type="button" data-act="page" data-dir="1" ${state.page >= pages ? "disabled" : ""}>Növbəti</button>
       </div>`);
  }

  function branchesView() {
    const q = state.query.trim().toLowerCase();
    const rows = window.BRANCHES.filter((item) => {
      const blob = [item.name, item.address, item.phone].join(" ").toLowerCase();
      return !q || blob.includes(q);
    }).map((item) => {
      const hours = item.allDay ? "24 saat" : `${item.open} – ${item.close}`;
      return `<tr>
        <td><strong>${esc(item.name)}</strong><span class="admin-sub">${esc(item.address)}</span></td>
        <td>${esc(item.phone)}</td>
        <td>${esc(hours)}</td>
        <td>${branchOpen(item) ? `<span class="admin-pill ready">Açıqdır</span>` : "—"}</td>
      </tr>`;
    }).join("") || `<tr><td colspan="4">Məlumat yoxdur.</td></tr>`;
    return frame("Restoranlar", `${window.BRANCHES.length} restoran`,
      `${searchBar("Ad və ya ünvan")}
       <table class="admin-table">
         <thead><tr><th>Restoran</th><th>Telefon</th><th>İş saatı</th><th>Status</th></tr></thead>
         <tbody>${rows}</tbody>
       </table>`);
  }

  function searchBar(placeholder) {
    return `<form class="admin-search" data-form="admin-search">
      <input id="admin-q" value="${esc(state.query)}" placeholder="${esc(placeholder)}">
      <button type="submit">Axtar</button>
    </form>`;
  }

  function paint() {
    document.title = "Admin · KFC";
    document.body.className = "is-admin";
    let html = loginView();
    if (state.admin) {
      const views = { dash: dashView, orders: ordersView, users: usersView, messages: messagesView, products: productsView, branches: branchesView };
      html = (views[state.tab] || dashView)();
    }
    document.getElementById("root").innerHTML = html;
  }

  async function loadTab() {
    if (!state.admin) { paint(); return; }
    try {
      if (state.tab === "dash") {
        state.dash = await api("/api/admin/dash");
        state.overrides = state.dash.overrides || {};
      } else if (state.tab === "orders") {
        const data = await api("/api/admin/orders");
        state.orders = data.orders || [];
      } else if (state.tab === "users") {
        const data = await api("/api/admin/users");
        state.users = data.users || [];
      } else if (state.tab === "messages") {
        const data = await api("/api/admin/messages");
        state.messages = data.messages || [];
      } else if (state.tab === "products") {
        const data = await api("/api/admin/overrides");
        state.overrides = data.overrides || {};
      }
    } catch (err) {
      if (err.status === 401) {
        state.admin = false;
        state.error = "Yenidən daxil olun.";
      }
    }
    paint();
  }

  async function boot() {
    try {
      const me = await api("/api/admin/me");
      state.admin = !!me.ok;
    } catch {
      state.admin = false;
    }
    await loadTab();
  }

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    if (form.dataset.form === "admin-login") {
      const data = Object.fromEntries(new FormData(form).entries());
      api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ user: data.user, password: data.password })
      }).then(() => {
        state.admin = true;
        state.error = "";
        state.tab = "dash";
        loadTab();
      }).catch(() => {
        state.error = "Giriş alınmadı.";
        paint();
      });
    }
    if (form.dataset.form === "admin-search") {
      state.query = form.querySelector("input")?.value || "";
      state.page = 1;
      paint();
    }
    if (form.dataset.form === "prod-edit" && state.edit) {
      const data = Object.fromEntries(new FormData(form).entries());
      api("/api/admin/overrides/" + state.edit.id, {
        method: "PUT",
        body: JSON.stringify({
          price: Number(data.price),
          featured: !!form.querySelector('[name="featured"]')?.checked,
          soldOut: !!form.querySelector('[name="soldOut"]')?.checked,
          hidden: !!form.querySelector('[name="hidden"]')?.checked
        })
      }).then((res) => {
        state.overrides = res.overrides || state.overrides;
        state.edit = null;
        state.ok = "Yadda saxlandı.";
        toast("Yadda saxlandı.");
        loadTab();
      }).catch(() => toast("Xəta"));
    }
  });

  document.addEventListener("click", (event) => {
    const el = event.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    if (act === "admin-tab") {
      state.tab = el.dataset.tab;
      state.query = "";
      state.page = 1;
      state.ok = "";
      state.edit = null;
      sessionStorage.setItem("kfc_admin_tab", state.tab);
      loadTab();
    }
    if (act === "admin-out") {
      api("/api/admin/logout", { method: "POST", body: "{}" }).finally(() => {
        state.admin = false;
        state.error = "";
        state.edit = null;
        paint();
      });
    }
    if (act === "theme") {
      localStorage.setItem("kfc_theme", theme() === "dark" ? "light" : "dark");
      applyTheme();
      paint();
    }
    if (act === "edit-close") { state.edit = null; paint(); }
    if (act === "page") {
      state.page += Number(el.dataset.dir);
      paint();
    }
    if (act === "order-del") {
      api("/api/admin/orders/" + encodeURIComponent(el.dataset.num), { method: "DELETE" })
        .then(() => { toast("Silindi"); loadTab(); })
        .catch(() => toast("Xəta"));
    }
    if (act === "user-del") {
      api("/api/admin/users/" + el.dataset.id, { method: "DELETE" })
        .then(() => { toast("Silindi"); loadTab(); })
        .catch(() => toast("Xəta"));
    }
    if (act === "msg-del") {
      api("/api/admin/messages/" + el.dataset.id, { method: "DELETE" })
        .then(() => { toast("Silindi"); loadTab(); })
        .catch(() => toast("Xəta"));
    }
    if (act === "msg-read") {
      api("/api/admin/messages/" + el.dataset.id, { method: "PATCH", body: "{}" })
        .then(() => loadTab())
        .catch(() => toast("Xəta"));
    }
    if (act === "prod-edit") {
      state.ok = "";
      state.edit = productById(el.dataset.id);
      paint();
    }
  });

  document.addEventListener("change", (event) => {
    const el = event.target;
    if (el.matches("[data-act=order-status]")) {
      api("/api/admin/orders/" + encodeURIComponent(el.dataset.num), {
        method: "PATCH",
        body: JSON.stringify({ status: el.value })
      }).then(() => toast("Yadda saxlandı.")).catch(() => toast("Xəta"));
    }
  });

  boot();
})();
