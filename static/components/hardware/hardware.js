/* =========================================================
   ELECTRICREDIT V2 - HARDWARE CONTROLLER
   File: static/components/hardware/hardware.js
   Purpose:
   - Mount Hardware shell
   - Manage Hub / Registry tab pagination
   - Shared routes, permissions, modals, auth helpers
   ========================================================= */

(function () {
  "use strict";

  const HardwareController = {
    root: null,
    app: null,
    activeTab: "hub",
    childControllers: {},
    childMounted: {},

    async init(context = {}) {
      this.root = context.root || document.querySelector("#hardware-section");
      this.app = context.app || window.ElectriCredit || null;

      if (!this.root) return;

      if (!window.HardwareStructure || !window.HardwareDesign) {
        console.warn("HardwareStructure or HardwareDesign is missing.");
        return;
      }

      window.HardwareDesign.inject();

      const summary = await this.loadSummary();
      this.mount(summary);
      this.bindEvents();
      await this.showTab(this.activeTab);
    },

    async loadSummary() {
      try {
        return await this.getJson(this.route("hardwareSummary", "/api/hardware/summary"));
      } catch (error) {
        console.warn("Hardware summary failed:", error);
        return {
          data: {
            hubs: { total: 0, online: 0, available: 0 },
            registry_stations: { total: 0, online: 0, available: 0 }
          }
        };
      }
    },

    mount(data = {}) {
      this.root.innerHTML = window.HardwareStructure.render(data);
    },

    bindEvents() {
      this.root?.addEventListener("click", async (event) => {
        const tab = event.target.closest("[data-hardware-tab]");
        if (!tab) return;

        await this.showTab(tab.dataset.hardwareTab || "hub");
      });

      window.addEventListener("electricredit:auth-change", () => {
        this.refreshActive();
      });
    },

    async refreshActive() {
      const controller = this.childControllers[this.activeTab];
      if (controller && typeof controller.refresh === "function") {
        await controller.refresh();
      }
    },

    async refreshAll() {
      const summary = await this.loadSummary();
      const status = this.root?.querySelector(".ec-hardware-status");
      if (status) {
        const parsed = window.HardwareStructure.normalizeSummary(summary);
        status.innerHTML = `
          ${this.renderStatusCard("Hub Modules", parsed.hubs)}
          ${this.renderStatusCard("Registry", parsed.registryStations)}
          ${this.renderStatusCard("Online", parsed.online)}
          ${this.renderStatusCard("Available", parsed.available)}
        `;
      }

      for (const controller of Object.values(this.childControllers)) {
        if (controller && typeof controller.refresh === "function") await controller.refresh();
      }
    },

    renderStatusCard(label, value) {
      return `
        <article class="ec-hardware-stat">
          <span>${this.escapeHtml(label)}</span>
          <strong>${this.escapeHtml(value)}</strong>
        </article>
      `;
    },

    async mountChild(tabId) {
      if (this.childMounted[tabId]) return;

      const controllers = {
        hub: window.HardwareHub,
        registry: window.HardwareRegistry
      };

      const controller = controllers[tabId];
      const mount = this.root?.querySelector(`[data-hardware-mount="${tabId}"]`);

      if (!mount || !controller || typeof controller.init !== "function") {
        if (mount) {
          mount.innerHTML = `
            <div class="ec-hardware-empty">
              <div>
                <strong>Component missing</strong>
                <p>The ${this.escapeHtml(tabId)} hardware component is not loaded. Check the script path and order in index.html.</p>
              </div>
            </div>
          `;
        }
        return;
      }

      this.childControllers[tabId] = controller;

      await controller.init({
        root: mount,
        app: this.app,
        parent: this
      });

      this.childMounted[tabId] = true;
    },

    async showTab(tabId) {
      const safeTab = ["hub", "registry"].includes(tabId) ? tabId : "hub";
      this.activeTab = safeTab;

      const tabMeta = window.HardwareStructure.tabs.find((tab) => tab.id === safeTab) || window.HardwareStructure.tabs[0];

      this.root?.querySelectorAll("[data-hardware-tab]").forEach((tab) => {
        const active = tab.dataset.hardwareTab === safeTab;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
      });

      this.root?.querySelectorAll("[data-hardware-panel]").forEach((panel) => {
        const active = panel.dataset.hardwarePanel === safeTab;
        panel.classList.toggle("is-active", active);
        panel.hidden = !active;
      });

      const title = this.root?.querySelector("[data-hardware-title]");
      const subtitle = this.root?.querySelector("[data-hardware-subtitle]");

      if (title) title.textContent = tabMeta.title;
      if (subtitle) subtitle.textContent = tabMeta.subtitle;

      await this.mountChild(safeTab);
    },

    getCurrentUser() {
      const candidates = [
        this.app?.app?.currentUser,
        window.ElectriCreditApp?.currentUser,
        window.ProfileController?.currentUser,
        window.ElectriCredit?.app?.currentUser
      ];

      for (const user of candidates) {
        if (user && typeof user === "object" && user.role) return user;
      }

      try {
        const raw = localStorage.getItem("electricredit.auth");
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && parsed.role) return parsed;
      } catch (_) {}

      const role = document.documentElement.dataset.role;
      if (role && role !== "VISITOR") {
        return {
          id: "",
          name: role,
          username: role.toLowerCase(),
          role
        };
      }

      return null;
    },

    getRoleLevel(role) {
      const levels = {
        VISITOR: 0,
        ADMINISTRATOR: 1,
        OWNER: 2,
        DEVELOPER: 3
      };
      return levels[String(role || "VISITOR").toUpperCase()] || 0;
    },

    hasRole(requiredRole) {
      const user = this.getCurrentUser();
      return this.getRoleLevel(user?.role) >= this.getRoleLevel(requiredRole);
    },

    getActorPayload() {
      const user = this.getCurrentUser();
      const role = String(user?.role || "VISITOR").toUpperCase();
      const id = user?.id || user?.account_id || "";

      return {
        actor_id: id,
        account_id: id,
        actor_role: role,
        author: id ? `${role}[${id}]` : role
      };
    },

    route(name, fallback, ...args) {
      if (this.app && typeof this.app.route === "function") {
        const value = this.app.route(name, ...args);
        if (value && value !== name) return value;
      }

      if (window.ElectriCreditRoute && typeof window.ElectriCreditRoute === "function") {
        const value = window.ElectriCreditRoute(name, ...args);
        if (value && value !== name) return value;
      }

      const target = window.ElectriCreditRoutes?.[name] || window.ECRoutes?.[name];
      if (typeof target === "string") return target;
      if (typeof target === "function") return target(...args);
      return fallback;
    },

    async requestJson(url, options = {}) {
      if (this.app && typeof this.app.requestJson === "function") {
        return this.app.requestJson(url, options);
      }

      const response = await fetch(url, Object.assign({ cache: "no-store" }, options));
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.status === "error") {
        const error = new Error(payload.message || `Request failed (${response.status}).`);
        error.status = response.status;
        error.payload = payload;
        error.data = payload.data || payload;
        error.code = payload.code || payload.data?.code || "";
        throw error;
      }

      return payload;
    },

    getJson(url) {
      if (this.app && typeof this.app.getJson === "function") return this.app.getJson(url);
      return this.requestJson(url, { method: "GET" });
    },

    postJson(url, body = {}) {
      const payload = Object.assign({}, body, this.getActorPayload());
      if (this.app && typeof this.app.postJson === "function") return this.app.postJson(url, payload);
      return this.requestJson(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    },

    putJson(url, body = {}) {
      const payload = Object.assign({}, body, this.getActorPayload());
      if (this.app && typeof this.app.putJson === "function") return this.app.putJson(url, payload);
      return this.requestJson(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    },

    deleteJson(url) {
      const actor = this.getActorPayload();
      return this.requestJson(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-Author": actor.author,
          "X-Account-ID": String(actor.actor_id || "")
        }
      });
    },

    toast(title, text = "", type = "info") {
      if (this.app && typeof this.app.toast === "function") {
        this.app.toast(title, text, type);
        return;
      }
      console.log(`[${type}] ${title}`, text);
    },

    openModal(options = {}) {
      if (this.app && typeof this.app.openModal === "function") {
        return this.app.openModal(options);
      }
      return null;
    },

    closeModal() {
      if (this.app && typeof this.app.closeModal === "function") {
        this.app.closeModal();
      }
    },

    openDangerConfirm(options = {}) {
      if (this.app && typeof this.app.openDangerConfirm === "function") {
        return this.app.openDangerConfirm(options);
      }

      if (window.confirm(options.message || "Continue?")) {
        options.onConfirm?.();
      }
      return null;
    },

    escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }
  };

  window.HardwareController = HardwareController;
  window.ElectriCreditHardware = HardwareController;
})();
