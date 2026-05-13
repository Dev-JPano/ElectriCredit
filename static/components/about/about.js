/* ELECTRICREDIT V2 - ABOUT CONTROLLER v2 */
(function () {
  "use strict";

  const C = {
    root: null,
    app: null,
    developers: [],

    async init(ctx = {}) {
      this.root = ctx.root || document.querySelector("#about-section");
      this.app = ctx.app || window.ElectriCredit || null;

      if (!this.root) return;
      if (!window.AboutStructure || !window.AboutDesign) {
        console.warn("AboutStructure or AboutDesign is missing.");
        return;
      }

      window.AboutDesign.inject();
      await this.loadDevelopers();
      this.render();
      this.bindEvents();
    },

    async loadDevelopers() {
      const urls = [
        this.route("peoplewareDevelopers", "/api/peopleware/developers"),
        this.route("developers", "/api/peopleware/developers"),
        "/api/peopleware/developers"
      ];

      for (const url of unique(urls)) {
        try {
          const payload = await this.getJson(url);
          const data = payload.data || payload;

          if (Array.isArray(data)) {
            this.developers = data;
            return;
          }

          if (Array.isArray(data.items)) {
            this.developers = data.items;
            return;
          }

          if (Array.isArray(data.developers)) {
            this.developers = data.developers;
            return;
          }

          if (Array.isArray(data.rows)) {
            this.developers = data.rows;
            return;
          }
        } catch (error) {
          console.warn("About developers source failed:", url, error);
        }
      }

      this.developers = [];
    },

    render() {
      const system = {
        name: "ElectriCredit v2",
        version: "Raspberry Pi + ESP32 electricity credit system"
      };

      this.root.innerHTML = window.AboutStructure.render({
        developers: this.developers,
        system
      });
    },

    bindEvents() {
      if (this.root.dataset.aboutBound === "true") return;
      this.root.dataset.aboutBound = "true";

      this.root.addEventListener("click", (event) => {
        const image = event.target.closest("[data-about-image]");
        if (image) this.previewImage(image.dataset.aboutImage || "");
      });
    },

    previewImage(src) {
      if (!src) return;

      const parent = window.PeoplewareController || window.SoftwareController || null;
      if (parent && typeof parent.openModal === "function") {
        parent.openModal({
          title: "Developer Image",
          body: `<div style="display:grid;place-items:center"><img src="${this.escapeHtml(src)}" alt="Developer image" style="width:min(76vw,520px);max-height:70vh;object-fit:contain;border-radius:1rem;border:1px solid var(--ec-border);background:color-mix(in srgb,var(--ec-bg1) 60%,transparent)"></div>`,
          footer: `<button class="ec-btn" type="button" data-modal-close>Close</button>`
        });
        return;
      }

      window.open(src, "_blank", "noopener,noreferrer");
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
      if (this.app && typeof this.app.requestJson === "function") {
        return this.app.requestJson(url, options);
      }

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

    escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }
  };

  function unique(list) {
    return Array.from(new Set(list.filter(Boolean)));
  }

  window.AboutController = C;
  window.ElectriCreditAbout = C;
})();
