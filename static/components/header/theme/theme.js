/* =========================================================
   ELECTRICREDIT V2 - THEME CONTROLLER
   File: static/components/header/theme/theme.js

   Purpose:
   - Opens from header Theme icon
   - Loads themes from Flask API
   - Applies selected theme locally to browser
   - Stores selected theme in localStorage
   - Does not require login to apply theme locally
   - Add/edit/delete theme will be handled later in Configuration
   ========================================================= */

(function () {
    "use strict";

    const STORAGE_KEYS = {
        themeId: "electricredit.theme.id",
        themeData: "electricredit.theme.data"
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
        surface: "rgba(15, 23, 42, 0.78)",
        card: "rgba(30, 41, 59, 0.74)",
        border: "rgba(148, 163, 184, 0.22)",
        shadow: "rgba(0, 0, 0, 0.42)",
        priority: 1
    };

    const LOCAL_FALLBACK_THEMES = [
        DEFAULT_THEME,
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
            txtforsecondary: "#06140b",
            surface: "rgba(23, 42, 27, 0.82)",
            card: "rgba(33, 59, 38, 0.76)",
            border: "rgba(190, 242, 100, 0.24)",
            shadow: "rgba(0, 0, 0, 0.42)",
            priority: 2
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
            txtforsecondary: "#13061f",
            surface: "rgba(30, 18, 51, 0.84)",
            card: "rgba(49, 32, 82, 0.76)",
            border: "rgba(251, 191, 36, 0.24)",
            shadow: "rgba(0, 0, 0, 0.46)",
            priority: 3
        }
    ];

    const ThemeController = {
        root: null,
        panel: null,
        grid: null,
        status: null,
        currentName: null,
        app: null,
        themes: [],
        activeTheme: null,
        isOpen: false,

        async init(context = {}) {
            this.app = context.app || window.ElectriCredit || null;

            if (!window.ThemeStructure || !window.ThemeDesign) {
                console.warn("ThemeStructure or ThemeDesign is missing.");
                return;
            }

            window.ThemeDesign.inject();

            this.mountRoot();
            this.cacheElements();
            this.bindEvents();

            this.loadLocalTheme();
            await this.loadThemes();

            this.renderThemes();
            this.updateCurrentName();
        },

        mountRoot() {
            let root = document.querySelector("[data-theme-root]");

            if (!root) {
                root = document.createElement("div");
                root.className = "ec-theme-root";
                root.dataset.themeRoot = "true";
                document.body.appendChild(root);
            }

            root.innerHTML = window.ThemeStructure.renderModal();
            this.root = root;
        },

        cacheElements() {
            this.panel = this.root.querySelector("[data-theme-panel]");
            this.grid = this.root.querySelector("[data-theme-grid]");
            this.status = this.root.querySelector("[data-theme-status]");
            this.currentName = this.root.querySelector("[data-theme-current-name]");
        },

        bindEvents() {
            /*
              Capture header Theme icon click before fallback modal.
            */
            document.addEventListener(
                "click",
                (event) => {
                    const button = event.target.closest("[data-theme-open]");
                    if (!button) return;

                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();

                    this.open();
                },
                true
            );

            this.root.addEventListener("click", (event) => {
                if (event.target.closest("[data-theme-close]")) {
                    this.close();
                    return;
                }

                if (event.target.closest("[data-theme-reset]")) {
                    this.applyTheme(DEFAULT_THEME, {
                        notify: true,
                        close: false,
                        animate: true,
                        event
                    });
                    return;
                }

                const card = event.target.closest("[data-theme-card]");
                if (card) {
                    const id = card.dataset.themeId;
                    const theme = this.themes.find((item) => String(item.id) === String(id));

                    if (theme) {
                        this.applyTheme(theme, {
                            notify: true,
                            close: true,
                            animate: true,
                            event
                        });
                    }
                }
            });

            window.addEventListener("electricredit:theme-open", (event) => {
                if (event.cancelable) event.preventDefault();
                this.open();
            });

            window.addEventListener("keydown", (event) => {
                if (event.key === "Escape" && this.isOpen) {
                    this.close();
                }
            });
        },

        open() {
            if (!this.panel) return;

            this.panel.hidden = false;
            this.isOpen = true;

            this.renderThemes();
            this.updateCurrentName();

            document.body.classList.add("ec-modal-open");
        },

        close() {
            if (!this.panel) return;

            this.panel.hidden = true;
            this.isOpen = false;

            document.body.classList.remove("ec-modal-open");
        },

        async loadThemes() {
            this.setStatus("Loading themes...", "");

            if (this.grid) {
                this.grid.innerHTML = window.ThemeStructure.renderLoadingCards();
            }

            try {
                const url = this.resolveRoute("themes", "/api/themes");
                const response = await fetch(url, {
                    cache: "no-store"
                });

                if (!response.ok) {
                    throw new Error(`Theme API failed: ${response.status}`);
                }

                const payload = await response.json();
                const data = Array.isArray(payload.data) ? payload.data : [];

                this.themes = data
                    .map((theme) => this.normalizeTheme(theme))
                    .sort((a, b) => Number(a.priority || 999) - Number(b.priority || 999));

                if (!this.themes.length) {
                    this.themes = LOCAL_FALLBACK_THEMES;
                    this.setStatus("No database themes found. Local fallback themes are loaded.", "warning");
                } else {
                    this.setStatus("Themes loaded from database.", "success");
                }
            } catch (error) {
                console.warn("Theme API unavailable:", error);
                this.themes = LOCAL_FALLBACK_THEMES;
                this.setStatus("Theme API is unavailable. Local fallback themes are loaded.", "warning");
            }
        },

        renderThemes() {
            if (!this.grid) return;

            if (!this.themes.length) {
                this.grid.innerHTML = window.ThemeStructure.renderEmpty();
                return;
            }

            const activeId = this.activeTheme?.id || localStorage.getItem(STORAGE_KEYS.themeId) || "";

            this.grid.innerHTML = this.themes
                .map((theme) => window.ThemeStructure.renderThemeCard(theme, activeId))
                .join("");
        },

        loadLocalTheme() {
            let theme = null;

            try {
                const raw = localStorage.getItem(STORAGE_KEYS.themeData);
                theme = raw ? JSON.parse(raw) : null;
            } catch (_) {
                theme = null;
            }

            if (!theme || typeof theme !== "object") {
                theme = DEFAULT_THEME;
            }

            this.applyTheme(theme, {
                notify: false,
                close: false,
                save: false
            });
        },

        async applyTheme(theme = {}, options = {}) {
            const config = Object.assign(
                {
                    notify: false,
                    close: false,
                    save: true,
                    animate: true,
                    event: null
                },
                options
            );

            const normalized = this.normalizeTheme(theme);
            this.activeTheme = normalized;

            if (config.animate) {
                await this.playThemeTransition(config.event);
            }

            if (this.app && typeof this.app.applyTheme === "function") {
                this.app.applyTheme(normalized);
            } else {
                this.applyCssVariables(normalized);
            }

            document.documentElement.classList.add("ec-theme-switching");

            window.setTimeout(() => {
                document.documentElement.classList.remove("ec-theme-switching");
            }, 520);

            document.body.style.animation = "ecThemeApplyPulse 420ms ease";
            window.setTimeout(() => {
                document.body.style.animation = "";
            }, 430);

            if (config.save) {
                try {
                    localStorage.setItem(STORAGE_KEYS.themeId, String(normalized.id || ""));
                    localStorage.setItem(STORAGE_KEYS.themeData, JSON.stringify(normalized));
                } catch (_) { }
            }

            this.updateCurrentName();
            this.renderThemes();

            if (config.notify) {
                this.notify("Theme applied", `${normalized.name} is now active on this browser.`, "success");
            }

            if (config.close) {
                window.setTimeout(() => this.close(), 120);
            }
        },

        playThemeTransition(event = null) {
            return new Promise((resolve) => {
                const overlay = document.createElement("div");
                overlay.className = "ec-theme-transition-overlay";

                const x = event?.clientX ?? window.innerWidth / 2;
                const y = event?.clientY ?? window.innerHeight / 2;

                overlay.style.setProperty("--theme-x", `${x}px`);
                overlay.style.setProperty("--theme-y", `${y}px`);

                document.body.appendChild(overlay);

                window.requestAnimationFrame(() => {
                    overlay.classList.add("is-active");
                });

                window.setTimeout(() => {
                    overlay.classList.add("is-leaving");
                    overlay.classList.remove("is-active");
                    resolve();
                }, 180);

                window.setTimeout(() => {
                    overlay.remove();
                }, 620);
            });
        },

        applyCssVariables(theme = {}) {
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
                surface: "--ec-surface",
                card: "--ec-card",
                border: "--ec-border",
                shadow: "--ec-shadow"
            };

            Object.entries(map).forEach(([key, cssVar]) => {
                if (theme[key]) {
                    root.style.setProperty(cssVar, theme[key]);
                }
            });

            root.dataset.theme = theme.name || "Electric Default";
        },

        normalizeTheme(theme = {}) {
            if (window.ThemeStructure && typeof window.ThemeStructure.normalizeTheme === "function") {
                return window.ThemeStructure.normalizeTheme(theme);
            }

            return {
                id: theme.id ?? "",
                name: theme.name || "Electric Default",
                primary: theme.primary || theme.accent || "#38bdf8",
                secondary: theme.secondary || theme.success || "#22c55e",
                warning: theme.warning || "#f59e0b",
                danger: theme.danger || "#ef4444",
                bg1: theme.bg1 || theme.background || "#020617",
                bg2: theme.bg2 || "#0f172a",
                txtforbg1: theme.txtforbg1 || theme.text || "#f8fafc",
                txtforbg2: theme.txtforbg2 || theme.muted_text || "#cbd5e1",
                txtforprimary: theme.txtforprimary || "#021018",
                txtforsecondary: theme.txtforsecondary || "#02140a",
                surface: theme.surface || "rgba(15, 23, 42, 0.78)",
                card: theme.card || "rgba(30, 41, 59, 0.74)",
                border: theme.border || "rgba(148, 163, 184, 0.22)",
                shadow: theme.shadow || "rgba(0, 0, 0, 0.42)",
                priority: theme.priority ?? 1
            };
        },

        updateCurrentName() {
            if (!this.currentName) return;

            this.currentName.textContent = this.activeTheme?.name || "Electric Default";
        },

        setStatus(message, type = "") {
            if (!this.status) return;

            this.status.textContent = message;
            this.status.classList.remove("is-success", "is-warning");

            if (type === "success") {
                this.status.classList.add("is-success");
            }

            if (type === "warning") {
                this.status.classList.add("is-warning");
            }
        },

        resolveRoute(name, fallback) {
            if (window.ElectriCreditRoute && typeof window.ElectriCreditRoute === "function") {
                return window.ElectriCreditRoute(name);
            }

            if (this.app && typeof this.app.route === "function") {
                return this.app.route(name);
            }

            const routes = window.ElectriCreditRoutes || {};
            const target = routes[name];

            if (typeof target === "string") {
                return target;
            }

            return fallback;
        },

        notify(title, message, type = "info") {
            if (this.app && typeof this.app.toast === "function") {
                this.app.toast(title, message, type);
                return;
            }

            console.log(`[${type}] ${title}: ${message}`);
        }
    };

    window.ThemeController = ThemeController;
    window.ElectriCreditTheme = ThemeController;

    document.addEventListener("DOMContentLoaded", () => {
        ThemeController.init({
            app: window.ElectriCredit || null
        });
    });
})();