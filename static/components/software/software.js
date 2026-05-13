/* ELECTRICREDIT V2 - SOFTWARE CONTROLLER v4 */
(function () {
  "use strict";

  const C = {
    root: null,
    app: null,
    activeTab: "rates",
    summary: null,
    children: {},
    mounted: {},
    modalStack: [],

    async init(ctx = {}) {
      this.root = ctx.root || document.querySelector("#software-section");
      this.app = ctx.app || window.ElectriCredit || null;

      if (!this.root) return;
      if (!window.SoftwareStructure || !window.SoftwareDesign) {
        console.warn("SoftwareStructure or SoftwareDesign is missing.");
        return;
      }

      window.SoftwareDesign.inject();
      this.summary = await this.loadSummary();
      this.mount(this.summary);
      this.bindEvents();
      await this.showTab(this.activeTab);
    },

    async loadSummary() {
      try {
        return await this.postJson(this.route("softwareSummary", "/api/software/summary"), {});
      } catch (error) {
        console.warn("Software summary failed:", error);
        return {
          status: "error",
          data: {
            role: this.getCurrentUser()?.role || "VISITOR",
            access: {},
            counts: {},
            rates: {},
            device: {}
          }
        };
      }
    },

    mount(data = {}) {
      this.root.innerHTML = window.SoftwareStructure.render(data);
    },

    bindEvents() {
      if (this.root.dataset.softwareBound === "true") return;
      this.root.dataset.softwareBound = "true";

      this.root.addEventListener("click", async (event) => {
        const tab = event.target.closest("[data-software-tab]");
        if (tab) {
          if (tab.classList.contains("is-locked")) {
            this.toast("Locked", "Your current role cannot open this Software tool.", "warning");
            return;
          }
          await this.showTab(tab.dataset.softwareTab || "rates");
        }
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && this.modalStack.length) this.closeModal();
      });

      window.addEventListener("electricredit:auth-change", async () => {
        await this.refreshAll();
      });
    },

    async refreshAll() {
      this.summary = await this.loadSummary();
      const current = this.activeTab;
      this.root.dataset.softwareBound = "";
      this.mount(this.summary);
      this.mounted = {};
      this.children = {};
      this.bindEvents();
      await this.showTab(current);
    },

    async showTab(id) {
      const allowedTabs = ["rates", "wifi", "logs", "announcement", "bonus", "server", "database", "backup"];
      const safe = allowedTabs.includes(id) ? id : "rates";
      this.activeTab = safe;

      const meta = window.SoftwareStructure.modules.find((item) => item.id === safe) || window.SoftwareStructure.modules[0];

      this.root?.querySelectorAll("[data-software-tab]").forEach((tab) => {
        const active = tab.dataset.softwareTab === safe;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
      });

      this.root?.querySelectorAll("[data-software-panel]").forEach((panel) => {
        const active = panel.dataset.softwarePanel === safe;
        panel.classList.toggle("is-active", active);
        panel.hidden = !active;
      });

      const title = this.root?.querySelector("[data-software-title]");
      const subtitle = this.root?.querySelector("[data-software-subtitle]");
      if (title) title.textContent = meta.title;
      if (subtitle) subtitle.textContent = meta.subtitle;

      await this.mountChild(safe);
    },

    async mountChild(id) {
      if (this.mounted[id]) return;

      const map = {
        rates: window.SoftwareRates,
        wifi: window.SoftwareWifi,
        logs: window.SoftwareLogs,
        announcement: window.SoftwareAnnouncement,
        bonus: window.SoftwareBonus,
        server: window.SoftwareServer,
        database: window.SoftwareDatabase,
        backup: window.SoftwareBackup
      };

      const mount = this.root?.querySelector(`[data-software-mount="${id}"]`);
      const ctrl = map[id];

      if (!mount || !ctrl || typeof ctrl.init !== "function") {
        if (mount) {
          mount.innerHTML = `<div class="ec-software-empty"><div><strong>Component missing</strong><p>${this.escapeHtml(id)} component is not loaded.</p></div></div>`;
        }
        return;
      }

      this.children[id] = ctrl;
      await ctrl.init({
        root: mount,
        app: this.app,
        parent: this,
        summary: window.SoftwareStructure.normalizeSummary(this.summary)
      });
      this.mounted[id] = true;
    },

    getCurrentUser() {
      const candidates = [
        this.app?.app?.currentUser,
        this.app?.currentUser,
        window.ElectriCreditApp?.currentUser,
        window.ProfileController?.currentUser,
        window.ElectriCredit?.app?.currentUser,
        window.ElectriCredit?.currentUser
      ];

      for (const user of candidates) {
        if (user && typeof user === "object" && user.role) return user;
      }

      try {
        const raw = localStorage.getItem("electricredit.auth");
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && parsed.role) return parsed;
      } catch {}

      const role = document.documentElement.dataset.role;
      if (role && role !== "VISITOR") return { id: "", name: role, username: role.toLowerCase(), role };

      return null;
    },

    getRoleLevel(role) {
      return { VISITOR: 0, USER: 0, ADMINISTRATOR: 1, OWNER: 2, DEVELOPER: 3 }[String(role || "VISITOR").toUpperCase()] || 0;
    },

    hasRole(role) {
      return this.getRoleLevel(this.getCurrentUser()?.role) >= this.getRoleLevel(role);
    },

    getActorPayload() {
      const user = this.getCurrentUser();
      const role = String(user?.role || "VISITOR").toUpperCase();
      const id = user?.id || user?.account_id || user?.superuser_id || "";

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

      const target = window.ElectriCreditRoutes?.[name] || window.ECRoutes?.[name];
      if (typeof target === "string") return target;
      if (typeof target === "function") return target(...args);

      return fallback;
    },

    async requestJson(url, options = {}) {
      if (this.app && typeof this.app.requestJson === "function") return this.app.requestJson(url, options);

      const response = await fetch(url, Object.assign({ cache: "no-store" }, options));
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.status === "error") {
        throw new Error(payload.message || `Request failed (${response.status}).`);
      }

      return payload;
    },

    getJson(url) {
      return this.app && typeof this.app.getJson === "function"
        ? this.app.getJson(url)
        : this.requestJson(url, { method: "GET" });
    },

    postJson(url, body = {}) {
      const payload = Object.assign({}, body, this.getActorPayload());
      return this.app && typeof this.app.postJson === "function"
        ? this.app.postJson(url, payload)
        : this.requestJson(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
    },

    putJson(url, body = {}) {
      const payload = Object.assign({}, body, this.getActorPayload());
      return this.app && typeof this.app.putJson === "function"
        ? this.app.putJson(url, payload)
        : this.requestJson(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
    },

    deleteJson(url, body = {}) {
      const payload = Object.assign({}, body, this.getActorPayload());
      return this.app && typeof this.app.deleteJson === "function"
        ? this.app.deleteJson(url, payload)
        : this.requestJson(url, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
    },

    toast(title, text = "", type = "info") {
      return this.app && typeof this.app.toast === "function"
        ? this.app.toast(title, text, type)
        : console.log(`[${type}] ${title}`, text);
    },

    openModal(options = {}) {
      const root = document.querySelector("#modal-root");
      if (!root) return null;

      this.modalStack.forEach((modal) => { modal.hidden = true; });

      const wrapper = document.createElement("div");
      wrapper.className = "ec-modal-backdrop";
      wrapper.dataset.modal = "active";
      wrapper.dataset.softwareModal = "true";
      wrapper.innerHTML = `
        <article class="ec-modal ${this.escapeHtml(options.sizeClass || "")}" role="dialog" aria-modal="true">
          <header class="ec-modal-header">
            <h2 class="ec-modal-title">${this.escapeHtml(options.title || "Software")}</h2>
            <button class="ec-icon-btn" type="button" data-software-modal-close aria-label="Close modal">✕</button>
          </header>
          <div class="ec-modal-body">${options.body || ""}</div>
          ${options.footer ? `<footer class="ec-modal-footer">${options.footer}</footer>` : ""}
        </article>
      `;

      root.appendChild(wrapper);
      this.modalStack.push(wrapper);
      document.body.classList.add("ec-modal-open");

      wrapper.addEventListener("click", (event) => {
        if (event.target === wrapper || event.target.closest("[data-software-modal-close]") || event.target.closest("[data-modal-close]")) {
          this.closeModal();
        }
      });

      return wrapper;
    },

    closeModal() {
      const modal = this.modalStack.pop();
      if (modal) modal.remove();

      const previous = this.modalStack[this.modalStack.length - 1];
      if (previous) previous.hidden = false;
      else document.body.classList.remove("ec-modal-open");
    },

    openConfirm(options = {}) {
      if (window.ElectriCreditValidator && typeof window.ElectriCreditValidator.openConfirm === "function") {
        return window.ElectriCreditValidator.openConfirm(this, options);
      }

      console.warn("ElectriCreditValidator is missing. Using Software fallback confirm.");
      return this.openConfirmFallback(options);
    },

    openConfirmFallback(options = {}) {
      const code = options.code || fallbackRandomCode(16);
      const modal = this.openModal({
        title: options.title || "Confirm Action",
        body: `
          <div class="ec-software-modal-body ec-software-confirm">
            <div class="ec-software-note">${this.escapeHtml(options.message || "This action requires confirmation.")}</div>
            <div class="ec-software-field ec-software-nocopy">
              <span>Confirmation code</span>
              <input type="text" value="${this.escapeHtml(code)}" readonly oncopy="return false" oncut="return false" oncontextmenu="return false">
            </div>
            <div class="ec-software-field">
              <span>Type the confirmation code</span>
              <input type="text" data-confirm-input autocomplete="off">
            </div>
          </div>
        `,
        footer: `
          <button class="ec-software-btn" type="button" data-modal-close>Cancel</button>
          <button class="ec-software-btn ec-software-btn-danger" type="button" data-confirm-proceed disabled>Proceed</button>
        `
      });

      const input = modal?.querySelector("[data-confirm-input]");
      const proceed = modal?.querySelector("[data-confirm-proceed]");
      input?.addEventListener("input", () => {
        if (proceed) proceed.disabled = input.value.trim() !== code;
      });

      proceed?.addEventListener("click", async () => {
        const typed = String(input?.value || "").trim();
        if (typed !== code) {
          this.toast("Code does not match", "Type the exact generated confirmation code.", "danger");
          return;
        }

        await options.onConfirm?.({ confirmation_code: code, confirmation_text: typed });
      });

      return modal;
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

  function fallbackRandomCode(length = 16) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?";
    let output = "";
    for (let i = 0; i < length; i += 1) output += chars[Math.floor(Math.random() * chars.length)];
    return output;
  }

  window.SoftwareController = C;
  window.ElectriCreditSoftware = C;
})();
