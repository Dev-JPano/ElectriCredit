/* =========================================================
   ELECTRICREDIT V2 - GLOBAL FRONTEND BRAIN
   File: static/script.js

   Responsibilities:
   - Boot ElectriCredit frontend
   - Mount long-scroll sections
   - Load global UI state
   - Apply theme from localStorage/API fallback
   - Manage loader
   - Manage scroll progress
   - Manage active navigation
   - Mount components when available
   - Provide fallback placeholder sections
   ========================================================= */

(function () {
  "use strict";

  const APP = {
    name: "ElectriCredit",
    version: "2.0.0",
    bootedAt: new Date(),
    currentUser: null,
    currentTheme: null,
    isOnline: false,
    roots: {},
    sections: [
      {
        id: "home",
        label: "Home",
        rootId: "home-section",
        componentName: "Home",
        public: true
      },
      {
        id: "dashboard",
        label: "Dashboard",
        rootId: "dashboard-section",
        componentName: "Dashboard",
        public: true
      },
      {
        id: "hardware",
        label: "Hardware",
        rootId: "hardware-section",
        componentName: "Hardware",
        public: true
      },
      {
        id: "peopleware",
        label: "Peopleware",
        rootId: "peopleware-section",
        componentName: "Peopleware",
        public: true
      },
      {
        id: "software",
        label: "Software",
        rootId: "software-section",
        componentName: "Software",
        public: false,
        disabledWhenLoggedOut: true
      },
      {
        id: "about",
        label: "About",
        rootId: "about-section",
        componentName: "About",
        public: true
      }
    ]
  };

  const STORAGE_KEYS = {
    themeId: "electricredit.theme.id",
    themeData: "electricredit.theme.data",
    auth: "electricredit.auth"
  };

  const ROLE = {
    VISITOR: 0,
    ADMINISTRATOR: 1,
    OWNER: 2,
    DEVELOPER: 3
  };

  const DEFAULT_THEME = {
    id: 1,
    name: "Electric Default",
    primary: "#38bdf8",
    secondary: "#22c55e",
    warning: "#f59e0b",
    danger: "#ef4444",
    bg1: "#020617",
    bg2: "#0f172a",
    txtforbg1: "#f8fafc",
    txtforbg2: "#cbd5e1",
    txtforprimary: "#021018",
    txtforsecondary: "#02140a",
    success: "#10b981",
    surface: "rgba(15, 23, 42, 0.78)",
    card: "rgba(30, 41, 59, 0.74)",
    border: "rgba(148, 163, 184, 0.22)",
    shadow: "rgba(0, 0, 0, 0.42)"
  };

  const SELECTOR = {
    loader: "#app-loader",
    app: "#app",
    headerRoot: "#header-root",
    mainRoot: "#main-root",
    footerRoot: "#footer-root",
    modalRoot: "#modal-root",
    toastRoot: "#toast-root"
  };

  /* =========================================================
     BASIC HELPERS
     ========================================================= */

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $all(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function safeJsonParse(value, fallback = null) {
    try {
      return JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function getRoleLevel(role) {
    const normalized = String(role || "VISITOR").trim().toUpperCase();
    return ROLE[normalized] ?? 0;
  }

  function isLoggedIn() {
    return Boolean(APP.currentUser && APP.currentUser.role);
  }

  function hasRole(requiredRole) {
    const userLevel = getRoleLevel(APP.currentUser?.role);
    const requiredLevel = getRoleLevel(requiredRole);
    return userLevel >= requiredLevel;
  }

  function formatEntity(type, id) {
    return `${String(type || "ITEM").toUpperCase()}[${Number(id) || 0}]`;
  }

  function normalizeUid(uid) {
    return String(uid || "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();
  }

  function randomString(length = 16) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    let output = "";

    crypto.getRandomValues(new Uint32Array(length)).forEach((value) => {
      output += chars[value % chars.length];
    });

    return output;
  }

  /* =========================================================
     API HELPERS
     routing.js may define window.ElectriCreditRoutes.
     ========================================================= */

  function getRoutes() {
    return window.ElectriCreditRoutes || window.ECRoutes || {};
  }

  function route(path, ...args) {
    const routes = getRoutes();
    const target = routes[path];

    if (typeof target === "function") {
      return target(...args);
    }

    if (typeof target === "string") {
      return target;
    }

    const fallback = args.find((item) => typeof item === "string");

    return fallback || path;
  }

  async function requestJson(url, options = {}) {
    const config = Object.assign(
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        },
        cache: "no-store"
      },
      options
    );

    const response = await fetch(url, config);

    let payload = {};
    try {
      payload = await response.json();
    } catch (_) {
      payload = {};
    }

    if (!response.ok || payload.status === "error") {
      throw new Error(payload.message || `Request failed (${response.status}).`);
    }

    return payload;
  }

  async function getJson(url) {
    return requestJson(url, { method: "GET" });
  }

  async function postJson(url, body = {}) {
    return requestJson(url, {
      method: "POST",
      body: JSON.stringify(body)
    });
  }

  async function putJson(url, body = {}) {
    return requestJson(url, {
      method: "PUT",
      body: JSON.stringify(body)
    });
  }

  async function deleteJson(url, body = {}) {
    return requestJson(url, {
      method: "DELETE",
      body: JSON.stringify(body)
    });
  }

  /* =========================================================
     TOASTS
     ========================================================= */

  function toast(title, text = "", type = "info", timeout = 4200) {
    const root = APP.roots.toastRoot || $(SELECTOR.toastRoot);
    if (!root) return;

    const toastEl = document.createElement("div");
    toastEl.className = `ec-toast ec-toast-${escapeHtml(type)}`;
    toastEl.innerHTML = `
      <strong class="ec-toast-title">${escapeHtml(title)}</strong>
      ${text ? `<p class="ec-toast-text">${escapeHtml(text)}</p>` : ""}
    `;

    root.appendChild(toastEl);

    window.setTimeout(() => {
      toastEl.style.opacity = "0";
      toastEl.style.transform = "translateX(18px)";
      window.setTimeout(() => toastEl.remove(), 220);
    }, timeout);
  }

  /* =========================================================
     MODALS
     ========================================================= */

  function openModal(options = {}) {
    const root = APP.roots.modalRoot || $(SELECTOR.modalRoot);
    if (!root) return null;

    const title = options.title || "ElectriCredit";
    const body = options.body || "";
    const footer = options.footer || "";
    const sizeClass = options.sizeClass || "";

    closeModal();

    const wrapper = document.createElement("div");
    wrapper.className = "ec-modal-backdrop";
    wrapper.dataset.modal = "active";
    wrapper.innerHTML = `
      <article class="ec-modal ${escapeHtml(sizeClass)}" role="dialog" aria-modal="true">
        <header class="ec-modal-header">
          <h2 class="ec-modal-title">${escapeHtml(title)}</h2>
          <button class="ec-icon-btn" type="button" data-modal-close aria-label="Close modal">
            ✕
          </button>
        </header>
        <div class="ec-modal-body">
          ${body}
        </div>
        ${footer
        ? `<footer class="ec-modal-footer">${footer}</footer>`
        : ""
      }
      </article>
    `;

    root.appendChild(wrapper);
    document.body.classList.add("ec-modal-open");

    wrapper.addEventListener("click", (event) => {
      if (event.target === wrapper || event.target.closest("[data-modal-close]")) {
        closeModal();
      }
    });

    document.addEventListener("keydown", handleModalEscape);

    return wrapper;
  }

  function closeModal() {
    const root = APP.roots.modalRoot || $(SELECTOR.modalRoot);
    if (!root) return;

    root.innerHTML = "";
    document.body.classList.remove("ec-modal-open");
    document.removeEventListener("keydown", handleModalEscape);
  }

  function handleModalEscape(event) {
    if (event.key === "Escape") closeModal();
  }

  function openDangerConfirm(options = {}) {
    const code = randomString(16);
    const title = options.title || "Confirm Dangerous Action";
    const message = options.message || "This action may permanently change system data.";
    const onConfirm = typeof options.onConfirm === "function" ? options.onConfirm : null;

    const modal = openModal({
      title,
      body: `
        <div class="grid gap-4">
          <p class="ec-muted leading-relaxed">${escapeHtml(message)}</p>

          <div class="ec-panel">
            <p class="text-sm ec-muted mb-2">Copy this confirmation code:</p>
            <strong class="ec-mono text-xl tracking-widest">${escapeHtml(code)}</strong>
          </div>

          <label class="ec-field">
            <span class="ec-label">Paste confirmation code</span>
            <input class="ec-input ec-mono" type="text" data-danger-code-input autocomplete="off" />
          </label>
        </div>
      `,
      footer: `
        <button class="ec-btn" type="button" data-modal-close>Cancel</button>
        <button class="ec-btn ec-btn-danger" type="button" data-danger-confirm>Proceed</button>
      `
    });

    if (!modal) return;

    modal.querySelector("[data-danger-confirm]")?.addEventListener("click", async () => {
      const input = modal.querySelector("[data-danger-code-input]");
      const value = String(input?.value || "").trim();

      if (value !== code) {
        toast("Code does not match", "Please paste the exact generated confirmation code.", "danger");
        return;
      }

      try {
        if (onConfirm) await onConfirm();
        closeModal();
      } catch (error) {
        toast("Action failed", error.message || "Unable to complete dangerous action.", "danger");
      }
    });
  }

  /* =========================================================
     THEME
     ========================================================= */

  function applyTheme(theme = {}) {
    const merged = Object.assign({}, DEFAULT_THEME, theme || {});
    APP.currentTheme = merged;

    const root = document.documentElement;

    const map = {
      primary: "--ec-primary",
      secondary: "--ec-secondary",
      warning: "--ec-warning",
      danger: "--ec-danger",
      bg1: "--ec-bg1",
      bg2: "--ec-bg2",
      txtforbg1: "--ec-txtforbg1",
      txtforbg2: "--ec-txtforbg2",
      txtforprimary: "--ec-txtforprimary",
      txtforsecondary: "--ec-txtforsecondary",
      success: "--ec-success",
      surface: "--ec-surface",
      card: "--ec-card",
      border: "--ec-border",
      shadow: "--ec-shadow"
    };

    Object.entries(map).forEach(([key, cssVar]) => {
      if (merged[key]) root.style.setProperty(cssVar, merged[key]);
    });

    root.dataset.theme = merged.name || "Electric Default";

    try {
      localStorage.setItem(STORAGE_KEYS.themeData, JSON.stringify(merged));
      if (merged.id) localStorage.setItem(STORAGE_KEYS.themeId, String(merged.id));
    } catch (_) { }
  }

  function loadLocalTheme() {
    const stored = safeJsonParse(localStorage.getItem(STORAGE_KEYS.themeData), null);
    if (stored && typeof stored === "object") {
      applyTheme(stored);
      return stored;
    }

    applyTheme(DEFAULT_THEME);
    return DEFAULT_THEME;
  }

  async function loadThemeFromApi() {
    const themeId = localStorage.getItem(STORAGE_KEYS.themeId);

    if (!themeId) return;

    const themeUrl = route("themeDetail", themeId);

    try {
      const payload = await getJson(themeUrl);
      const theme = payload.data || payload.theme || payload;
      if (theme && typeof theme === "object") applyTheme(theme);
    } catch (_) {
      applyTheme(loadLocalTheme());
    }
  }

  /* =========================================================
     AUTH / PROFILE STATE
     ========================================================= */

  function loadLocalAuth() {
    const auth = safeJsonParse(localStorage.getItem(STORAGE_KEYS.auth), null);
    if (auth && auth.role) {
      APP.currentUser = auth;
    }

    updateAuthUi();
  }

  async function loadAuthFromApi() {
    const authUrl = route("authMe", "/api/auth/me");

    try {
      const payload = await getJson(authUrl);
      const user = payload.data?.user || payload.user || null;

      if (user && user.role) {
        APP.currentUser = user;
        localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(user));
      }
    } catch (_) {
      // Keep local auth fallback only during early development.
    }

    updateAuthUi();
  }

  function setCurrentUser(user) {
    APP.currentUser = user || null;

    try {
      if (user) localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(user));
      else localStorage.removeItem(STORAGE_KEYS.auth);
    } catch (_) { }

    updateAuthUi();
  }

  function updateAuthUi() {
    const logged = isLoggedIn();

    document.documentElement.dataset.auth = logged ? "logged-in" : "visitor";
    document.documentElement.dataset.role = APP.currentUser?.role || "VISITOR";

    $all("[data-auth-required]").forEach((element) => {
      const required = element.dataset.authRequired || "ADMINISTRATOR";
      const allowed = hasRole(required);
      element.hidden = !allowed;
      element.setAttribute("aria-hidden", String(!allowed));
    });

    $all("[data-software-link]").forEach((element) => {
      if (logged) {
        element.classList.remove("is-disabled");
        element.removeAttribute("aria-disabled");
        element.removeAttribute("tabindex");
      } else {
        element.classList.add("is-disabled");
        element.setAttribute("aria-disabled", "true");
        element.setAttribute("tabindex", "-1");
      }
    });

    const profileButtons = $all("[data-profile-button]");
    profileButtons.forEach((button) => {
      const img = APP.currentUser?.image;
      const role = APP.currentUser?.role;

      if (img) {
        button.innerHTML = `<img src="${escapeHtml(img)}" alt="Profile" class="w-full h-full object-cover rounded-full" />`;
      } else if (role) {
        button.innerHTML = `<span class="text-xs font-black">${escapeHtml(role[0] || "U")}</span>`;
      } else {
        button.innerHTML = "👤";
      }
    });
  }

  /* =========================================================
     LOADER
     ========================================================= */

  function hideLoader() {
    const loader = APP.roots.loader || $(SELECTOR.loader);
    if (!loader) return;

    loader.classList.add("is-hidden");

    window.setTimeout(() => {
      loader.remove();
    }, 420);
  }

  function showLoader() {
    const loader = APP.roots.loader || $(SELECTOR.loader);
    if (loader) loader.classList.remove("is-hidden");
  }

  /* =========================================================
     HEADER FALLBACK
     Real header component can replace this later.
     ========================================================= */

  function renderFallbackHeader() {
    const root = APP.roots.headerRoot;
    if (!root) return;

    if (window.HeaderController || window.ElectriCreditHeader) return;

    const navItems = APP.sections.map((section) => {
      const disabledAttr = section.id === "software" ? "data-software-link" : "";
      const disabledClass = section.id === "software" && !isLoggedIn() ? "is-disabled" : "";

      return `
        <a href="#${escapeHtml(section.id)}"
           class="ec-nav-link ${disabledClass}"
           data-nav-link
           data-section-target="${escapeHtml(section.id)}"
           ${disabledAttr}>
          ${escapeHtml(section.label)}
        </a>
      `;
    }).join("");

    root.innerHTML = `
      <div class="ec-header">
        <div class="ec-header-inner">
          <a href="#home" class="ec-brand" aria-label="ElectriCredit Home">
            <span class="ec-brand-mark">⚡</span>
            <span>ElectriCredit</span>
          </a>

          <nav class="ec-nav" aria-label="Main navigation">
            ${navItems}
          </nav>

          <div class="ec-header-actions">
            <button class="ec-icon-btn" type="button" data-chatbot-open aria-label="Open chatbot">💬</button>
            <button class="ec-icon-btn" type="button" data-theme-open aria-label="Open theme selector">🎨</button>
            <button class="ec-icon-btn overflow-hidden" type="button" data-profile-button data-profile-open aria-label="Open profile">👤</button>
            <button class="ec-icon-btn lg:hidden" type="button" data-mobile-menu aria-label="Open menu">☰</button>
          </div>
        </div>

        <div class="ec-scroll-progress" aria-hidden="true">
          <div class="ec-scroll-progress-bar" data-scroll-progress></div>
        </div>
      </div>
    `;

    bindFallbackHeader();
    updateAuthUi();
  }

  function bindFallbackHeader() {
    document.addEventListener("click", (event) => {
      const nav = event.target.closest("[data-nav-link]");
      if (nav) {
        event.preventDefault();

        if (nav.classList.contains("is-disabled")) {
          toast("Login required", "Software tools are available after login.", "warning");
          return;
        }

        scrollToSection(nav.dataset.sectionTarget);
        return;
      }

      if (event.target.closest("[data-chatbot-open]")) {
        openChatbotFallback();
        return;
      }

      if (event.target.closest("[data-theme-open]")) {
        openThemeFallback();
        return;
      }

      if (event.target.closest("[data-profile-open]")) {
        openProfileFallback();
        return;
      }

      if (event.target.closest("[data-mobile-menu]")) {
        openMobileMenuFallback();
      }
    });
  }

  function openMobileMenuFallback() {
    const links = APP.sections.map((section) => {
      const disabled = section.id === "software" && !isLoggedIn();
      return `
        <button class="ec-btn justify-start w-full ${disabled ? "opacity-50" : ""}"
                type="button"
                data-mobile-section="${escapeHtml(section.id)}"
                ${disabled ? "disabled" : ""}>
          ${escapeHtml(section.label)}
        </button>
      `;
    }).join("");

    const modal = openModal({
      title: "Navigation",
      body: `<div class="grid gap-2">${links}</div>`
    });

    modal?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-mobile-section]");
      if (!button) return;

      closeModal();
      scrollToSection(button.dataset.mobileSection);
    });
  }

  async function mountHeader() {
    const root = APP.roots.headerRoot;
    if (!root) return;

    const controller = window.HeaderController || window.ElectriCreditHeader;

    if (controller && typeof controller.init === "function") {
      await controller.init({
        root,
        app: publicApi()
      });
      return;
    }

    renderFallbackHeader();
  }

  /* =========================================================
     FALLBACK CTA MODALS
     Real components will replace these later.
     ========================================================= */

  function openChatbotFallback() {
    openModal({
      title: "ElectriCredit Chatbot",
      body: `
        <div class="grid gap-4">
          <div class="ec-panel">
            <p class="ec-muted leading-relaxed">
              Chatbot component is ready to be mounted later.
              It will use a Messenger-style layout, AI fallback, commands, and system context.
            </p>
          </div>

          <div class="flex gap-2">
            <input class="ec-input" type="text" placeholder="Ask ElectriCredit..." disabled />
            <button class="ec-btn ec-btn-primary" type="button" disabled>Send</button>
          </div>
        </div>
      `
    });
  }

  function openThemeFallback() {
    const themes = [
      {
        id: 1,
        name: "Electric Default",
        primary: "#38bdf8",
        secondary: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
        bg1: "#020617",
        bg2: "#0f172a",
        txtforbg1: "#f8fafc",
        txtforbg2: "#cbd5e1",
        txtforprimary: "#021018",
        txtforsecondary: "#02140a"
      },
      {
        id: 2,
        name: "Matcha Grid",
        primary: "#a3e635",
        secondary: "#22c55e",
        warning: "#facc15",
        danger: "#fb7185",
        bg1: "#0f1f13",
        bg2: "#172a1b",
        txtforbg1: "#f7fee7",
        txtforbg2: "#d9f99d",
        txtforprimary: "#102006",
        txtforsecondary: "#06140b"
      },
      {
        id: 3,
        name: "Royal Current",
        primary: "#fbbf24",
        secondary: "#8b5cf6",
        warning: "#f59e0b",
        danger: "#ef4444",
        bg1: "#12081f",
        bg2: "#1e1233",
        txtforbg1: "#fff7ed",
        txtforbg2: "#ddd6fe",
        txtforprimary: "#1c1200",
        txtforsecondary: "#13061f"
      }
    ];

    const cards = themes.map((theme) => `
      <button class="ec-card text-left ec-clickable" type="button" data-theme-sample="${escapeHtml(theme.id)}">
        <div class="flex items-center justify-between gap-3">
          <div>
            <strong>${escapeHtml(theme.name)}</strong>
            <p class="ec-muted text-sm mt-1">Apply this theme to this browser.</p>
          </div>
          <div class="flex gap-1">
            <span class="w-5 h-5 rounded-full" style="background:${escapeHtml(theme.primary)}"></span>
            <span class="w-5 h-5 rounded-full" style="background:${escapeHtml(theme.secondary)}"></span>
            <span class="w-5 h-5 rounded-full" style="background:${escapeHtml(theme.bg2)}"></span>
          </div>
        </div>
      </button>
    `).join("");

    const modal = openModal({
      title: "Theme",
      body: `<div class="grid gap-3">${cards}</div>`
    });

    modal?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-theme-sample]");
      if (!button) return;

      const theme = themes.find((item) => String(item.id) === button.dataset.themeSample);
      if (!theme) return;

      applyTheme(theme);
      toast("Theme applied", `${theme.name} is now active on this browser.`, "success");
      closeModal();
    });
  }

  function openProfileFallback() {
    const logged = isLoggedIn();

    openModal({
      title: logged ? "Profile" : "Profile Login",
      body: logged
        ? `
          <div class="grid gap-4">
            <div class="ec-panel">
              <strong>${escapeHtml(APP.currentUser.name || "Current User")}</strong>
              <p class="ec-muted mt-1">${escapeHtml(APP.currentUser.role || "VISITOR")}</p>
            </div>

            <button class="ec-btn ec-btn-danger" type="button" data-dev-logout>Log out</button>
          </div>
        `
        : `
          <div class="grid gap-4">
            <p class="ec-muted leading-relaxed">
              Login component will be connected to Flask authentication later.
              For frontend testing, use the demo buttons below.
            </p>

            <div class="grid gap-2">
              <button class="ec-btn" type="button" data-demo-login="ADMINISTRATOR">Demo Login as Administrator</button>
              <button class="ec-btn" type="button" data-demo-login="OWNER">Demo Login as Owner</button>
              <button class="ec-btn ec-btn-primary" type="button" data-demo-login="DEVELOPER">Demo Login as Developer</button>
            </div>
          </div>
        `
    });

    const root = APP.roots.modalRoot;

    root?.addEventListener("click", handleProfileModalAction, { once: true });
  }

  function handleProfileModalAction(event) {
    const loginButton = event.target.closest("[data-demo-login]");
    const logoutButton = event.target.closest("[data-dev-logout]");

    if (loginButton) {
      const role = loginButton.dataset.demoLogin;
      setCurrentUser({
        id: 1,
        name: `Demo ${role}`,
        username: role.toLowerCase(),
        role,
        image: ""
      });
      toast("Logged in", `Demo ${role} session started.`, "success");
      closeModal();
      return;
    }

    if (logoutButton) {
      setCurrentUser(null);
      toast("Logged out", "Profile session cleared.", "info");
      closeModal();
    }
  }

  /* =========================================================
     SECTIONS / PLACEHOLDER MOUNTING
     Real components can replace placeholders.
     ========================================================= */

  async function mountAllSections() {
    await mountHeader();

    for (const section of APP.sections) {
      await mountSection(section);
    }

    await mountFooter();
  }

  async function mountSection(section) {
    const root = document.getElementById(section.rootId);
    if (!root) return;

    const controller = findController(section.componentName);

    if (controller) {
      try {
        if (typeof controller.init === "function") {
          await controller.init({ root, app: publicApi() });
          return;
        }

        if (typeof controller.mount === "function") {
          await controller.mount(root, publicApi());
          return;
        }
      } catch (error) {
        console.error(`Failed to mount ${section.componentName}:`, error);
        renderPlaceholder(root, section, error.message);
        return;
      }
    }

    renderPlaceholder(root, section);
  }

  function findController(name) {
    return (
      window[`ElectriCredit${name}`] ||
      window[`${name}Controller`] ||
      window[name]
    );
  }

  function renderPlaceholder(root, section, errorMessage = "") {
    const descriptions = {
      home: "Public landing section, live local server state, active devices, playful developer belt, and system introduction.",
      dashboard: "Analytics section for POWER, HUB, USER, and USAGE charts powered by Flask API and SQLite.",
      hardware: "Hardware monitoring area for ESP32 Hubs and Registry Stations.",
      peopleware: "People management area for Users, Cards, Administrators, and Developers.",
      software: "Protected system tools for Configuration, Logs, and Developer-only Database editor.",
      about: "System explanation, architecture, capstone context, and developer profiles."
    };

    const isSoftware = section.id === "software";
    const disabled = isSoftware && !isLoggedIn();

    root.innerHTML = `
      <div class="ec-section-shell">
        <div class="ec-panel ec-glass">
          <span class="ec-eyebrow">${escapeHtml(section.label)}</span>
          <h1 class="ec-title ec-gradient-text">${escapeHtml(section.label)}</h1>
          <p class="ec-subtitle">
            ${escapeHtml(descriptions[section.id] || "ElectriCredit component placeholder.")}
          </p>

          ${disabled
        ? `
                <div class="mt-6 ec-card border-yellow-400/30">
                  <span class="ec-pill">
                    <span class="ec-dot ec-dot-warning"></span>
                    Login required
                  </span>
                  <p class="ec-muted mt-3">
                    Software tools are visible in navigation but disabled until an authorized superuser logs in.
                  </p>
                </div>
              `
        : ""
      }

          ${errorMessage
        ? `
                <div class="mt-6 ec-card border-red-400/30">
                  <span class="ec-pill">
                    <span class="ec-dot ec-dot-danger"></span>
                    Component error
                  </span>
                  <p class="ec-muted mt-3">${escapeHtml(errorMessage)}</p>
                </div>
              `
        : ""
      }

          <div class="mt-6 ec-grid-3">
            ${renderPlaceholderCard(section.id, 1)}
            ${renderPlaceholderCard(section.id, 2)}
            ${renderPlaceholderCard(section.id, 3)}
          </div>
        </div>
      </div>
    `;
  }

  function renderPlaceholderCard(sectionId, index) {
    const labels = {
      home: ["Server Status", "Active Devices", "System Mode"],
      dashboard: ["Power Chart", "Hub Ranking", "Usage Heatmap"],
      hardware: ["Hubs", "Registry Stations", "Device Status"],
      peopleware: ["Users", "Administrators", "Developers"],
      software: ["Configuration", "Logs", "Database"],
      about: ["System", "Architecture", "Team"]
    };

    const text = labels[sectionId]?.[index - 1] || `Item ${index}`;

    return `
      <article class="ec-card">
        <span class="ec-pill">
          <span class="ec-dot ${index === 1 ? "ec-dot-primary" : index === 2 ? "ec-dot-secondary" : "ec-dot-warning"}"></span>
          ${escapeHtml(text)}
        </span>
        <p class="ec-muted mt-4 leading-relaxed">
          This card is a temporary placeholder until the ${escapeHtml(sectionId)} component is built.
        </p>
      </article>
    `;
  }


  async function mountFooter() {
    const root = APP.roots.footerRoot;
    if (!root) return;

    const controller = window.FooterController || window.ElectriCreditFooter;

    if (controller && typeof controller.init === "function") {
      try {
        await controller.init({
          root,
          app: publicApi()
        });
        return;
      } catch (error) {
        console.error("Failed to mount Footer:", error);
        renderFallbackFooter();
        return;
      }
    }

    renderFallbackFooter();
  }

  function renderFallbackFooter() {
    const root = APP.roots.footerRoot;
    if (!root) return;

    if (window.FooterController || window.ElectriCreditFooter) return;

    root.innerHTML = `
      <div class="py-10 px-4">
        <div class="ec-section-shell">
          <div class="ec-panel">
            <div class="grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr] gap-6 items-center text-center">
              <div class="flex justify-center">
                <div class="ec-brand-mark w-16 h-16 text-2xl">BCC</div>
              </div>

              <div>
                <h2 class="text-xl md:text-2xl font-black tracking-tight">BUENAVISTA COMMUNITY COLLEGE</h2>
                <p class="mt-2 text-base font-bold ec-muted">Capstone G45 | Toneiu's HUB</p>
                <p class="mt-1 text-sm ec-muted">JSpit Corporation Presents</p>
              </div>

              <div class="flex justify-center">
                <div class="ec-brand-mark w-16 h-16 text-2xl">⚡</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* =========================================================
     SCROLL / ROUTING BEHAVIOR
     ========================================================= */

  function scrollToSection(sectionId) {
    const section = document.getElementById(`${sectionId}-section`) || document.getElementById(sectionId);
    if (!section) return;

    section.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    history.replaceState(null, "", `#${sectionId}`);
  }

  function setupScrollProgress() {
    const update = () => {
      const progress = $("[data-scroll-progress]");
      if (!progress) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const percentage = scrollHeight <= 0 ? 0 : (scrollTop / scrollHeight) * 100;

      progress.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
  }

  function setupActiveNav() {
    const sectionElements = APP.sections
      .map((section) => ({
        id: section.id,
        element: document.getElementById(section.rootId)
      }))
      .filter((item) => item.element);

    if (!sectionElements.length) return;

    const pickActiveSection = () => {
      const headerOffset = Number(
        getComputedStyle(document.documentElement)
          .getPropertyValue("--ec-header-height")
          .replace("px", "")
      ) || 80;

      const viewportAnchor = headerOffset + Math.max(120, window.innerHeight * 0.22);

      let best = sectionElements[0];

      for (const item of sectionElements) {
        const rect = item.element.getBoundingClientRect();

        if (rect.top <= viewportAnchor && rect.bottom >= viewportAnchor) {
          best = item;
          break;
        }

        if (rect.top <= viewportAnchor) {
          best = item;
        }
      }

      setActiveNav(best.id);
    };

    pickActiveSection();

    let ticking = false;
    const requestUpdate = () => {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        ticking = false;
        pickActiveSection();
      });
    };

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    window.addEventListener("hashchange", requestUpdate);
  }

  function setActiveNav(sectionId) {
    $all("[data-nav-link], [data-header-nav-link]").forEach((link) => {
      const target = link.dataset.sectionTarget || link.getAttribute("href")?.replace("#", "");
      link.classList.toggle("is-active", target === sectionId);
    });
  }

  function setupInitialHashScroll() {
    const hash = window.location.hash.replace("#", "").trim();
    if (!hash) return;

    window.setTimeout(() => scrollToSection(hash), 180);
  }

  /* =========================================================
     NETWORK / STATUS
     ========================================================= */

  async function checkHealth() {
    const healthUrl = route("health", "/api/health");

    try {
      const payload = await getJson(healthUrl);
      APP.isOnline = payload.status === "ok" || payload.status === "success";
      document.documentElement.dataset.server = "online";
    } catch (_) {
      APP.isOnline = false;
      document.documentElement.dataset.server = "offline";
    }
  }

  function setupBrowserOnlineState() {
    const update = () => {
      document.documentElement.dataset.browserOnline = navigator.onLine ? "online" : "offline";
    };

    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
  }

  /* =========================================================
     PUBLIC API FOR COMPONENTS
     ========================================================= */

  function publicApi() {
    return {
      app: APP,
      role: ROLE,
      route,
      requestJson,
      getJson,
      postJson,
      putJson,
      deleteJson,
      toast,
      openModal,
      closeModal,
      openDangerConfirm,
      applyTheme,
      setCurrentUser,
      isLoggedIn,
      hasRole,
      getRoleLevel,
      formatEntity,
      normalizeUid,
      randomString,
      escapeHtml,
      nowIso,
      scrollToSection,
      setActiveNav
    };
  }

  function exposeGlobals() {
    window.ElectriCredit = publicApi();
    window.ElectriCreditApp = APP;
  }

  /* =========================================================
     BOOT
     ========================================================= */

  async function boot() {
    cacheRoots();
    exposeGlobals();

    loadLocalTheme();
    loadLocalAuth();
    setupBrowserOnlineState();

    await Promise.allSettled([
      checkHealth(),
      loadThemeFromApi(),
      loadAuthFromApi()
    ]);

    await mountAllSections();

    setupScrollProgress();
    setupActiveNav();
    setupInitialHashScroll();

    await sleep(350);
    hideLoader();

    console.info("ElectriCredit v2 frontend boot complete.", {
      version: APP.version,
      bootedAt: APP.bootedAt,
      currentUser: APP.currentUser,
      theme: APP.currentTheme
    });
  }

  function cacheRoots() {
    APP.roots = {
      loader: $(SELECTOR.loader),
      app: $(SELECTOR.app),
      headerRoot: $(SELECTOR.headerRoot),
      mainRoot: $(SELECTOR.mainRoot),
      footerRoot: $(SELECTOR.footerRoot),
      modalRoot: $(SELECTOR.modalRoot),
      toastRoot: $(SELECTOR.toastRoot)
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    boot().catch((error) => {
      console.error("ElectriCredit boot failed:", error);

      try {
        hideLoader();
        toast("Frontend boot failed", error.message || "Unknown frontend error.", "danger", 8000);
      } catch (_) { }
    });
  });
})();