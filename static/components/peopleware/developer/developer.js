/* PEOPLEWARE DEVELOPER CONTROLLER v12 */
(function () {
  "use strict";

  const D = {
    root: null,
    parent: null,
    items: [],
    state: { search: "", filter: "all", sort: "id" },

    async init(context = {}) {
      this.root = context.root;
      this.parent = context.parent || window.PeoplewareController;
      if (!this.root || !window.PeoplewareDeveloperStructure) return;
      window.PeoplewareDeveloperDesign?.inject?.();
      await this.refresh();
      this.bindEvents();
    },

    get access() {
      return {
        canCreate: this.parent?.isFirstDeveloper?.() || false,
        canEditItem: () => this.parent?.isFirstDeveloper?.() || false,
        canDeleteItem: () => this.parent?.isFirstDeveloper?.() || false
      };
    },

    async refresh() {
      this.root.innerHTML = `<div class="ec-peopleware-loading">Loading developers...</div>`;
      this.items = await this.loadData();
      this.render();
    },

    async loadData() {
      for (const url of uniq([
        this.parent.route("developers", "/api/superusers?role=DEVELOPER"),
        "/api/superusers?role=DEVELOPER",
        "/api/superusers"
      ])) {
        try {
          const payload = await this.parent.getJson(url);
          const data = payload.data || payload;
          if (Array.isArray(data)) return data;
          if (Array.isArray(data.items)) return data.items;
          if (Array.isArray(data.superusers)) return data.superusers;
          if (Array.isArray(data.developers)) return data.developers;
          if (Array.isArray(data.rows)) return data.rows;
        } catch (error) {
          console.warn("Peopleware developer source failed:", url, error);
        }
      }
      return [];
    },

    render() {
      this.root.innerHTML = window.PeoplewareDeveloperStructure.render({
        items: this.items,
        access: this.access,
        state: this.state
      });
    },

    renderListOnly() {
      const items = window.PeoplewareDeveloperStructure.normalizeItems(this.items);
      const filtered = window.PeoplewareDeveloperStructure.applyFilter(items, this.state);
      const mount = this.root.querySelector("[data-developer-list]");
      if (mount) mount.innerHTML = window.PeoplewareDeveloperStructure.renderList(filtered, this.access);
    },

    bindEvents() {
      this.root.addEventListener("input", (event) => {
        const search = event.target.closest("[data-developer-search]");
        if (!search) return;
        this.state.search = search.value || "";
        this.renderListOnly();
      });

      this.root.addEventListener("change", (event) => {
        const sort = event.target.closest("[data-developer-sort]");
        if (!sort) return;
        this.state.sort = sort.value || "id";
        this.renderListOnly();
      });

      this.root.addEventListener("click", async (event) => {
        if (event.target.closest("[data-developer-refresh]")) {
          await this.refresh();
          this.parent.toast("Developers refreshed", "Developer list has been reloaded.", "success");
          return;
        }

        if (event.target.closest("[data-developer-add]")) return this.openEditModal();

        const details = event.target.closest("[data-developer-details]");
        if (details) return this.openDetailsModal(details.dataset.developerDetails);

        const edit = event.target.closest("[data-developer-edit]");
        if (edit) return this.openEditModal(edit.dataset.developerEdit);

        const del = event.target.closest("[data-developer-delete]");
        if (del) return this.confirmDelete(del.dataset.developerDelete);
      });
    },

    findItem(id) {
      return window.PeoplewareDeveloperStructure.normalizeItems(this.items).find((item) => String(item.id) === String(id));
    },

    openDetailsModal(id) {
      const item = this.findItem(id);
      if (!item) return this.parent.toast("Developer not found", "Unable to locate this account.", "warning");

      const modal = this.parent.openModal({
        title: `${item.name || "Developer"} [${item.id}]`,
        sizeClass: "ec-modal-wide",
        body: window.PeoplewareDeveloperStructure.renderDetails(item),
        footer: `<button class="ec-btn" type="button" data-modal-close>Close</button><button class="ec-btn ec-btn-primary" type="button" data-modal-developer-edit="${this.parent.escapeHtml(item.id)}" ${this.access.canEditItem(item) ? "" : "disabled"}>Edit</button>`
      });

      modal?.querySelector("[data-modal-developer-edit]")?.addEventListener("click", () => this.openEditModal(item.id));
      this.bindModalCopy(modal);
    },

    openEditModal(id = "") {
      const edit = Boolean(id);
      const item = edit ? this.findItem(id) : { role: "DEVELOPER" };
      if (edit && !item) return this.parent.toast("Developer not found", "Unable to locate this account.", "warning");
      if (!this.parent?.isFirstDeveloper?.()) return this.parent.toast("Permission denied", "Only the first Developer account can manage developers.", "warning");

      const modal = this.parent.openModal({
        title: edit ? `Edit DEVELOPER [${item.id}]` : "Add Developer",
        body: window.PeoplewareDeveloperStructure.renderDeveloperForm(item || {}),
        footer: `<button class="ec-btn" type="button" data-modal-close>Cancel</button><button class="ec-btn ec-btn-primary" type="button" data-save-developer>${edit ? "Save Changes" : "Add Developer"}</button>`
      });

      modal?.querySelector("[data-save-developer]")?.addEventListener("click", async () => {
        const payload = this.parent.formToObject(modal.querySelector("[data-peopleware-superuser-form]"));
        payload.role = "DEVELOPER";
        delete payload.actual_role;
        delete payload.actual_roles;
        delete payload.project_roles;

        try {
          if (edit) {
            await this.parent.putJson(this.parent.route("superuserUpdate", `/api/superusers/${encodeURIComponent(item.id)}`, item.id), payload);
            this.parent.toast("Developer updated", `DEVELOPER [${item.id}] has been updated.`, "success");
          } else {
            await this.parent.postJson(this.parent.route("superuserCreate", "/api/superusers"), payload);
            this.parent.toast("Developer added", "New developer account has been added.", "success");
          }

          this.parent.closeModal();
          await this.refresh();
          await this.parent.refreshAll();
        } catch (error) {
          this.parent.toast("Save failed", error.message || "Unable to save developer.", "danger");
        }
      });
    },

    bindModalCopy(modal) {
      modal?.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-developer-copy]");
        if (!button) return;
        const value = button.dataset.developerCopy || "";
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          const area = document.createElement("textarea");
          area.value = value;
          document.body.appendChild(area);
          area.select();
          document.execCommand("copy");
          area.remove();
        }
        this.parent.toast("Copied", value || "Content copied.", "success");
      });
    },

    confirmDelete(id) {
      const item = this.findItem(id);
      if (!item) return this.parent.toast("Developer not found", "Unable to locate this account.", "warning");
      if (!this.parent?.isFirstDeveloper?.()) return this.parent.toast("Permission denied", "Only the first Developer account can delete developers.", "warning");

      this.parent.openDangerConfirm({
        title: `Delete DEVELOPER [${item.id}]`,
        message: `This will permanently delete DEVELOPER [${item.id}].`,
        onConfirm: async () => {
          await this.parent.deleteJson(this.parent.route("superuserDelete", `/api/superusers/${encodeURIComponent(item.id)}`, item.id), { role: "DEVELOPER" });
          this.parent.toast("Developer deleted", `DEVELOPER [${item.id}] has been deleted.`, "success");
          await this.refresh();
          await this.parent.refreshAll();
        }
      });
    }
  };

  function uniq(array) {
    return Array.from(new Set(array.filter(Boolean)));
  }

  window.PeoplewareDeveloper = D;
})();
