/* =========================================================
   ELECTRICREDIT V2 - DASHBOARD CONTROLLER
   File: static/components/dashboard/dashboard.js
   Purpose: Mount dashboard shell and lazy-load child charts safely
   ========================================================= */

(function () {
  "use strict";

  const DashboardController = {
    root: null,
    app: null,
    activeTab: "power",
    initialized: false,
    childControllers: {},
    childReady: {},
    resizeHandler: null,

    async init(context = {}) {
      if (this.initialized) return;
      this.initialized = true;

      this.app = context.app || window.ElectriCredit || null;

      if (!window.DashboardStructure || !window.DashboardDesign) {
        console.warn("DashboardStructure or DashboardDesign is missing.");
        return;
      }

      window.DashboardDesign.inject();

      const summary = await this.loadSummary();
      this.mount(summary);
      this.bindEvents();
      await this.showTab(this.activeTab);
    },

    async loadSummary() {
      try {
        const payload = await this.getJson(this.route("dashboardSummary", "/api/dashboard/summary"));
        return unwrapData(payload);
      } catch (error) {
        console.warn("Dashboard summary failed:", error);
        return { counts: {} };
      }
    },

    mount(data = {}) {
      const host =
        document.querySelector("#dashboard-section") ||
        document.querySelector("[data-section='dashboard']") ||
        document.querySelector("#dashboard");

      if (!host) {
        console.warn("Dashboard host was not found. Expected #dashboard-section.");
        return;
      }

      host.innerHTML = window.DashboardStructure.render(data);
      this.root = host;
    },

    bindEvents() {
      if (!this.root) return;

      this.root.addEventListener("click", (event) => {
        const tab = event.target.closest("[data-dashboard-tab]");
        if (!tab) return;
        this.showTab(tab.dataset.dashboardTab || "power");
      });

      this.resizeHandler = this.debounce(() => {
        Object.values(this.childControllers).forEach((controller) => {
          if (controller && typeof controller.resize === "function") controller.resize();
        });
      }, 150);

      window.addEventListener("resize", this.resizeHandler);
    },

    async showTab(tabId) {
      if (!this.root) return;

      const safeTab = ["power", "hub", "user", "usage"].includes(tabId) ? tabId : "power";
      this.activeTab = safeTab;

      this.root.querySelectorAll("[data-dashboard-tab]").forEach((tab) => {
        const active = tab.dataset.dashboardTab === safeTab;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
      });

      this.root.querySelectorAll("[data-dashboard-panel]").forEach((panel) => {
        const active = panel.dataset.dashboardPanel === safeTab;
        panel.classList.toggle("is-active", active);
        panel.hidden = !active;
      });

      const activeButton = this.root.querySelector(`[data-dashboard-tab="${safeTab}"]`);
      const title = this.root.querySelector("[data-dashboard-title]");
      if (title && activeButton) title.textContent = activeButton.dataset.dashboardTabTitle || `${safeTab} analytics`;

      await this.ensureChild(safeTab);

      const controller = this.childControllers[safeTab];
      if (controller && typeof controller.resize === "function") {
        requestAnimationFrame(() => {
          controller.resize();
          if (typeof controller.draw === "function") controller.draw();
        });
      }
    },

    async ensureChild(tabId) {
      if (this.childReady[tabId]) return;

      const controllers = {
        power: window.PowerDashboard,
        hub: window.HubDashboard,
        user: window.UserDashboard,
        usage: window.UsageDashboard
      };

      const controller = controllers[tabId];
      const mount = this.root?.querySelector(`[data-dashboard-mount="${tabId}"]`);

      if (!controller || typeof controller.init !== "function" || !mount) {
        console.warn(`Dashboard child "${tabId}" is missing.`);
        return;
      }

      this.childControllers[tabId] = controller;
      await controller.init({
        root: mount,
        app: this.app,
        parent: this
      });
      this.childReady[tabId] = true;
    },

    async ensureECharts() {
      if (window.echarts) return window.echarts;

      await new Promise((resolve, reject) => {
        const existing = document.querySelector("script[data-echarts-loader]");
        if (existing) {
          existing.addEventListener("load", resolve, { once: true });
          existing.addEventListener("error", reject, { once: true });
          return;
        }

        const script = document.createElement("script");
        script.src = "/static/components/dashboard/echarts.min.js";
        script.dataset.echartsLoader = "true";
        script.onload = resolve;
        script.onerror = () => reject(new Error("echarts.min.js failed to load."));
        document.head.appendChild(script);
      });

      if (!window.echarts) throw new Error("ECharts is not available after loading.");
      return window.echarts;
    },

    route(name, fallback) {
      if (this.app && typeof this.app.route === "function") {
        const value = this.app.route(name);
        if (value && value !== name) return value;
      }

      const target = window.ElectriCreditRoutes?.[name];
      if (typeof target === "string") return target;
      if (typeof target === "function") return target();

      const defaultRoutes = {
        dashboardSummary: "/api/dashboard/summary",
        dashboardPower: "/api/dashboard/power",
        dashboardHub: "/api/dashboard/hub",
        dashboardUser: "/api/dashboard/user",
        dashboardUsage: "/api/dashboard/usage"
      };

      return defaultRoutes[name] || fallback;
    },

    async getJson(url) {
      if (this.app && typeof this.app.getJson === "function") return this.app.getJson(url);

      const response = await fetch(url, {
        cache: "no-store",
        headers: { "Accept": "application/json" }
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.status === "error") {
        throw new Error(payload.message || `Request failed (${response.status}).`);
      }
      return payload;
    },

    debounce(callback, delay = 150) {
      let timer = null;
      return (...args) => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => callback(...args), delay);
      };
    }
  };

  function unwrapData(payload) {
    if (!payload) return {};
    if (payload.data !== undefined) return payload.data;
    if (payload.result !== undefined) return payload.result;
    return payload;
  }

  window.DashboardController = DashboardController;
  window.ElectriCreditDashboard = DashboardController;

  document.addEventListener("DOMContentLoaded", () => {
    /*
      script.js mounts this component through ElectriCreditDashboard.
      This fallback only runs if the global app brain is not available.
    */
    if (!window.ElectriCreditApp) {
      DashboardController.init({ app: window.ElectriCredit || null });
    }
  });
})();
