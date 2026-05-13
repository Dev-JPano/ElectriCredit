/* PEOPLEWARE USER CONTROLLER patch v11 */
(function () {
  "use strict";

  const U = {
    root: null,
    parent: null,
    items: [],
    state: { search: "", filter: "all", sort: "id" },

    async init(c = {}) {
      this.root = c.root;
      this.parent = c.parent || window.PeoplewareController;
      if (!this.root || !window.PeoplewareUserStructure) return;
      window.PeoplewareUserDesign?.inject?.();
      await this.refresh();
      this.bindEvents();
    },

    get access() {
      return {
        canCreate: this.parent?.hasRole?.("ADMINISTRATOR") || false,
        canEdit: this.parent?.hasRole?.("ADMINISTRATOR") || false,
        canDelete: this.parent?.hasRole?.("ADMINISTRATOR") || false,
        canDeleteAll: this.parent?.hasRole?.("OWNER") || false,
        canEditCard: this.parent?.hasRole?.("ADMINISTRATOR") || false,
        canTopUp: this.parent?.hasRole?.("ADMINISTRATOR") || false,
        canCreateCard: this.parent?.hasRole?.("ADMINISTRATOR") || false
      };
    },

    async refresh() {
      this.root.innerHTML = `<div class="ec-peopleware-loading">Loading users...</div>`;
      this.items = await this.loadData();
      this.render();
    },

    async loadData() {
      try {
        const p = await this.parent.getJson(this.parent.route("users", "/api/users"));
        const d = p.data || p;
        if (Array.isArray(d)) return d;
        if (Array.isArray(d.items)) return d.items;
        if (Array.isArray(d.users)) return d.users;
        if (Array.isArray(d.rows)) return d.rows;
        return [];
      } catch (e) {
        console.warn("Peopleware users failed:", e);
        return [];
      }
    },

    render() {
      this.root.innerHTML = window.PeoplewareUserStructure.render({
        items: this.items,
        access: this.access,
        state: this.state
      });
    },

    renderListOnly() {
      const items = window.PeoplewareUserStructure.normalizeItems(this.items);
      const filtered = window.PeoplewareUserStructure.applyFilter(items, this.state);
      const mount = this.root.querySelector("[data-user-list]");
      if (mount) mount.innerHTML = window.PeoplewareUserStructure.renderList(filtered, this.access);
    },

    bindEvents() {
      this.root.addEventListener("input", (e) => {
        const s = e.target.closest("[data-user-search]");
        if (!s) return;
        this.state.search = s.value || "";
        this.renderListOnly();
      });

      this.root.addEventListener("change", (e) => {
        const f = e.target.closest("[data-user-filter]");
        const sort = e.target.closest("[data-user-sort]");
        if (f) this.state.filter = f.value || "all";
        if (sort) this.state.sort = sort.value || "id";
        if (f || sort) this.renderListOnly();
      });

      this.root.addEventListener("click", async (e) => {
        if (e.target.closest("[data-user-refresh]")) {
          await this.refresh();
          this.parent.toast("Users refreshed", "User list has been reloaded.", "success");
          return;
        }
        if (e.target.closest("[data-user-add]")) return this.openEditModal();
        if (e.target.closest("[data-user-delete-all]")) return this.confirmDeleteAll();
        const det = e.target.closest("[data-user-details]");
        if (det) return this.openDetailsModal(det.dataset.userDetails);
        const ed = e.target.closest("[data-user-edit]");
        if (ed) return this.openEditModal(ed.dataset.userEdit);
        const del = e.target.closest("[data-user-delete]");
        if (del) return this.confirmDelete(del.dataset.userDelete);
      });
    },

    findItem(id) {
      return window.PeoplewareUserStructure.normalizeItems(this.items).find((r) => String(r.id) === String(id));
    },

    async loadCards(uid) {
      const item = this.findItem(uid);
      if (Array.isArray(item?.raw_cards) && item.raw_cards.length) return item.raw_cards;

      for (const url of uniq([
        this.parent.route("userCards", `/api/users/${encodeURIComponent(uid)}/cards`, uid),
        `/api/users/${encodeURIComponent(uid)}/cards`,
        this.parent.route("databaseTable", "/api/database/table/cards", "cards"),
        "/api/database/table/cards"
      ])) {
        try {
          const p = await this.parent.getJson(url);
          const d = p.data || p;
          let cards = [];
          if (Array.isArray(d)) cards = d;
          else if (Array.isArray(d.items)) cards = d.items;
          else if (Array.isArray(d.cards)) cards = d.cards;
          else if (Array.isArray(d.rows)) cards = d.rows;
          if (url.includes("/database/table/cards")) {
            cards = cards.filter((c) => String(c.user_id || c.owner_id || c.tenant_id || c.assigned_user_id || "") === String(uid));
          }
          if (cards.length) return cards;
        } catch (e) {
          console.warn("User cards source failed:", url, e);
        }
      }
      return [];
    },

    bindCardModalEvents(m, cards, userId) {
      m?.addEventListener("click", (e) => {
        const add = e.target.closest("[data-card-add]");
        if (add) return this.openCardCreateModal(userId);
        const x = e.target.closest("[data-card-expand]");
        if (x) {
          const c = findCard(cards, x.dataset.cardExpand);
          if (c) this.openCardDetailsModal(c);
          return;
        }
        const ed = e.target.closest("[data-card-edit]");
        if (ed) {
          const c = findCard(cards, ed.dataset.cardEdit);
          if (c) this.openCardEditModal(c);
          return;
        }
        const top = e.target.closest("[data-card-topup]");
        if (top) {
          const c = findCard(cards, top.dataset.cardTopup);
          if (c) this.openTopUpModal(c);
        }
      });
    },

    async openDetailsModal(id) {
      const item = this.findItem(id);
      if (!item) return this.parent.toast("User not found", "Unable to locate this user.", "warning");

      const cards = await this.loadCards(item.id);
      item.cards = cards.length || item.cards;
      item.total_card_balance = cards.length ? cards.reduce((s, c) => s + (Number(c.balance || 0) || 0), 0) : item.total_card_balance;
      item.has_debt = cards.some((c) => Number(c.balance || 0) < 0) || item.has_debt;

      const m = this.parent.openModal({
        title: `${item.name || "User"} [${item.id}]`,
        sizeClass: "ec-modal-wide",
        body: `${window.PeoplewareStructure.renderPersonDetails(item, { role: "USER" })}
          <div style="height:.85rem"></div>
          <div class="ec-peopleware-toolbar">
            <div><strong>Linked Cards</strong><span>Add, update, top up, or inspect RFID cards for this user.</span></div>
            <div class="ec-peopleware-actions">
              <button class="ec-peopleware-btn ec-peopleware-btn-primary" type="button" data-card-add="${this.parent.escapeHtml(item.id)}" ${this.access.canCreateCard ? "" : "disabled"}>Add Card</button>
            </div>
          </div>
          ${window.PeoplewareStructure.renderCardList(cards, { canEditCard: this.access.canEditCard, canTopUp: this.access.canTopUp })}`,
        footer: `<button class="ec-btn" type="button" data-modal-close>Close</button><button class="ec-btn ec-btn-primary" type="button" data-modal-user-edit="${this.parent.escapeHtml(item.id)}" ${this.access.canEdit ? "" : "disabled"}>Edit User</button>`
      });

      this.bindCardModalEvents(m, cards, item.id);
      m?.querySelector("[data-modal-user-edit]")?.addEventListener("click", () => this.openEditModal(item.id));
    },

    openEditModal(id = "") {
      const edit = Boolean(id);
      const item = edit ? this.findItem(id) : {};
      if (edit && !item) return this.parent.toast("User not found", "Unable to locate this user.", "warning");
      if ((edit && !this.access.canEdit) || (!edit && !this.access.canCreate)) return this.parent.toast("Permission denied", "Administrator, Owner, or Developer account is required.", "warning");

      const m = this.parent.openModal({
        title: edit ? `Edit ${item.name || "User"} [${item.id}]` : "Add User",
        body: window.PeoplewareStructure.renderUserForm(item || {}),
        footer: `<button class="ec-btn" type="button" data-modal-close>Cancel</button><button class="ec-btn ec-btn-primary" type="button" data-save-user>${edit ? "Save Changes" : "Add User"}</button>`
      });

      m?.querySelector("[data-save-user]")?.addEventListener("click", async () => {
        const payload = this.parent.formToObject(m.querySelector("[data-peopleware-user-form]"));
        try {
          if (edit) {
            await this.parent.putJson(this.parent.route("userUpdate", `/api/users/${encodeURIComponent(item.id)}`, item.id), payload);
            this.parent.toast("User updated", `${item.name || "User"} [${item.id}] has been updated.`, "success");
          } else {
            await this.parent.postJson(this.parent.route("userCreate", "/api/users"), payload);
            this.parent.toast("User added", "New user has been added.", "success");
          }
          this.parent.closeModal();
          await this.refresh();
          await this.parent.refreshAll();
        } catch (e) {
          this.parent.toast("Save failed", e.message || "Unable to save user.", "danger");
        }
      });
    },

    openCardCreateModal(userId) {
      if (!this.access.canCreateCard) return this.parent.toast("Permission denied", "Administrator, Owner, or Developer account is required.", "warning");

      const m = this.parent.openModal({
        title: `Add Card for User [${userId}]`,
        body: window.PeoplewareStructure.renderCardCreateForm(userId),
        footer: `<button class="ec-btn" type="button" data-modal-close>Cancel</button><button class="ec-btn ec-btn-primary" type="button" data-save-new-card>Add Card</button>`
      });

      m?.querySelector("[data-save-new-card]")?.addEventListener("click", async () => {
        const payload = this.parent.formToObject(m.querySelector("[data-peopleware-card-create-form]"));
        payload.user_id = Number(userId);
        payload.owner_id = Number(userId);
        payload.tenant_id = Number(userId);
        payload.assigned_user_id = Number(userId);
        payload.uid = payload.uid || payload.rfid_uid || payload.card_uid;
        payload.rfid_uid = payload.rfid_uid || payload.uid;
        payload.card_uid = payload.card_uid || payload.uid;
        payload.limit = Number(payload.limit || payload.credit_limit || payload.debt_limit || 100);
        payload.credit_limit = payload.limit;
        payload.debt_limit = payload.limit;

        try {
          await this.parent.postJson(this.parent.route("userCardCreate", `/api/users/${encodeURIComponent(userId)}/cards`, userId), payload);
          this.parent.toast("Card added", `New card was added for USER [${userId}].`, "success");
          this.parent.closeModal();
          await this.refresh();
        } catch (e) {
          this.parent.toast("Card failed", e.message || "Unable to add card.", "danger");
        }
      });
    },

    openCardDetailsModal(card) {
      const id = card.id || card.card_id || "";
      this.parent.openModal({ title: `Card [${id}]`, body: window.PeoplewareStructure.renderCardDetails(card), footer: `<button class="ec-btn" type="button" data-modal-close>Close</button>` });
    },

    openCardEditModal(card) {
      if (!this.access.canEditCard) return this.parent.toast("Permission denied", "Administrator, Owner, or Developer account is required.", "warning");
      const id = card.id || card.card_id || "";
      const m = this.parent.openModal({
        title: `Edit Card [${id}]`,
        body: window.PeoplewareStructure.renderCardEditForm(card),
        footer: `<button class="ec-btn" type="button" data-modal-close>Cancel</button><button class="ec-btn ec-btn-warning" type="button" data-card-ban>${String(card.status || "").toLowerCase() === "banned" ? "Unban / Enable" : "Ban / Disable"}</button><button class="ec-btn ec-btn-primary" type="button" data-save-card>Save Card</button>`
      });

      m?.querySelector("[data-save-card]")?.addEventListener("click", async () => {
        const payload = this.parent.formToObject(m.querySelector("[data-peopleware-card-form]"));
        delete payload.id;
        delete payload.uid;
        payload.limit = Number(payload.limit || payload.credit_limit || payload.debt_limit || 100);
        payload.credit_limit = payload.limit;
        payload.debt_limit = payload.limit;
        try {
          await this.parent.putJson(this.parent.route("cardUpdate", `/api/cards/${encodeURIComponent(id)}`, id), payload);
          this.parent.toast("Card updated", `Card [${id}] has been updated.`, "success");
          this.parent.closeModal();
          await this.refresh();
        } catch (e) {
          this.parent.toast("Save failed", e.message || "Unable to update card.", "danger");
        }
      });

      m?.querySelector("[data-card-ban]")?.addEventListener("click", async () => {
        const banned = String(card.status || "active").toLowerCase() === "banned";
        const rn = banned ? "cardUnban" : "cardBan";
        const fb = banned ? `/api/cards/${encodeURIComponent(id)}/unban` : `/api/cards/${encodeURIComponent(id)}/ban`;
        try {
          await this.parent.postJson(this.parent.route(rn, fb, id), { card_id: id });
          this.parent.toast("Card status updated", `Card [${id}] status has been changed.`, "success");
          this.parent.closeModal();
          await this.refresh();
        } catch (e) {
          this.parent.toast("Status failed", e.message || "Unable to change card status.", "danger");
        }
      });
    },

    openTopUpModal(card) {
      if (!this.access.canTopUp) return this.parent.toast("Permission denied", "Administrator, Owner, or Developer account is required.", "warning");
      const id = card.id || card.card_id || "";
      const m = this.parent.openModal({
        title: `Top Up Card [${id}]`,
        body: window.PeoplewareStructure.renderTopUpForm(card),
        footer: `<button class="ec-btn" type="button" data-modal-close>Cancel</button><button class="ec-btn ec-btn-primary" type="button" data-coin-topup>Apply Coin Slot Top Up</button>`
      });
      m?.querySelector("[data-coin-topup]")?.addEventListener("click", async () => {
        const payload = this.parent.formToObject(m.querySelector("[data-peopleware-topup-form]"));
        try {
          await this.parent.postJson(this.parent.route("cardTopup", `/api/cards/${encodeURIComponent(id)}/topup`, id), payload);
          this.parent.toast("Top up applied", `Coin-slot top-up has been applied to Card [${id}].`, "success");
          this.parent.closeModal();
          await this.refresh();
        } catch (e) {
          this.parent.toast("Top up failed", e.message || "Unable to apply top-up yet.", "danger");
        }
      });
    },

    confirmDelete(id) {
      const item = this.findItem(id);
      if (!item) return this.parent.toast("User not found", "Unable to locate this user.", "warning");
      if (!this.access.canDelete) return this.parent.toast("Permission denied", "Administrator, Owner, or Developer account is required.", "warning");
      this.parent.openDangerConfirm({
        title: `Delete ${item.name || "User"} [${item.id}]`,
        message: "This will permanently delete this USER record and its linked cards may be affected.",
        onConfirm: async () => {
          await this.parent.deleteJson(this.parent.route("userDelete", `/api/users/${encodeURIComponent(item.id)}`, item.id), { role: "USER" });
          this.parent.toast("User deleted", `${item.name || "User"} [${item.id}] has been deleted.`, "success");
          await this.refresh();
          await this.parent.refreshAll();
        }
      });
    },

    confirmDeleteAll() {
      if (!this.access.canDeleteAll) return this.parent.toast("Permission denied", "Owner or Developer account is required.", "warning");
      this.parent.openDangerConfirm({
        title: "Delete All Users",
        message: "This will permanently delete all USER records. Use only for reset/testing.",
        onConfirm: async () => {
          await this.parent.postJson(this.parent.route("userDeleteAll", "/api/users/delete-all"), {});
          this.parent.toast("Users deleted", "All users have been deleted.", "success");
          await this.refresh();
          await this.parent.refreshAll();
        }
      });
    }
  };

  function findCard(cards, id) { return cards.find((c) => String(c.id || c.card_id || "") === String(id)); }
  function uniq(v) { return Array.from(new Set(v.filter(Boolean))); }

  window.PeoplewareUser = U;
})();
