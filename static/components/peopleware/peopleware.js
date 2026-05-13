/* ELECTRICREDIT V2 - PEOPLEWARE CONTROLLER patch v11 */
(function () {
  "use strict";

  const C = {
    root: null, app: null, activeTab: "user", childControllers: {}, childMounted: {}, modalStack: [],

    async init(ctx = {}) {
      this.root = ctx.root || document.querySelector("#peopleware-section");
      this.app = ctx.app || window.ElectriCredit || null;
      if (!this.root) return;
      if (!window.PeoplewareStructure || !window.PeoplewareDesign) return console.warn("PeoplewareStructure or PeoplewareDesign is missing.");
      window.PeoplewareDesign.inject();
      this.mount(await this.loadSummary());
      this.bindEvents();
      await this.showTab(this.activeTab);
    },

    async loadSummary() {
      for (const url of uniq([this.route("peoplewareSummary", "/api/status"), this.route("status", "/api/status"), "/api/status"])) {
        try { return await this.getJson(url); } catch (e) { console.warn("Peopleware summary source failed:", url, e); }
      }
      return { data: { counts: { users: 0, cards: 0, administrators: 0, owners: 0, developers: 0 } } };
    },

    mount(d = {}) { this.root.innerHTML = window.PeoplewareStructure.render(d); },

    bindEvents() {
      this.root.addEventListener("click", async (e) => {
        const t = e.target.closest("[data-peopleware-tab]");
        if (t) return this.showTab(t.dataset.peoplewareTab || "user");

        const img = e.target.closest("[data-peopleware-image-preview]");
        if (img) return this.openImagePreview(img.dataset.peoplewareImagePreview || img.src, img.alt || "Image");

        const cp = e.target.closest("[data-copy-value]");
        if (cp) { await copyText(cp.dataset.copyValue || ""); this.toast("Copied", cp.dataset.copyValue || "Content copied.", "success"); }
      });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && this.modalStack.length) this.closeModal(); });
      window.addEventListener("electricredit:auth-change", () => this.refreshActive());
    },

    async refreshActive() {
      const c = this.childControllers[this.activeTab];
      if (c && typeof c.refresh === "function") await c.refresh();
    },

    async refreshAll() {
      const summary = await this.loadSummary();
      const p = window.PeoplewareStructure.normalizeSummary(summary);
      const st = this.root?.querySelector(".ec-peopleware-status");
      if (st) st.innerHTML = `${window.PeoplewareStructure.renderStatus("Users", p.users)}${window.PeoplewareStructure.renderStatus("Cards", p.cards)}${window.PeoplewareStructure.renderStatus("Operators", p.operators)}${window.PeoplewareStructure.renderStatus("Developers", p.developers)}`;
      for (const c of Object.values(this.childControllers)) if (c && typeof c.refresh === "function") await c.refresh();
    },

    async mountChild(id) {
      if (this.childMounted[id]) return;
      const map = { user: window.PeoplewareUser, administrator: window.PeoplewareAdministrator, developer: window.PeoplewareDeveloper };
      const ctrl = map[id];
      const mount = this.root?.querySelector(`[data-peopleware-mount="${id}"]`);
      if (!mount || !ctrl || typeof ctrl.init !== "function") {
        if (mount) mount.innerHTML = `<div class="ec-peopleware-empty"><div><strong>Component missing</strong><p>The ${this.escapeHtml(id)} Peopleware component is not loaded.</p></div></div>`;
        return;
      }
      this.childControllers[id] = ctrl;
      await ctrl.init({ root: mount, app: this.app, parent: this });
      this.childMounted[id] = true;
    },

    async showTab(id) {
      const safe = ["user", "administrator", "developer"].includes(id) ? id : "user";
      this.activeTab = safe;
      const meta = window.PeoplewareStructure.tabs.find((t) => t.id === safe) || window.PeoplewareStructure.tabs[0];
      this.root?.querySelectorAll("[data-peopleware-tab]").forEach((t) => {
        const a = t.dataset.peoplewareTab === safe;
        t.classList.toggle("is-active", a);
        t.setAttribute("aria-selected", String(a));
      });
      this.root?.querySelectorAll("[data-peopleware-panel]").forEach((p) => {
        const a = p.dataset.peoplewarePanel === safe;
        p.classList.toggle("is-active", a);
        p.hidden = !a;
      });
      const title = this.root?.querySelector("[data-peopleware-title]");
      const sub = this.root?.querySelector("[data-peopleware-subtitle]");
      if (title) title.textContent = meta.title;
      if (sub) sub.textContent = meta.subtitle;
      await this.mountChild(safe);
    },

    getCurrentUser() {
      const cand = [this.app?.app?.currentUser, this.app?.currentUser, window.ElectriCreditApp?.currentUser, window.ProfileController?.currentUser, window.ElectriCredit?.app?.currentUser, window.ElectriCredit?.currentUser];
      for (const u of cand) if (u && typeof u === "object" && u.role) return u;
      try { const raw = localStorage.getItem("electricredit.auth"), p = raw ? JSON.parse(raw) : null; if (p && p.role) return p; } catch {}
      const role = document.documentElement.dataset.role;
      if (role && role !== "VISITOR") return { id: "", name: role, username: role.toLowerCase(), role };
      return null;
    },
    getRoleLevel(r) { return { VISITOR: 0, USER: 0, ADMINISTRATOR: 1, OWNER: 2, DEVELOPER: 3 }[String(r || "VISITOR").toUpperCase()] ?? 0; },
    hasRole(r) { return this.getRoleLevel(this.getCurrentUser()?.role) >= this.getRoleLevel(r); },
    isFirstDeveloper() {
      const u = this.getCurrentUser();
      const id = Number(u?.id || u?.account_id || u?.superuser_id || 0);
      return String(u?.role || "").toUpperCase() === "DEVELOPER" && id === 1;
    },
    getActorPayload() {
      const u = this.getCurrentUser();
      const role = String(u?.role || "VISITOR").toUpperCase();
      const id = u?.id || u?.account_id || u?.superuser_id || "";
      return { actor_id: id, account_id: id, actor_role: role, author: id ? `${role}[${id}]` : role };
    },
    route(name, fallback, ...args) {
      if (this.app && typeof this.app.route === "function") {
        const v = this.app.route(name, ...args);
        if (v && v !== name) return v;
      }
      const target = window.ElectriCreditRoutes?.[name] || window.ECRoutes?.[name];
      if (typeof target === "string") return target;
      if (typeof target === "function") return target(...args);
      return fallback;
    },
    async requestJson(url, opt = {}) {
      if (this.app && typeof this.app.requestJson === "function") return this.app.requestJson(url, opt);
      const r = await fetch(url, Object.assign({ cache: "no-store" }, opt));
      const p = await r.json().catch(() => ({}));
      if (!r.ok || p.status === "error") throw new Error(p.message || `Request failed (${r.status}).`);
      return p;
    },
    getJson(url) { return this.app && typeof this.app.getJson === "function" ? this.app.getJson(url) : this.requestJson(url, { method: "GET" }); },
    postJson(url, b = {}) {
      const payload = Object.assign({}, b, this.getActorPayload());
      return this.app && typeof this.app.postJson === "function" ? this.app.postJson(url, payload) : this.requestJson(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    },
    putJson(url, b = {}) {
      const payload = Object.assign({}, b, this.getActorPayload());
      return this.app && typeof this.app.putJson === "function" ? this.app.putJson(url, payload) : this.requestJson(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    },
    deleteJson(url, b = {}) {
      const payload = Object.assign({}, b, this.getActorPayload());
      return this.app && typeof this.app.deleteJson === "function" ? this.app.deleteJson(url, payload) : this.requestJson(url, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    },
    toast(t, x = "", type = "info") { return this.app && typeof this.app.toast === "function" ? this.app.toast(t, x, type) : console.log(`[${type}] ${t}`, x); },

    openModal(o = {}) {
      const root = document.querySelector("#modal-root");
      if (!root) return null;
      this.modalStack.forEach((m) => { m.hidden = true; });
      const w = document.createElement("div");
      w.className = "ec-modal-backdrop";
      w.dataset.modal = "active";
      w.dataset.peoplewareModal = "true";
      w.innerHTML = `<article class="ec-modal ${this.escapeHtml(o.sizeClass || "")}" role="dialog" aria-modal="true"><header class="ec-modal-header"><h2 class="ec-modal-title">${this.escapeHtml(o.title || "Peopleware")}</h2><button class="ec-icon-btn" type="button" data-peopleware-modal-close aria-label="Close modal">✕</button></header><div class="ec-modal-body">${o.body || ""}</div>${o.footer ? `<footer class="ec-modal-footer">${o.footer}</footer>` : ""}</article>`;
      root.appendChild(w);
      this.modalStack.push(w);
      document.body.classList.add("ec-modal-open");
      w.addEventListener("click", (e) => {
        if (e.target === w || e.target.closest("[data-peopleware-modal-close]") || e.target.closest("[data-modal-close]")) this.closeModal();
      });
      this.setupImagePickers(w);
      return w;
    },
    closeModal() {
      const m = this.modalStack.pop();
      if (m) m.remove();
      const prev = this.modalStack[this.modalStack.length - 1];
      if (prev) prev.hidden = false;
      else document.body.classList.remove("ec-modal-open");
    },
    openImagePreview(src, title = "Image") {
      this.openModal({ title, body: `<div style="display:grid;place-items:center"><img class="ec-image-preview-large" src="${this.escapeHtml(src)}" alt="${this.escapeHtml(title)}"></div>`, footer: `<button class="ec-btn" type="button" data-modal-close>Close</button>` });
    },
    setupImagePickers(scope = document) {
      scope.querySelectorAll("[data-image-picker]").forEach((picker) => {
        if (picker.dataset.bound === "true") return;
        picker.dataset.bound = "true";
        const upload = picker.querySelector("[data-image-upload]");
        const camera = picker.querySelector("[data-image-camera]");
        const hidden = picker.querySelector("[data-image-value]");
        const preview = picker.querySelector("[data-image-preview]");
        picker.querySelector("[data-image-upload-btn]")?.addEventListener("click", () => upload?.click());
        picker.querySelector("[data-image-camera-btn]")?.addEventListener("click", () => camera?.click());
        picker.querySelector("[data-image-clear-btn]")?.addEventListener("click", () => { if (hidden) hidden.value = ""; if (preview) preview.src = "/static/assets/default-image.png"; });
        [upload, camera].forEach((input) => input?.addEventListener("change", async () => {
          const file = input.files?.[0];
          if (!file) return;
          try {
            const dataUrl = await imageToDataUrl(file);
            if (hidden) hidden.value = dataUrl;
            if (preview) preview.src = dataUrl;
            this.toast("Image ready", "Image will be saved when you save this record.", "success");
          } catch (e) { this.toast("Image failed", e.message || "Unable to load image.", "danger"); }
        }));
      });
    },
    openDangerConfirm(o = {}) {
      const code = randomCode(12);
      const m = this.openModal({ title: o.title || "Confirm Action", body: `<div class="ec-peopleware-note">${this.escapeHtml(o.message || "This action will change system records.")}</div><div class="ec-peopleware-detail" style="margin-top:.75rem"><span>Confirmation code</span><strong>${this.escapeHtml(code)}</strong></div><label class="ec-peopleware-form-field" style="margin-top:.75rem;display:block"><span>Paste confirmation code</span><input type="text" data-danger-code-input autocomplete="off"></label>`, footer: `<button class="ec-btn" type="button" data-modal-close>Cancel</button><button class="ec-btn ec-btn-danger" type="button" data-danger-confirm>Proceed</button>` });
      m?.querySelector("[data-danger-confirm]")?.addEventListener("click", async () => {
        const v = String(m.querySelector("[data-danger-code-input]")?.value || "").trim();
        if (v !== code) return this.toast("Code does not match", "Paste the exact generated confirmation code.", "danger");
        try { await o.onConfirm?.(); this.closeModal(); }
        catch (e) { this.toast("Action failed", e.message || "Unable to complete action.", "danger"); }
      });
    },
    formToObject(form) {
      const data = new FormData(form), out = {};
      for (const [k, v] of data.entries()) {
        const clean = String(v || "").trim();
        if (["balance", "amount", "used_kwh", "limit", "debt_limit", "credit_limit"].includes(k)) out[k] = Number(clean || 0);
        else if (["emails", "numbers"].includes(k)) out[k] = clean ? [clean] : [];
        else if (k === "links") out[k] = parseLinks(clean);
        else out[k] = clean;
      }
      if ("gender" in out && !out.gender) out.gender = "Others";
      return out;
    },
    escapeHtml(v) { return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
  };

  function parseLinks(raw) {
    return String(raw || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length >= 2) return { label: parts[0] || "Link", url: parts.slice(1).join("|").trim() };
      return { label: "Link", url: line };
    });
  }
  function uniq(v) { return Array.from(new Set(v.filter(Boolean))); }
  function randomCode(n = 12) { const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let o = ""; for (let i = 0; i < n; i += 1) o += c[Math.floor(Math.random() * c.length)]; return o; }
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); }
    catch { const a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select(); document.execCommand("copy"); a.remove(); }
  }
  function imageToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Unable to read image."));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => resolve(String(reader.result || ""));
        img.onload = () => {
          const max = 760;
          let { width, height } = img;
          if (width > max || height > max) {
            const ratio = Math.min(max / width, max / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", .82));
        };
        img.src = String(reader.result || "");
      };
      reader.readAsDataURL(file);
    });
  }

  window.PeoplewareController = C;
  window.ElectriCreditPeopleware = C;
})();
