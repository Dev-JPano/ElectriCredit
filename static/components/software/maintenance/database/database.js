/* SOFTWARE DATABASE MAINTENANCE CONTROLLER v2 */
(function () {
  "use strict";

  const C = {
    root: null,
    parent: null,
    summary: null,
    tables: [],
    currentTable: "",
    tableData: {},
    dirty: false,
    search: "",
    sort: { key: "", direction: "" },
    busy: { refresh: false, download: false, clear: false, update: false },
    clearOtp: { token: "", verified: false },

    async init(ctx = {}) {
      this.root = ctx.root;
      this.parent = ctx.parent || window.SoftwareController;
      this.summary = ctx.summary || {};
      this.busy = { refresh: false, download: false, clear: false, update: false };
      this.clearOtp = { token: "", verified: false };
      if (!this.root || !window.SoftwareDatabaseStructure) return;
      window.SoftwareDatabaseDesign?.inject?.();
      this.render();
      this.bindEvents();
      await this.loadTables();
    },

    render() {
      this.root.innerHTML = window.SoftwareDatabaseStructure.render({
        access: this.summary.access || {},
        tables: this.tables,
        current: this.currentTable,
        tableData: this.tableData,
        rows: this.getVisibleRows(),
        columns: this.getColumns(),
        search: this.search,
        sort: this.sort
      });
      this.updateDirtyState();
    },

    bindEvents() {
      if (!this.root || this.root.dataset.dbBound === "true") return;
      this.root.dataset.dbBound = "true";

      this.root.addEventListener("change", async (event) => {
        const select = event.target.closest("[data-db-table-select]");
        if (select) {
          if (this.dirty) {
            this.parent.toast("Unsaved changes", "Click UPDATE first or refresh to discard changes.", "warning");
            select.value = this.currentTable;
            return;
          }
          this.currentTable = select.value || "";
          this.search = "";
          this.sort = { key: "", direction: "" };
          await this.loadTable(this.currentTable);
        }
      });

      this.root.addEventListener("input", (event) => {
        const search = event.target.closest("[data-db-search]");
        if (search) {
          this.search = search.value || "";
          this.render();
          const input = this.root.querySelector("[data-db-search]");
          input?.focus();
          try { input?.setSelectionRange(input.value.length, input.value.length); } catch {}
          return;
        }

        const cell = event.target.closest("[data-db-cell]");
        if (cell && !cell.readOnly) {
          const row = cell.closest("[data-db-row], [data-db-index]");
          if (row && row.dataset.dbState === "clean") this.setRowState(row, "dirty");
          this.setDirty(true);
        }
      });

      this.root.addEventListener("click", async (event) => {
        const refresh = event.target.closest("[data-db-refresh]");
        const download = event.target.closest("[data-db-download]");
        const add = event.target.closest("[data-db-add-row]");
        const update = event.target.closest("[data-db-update]");
        const clearOne = event.target.closest("[data-db-delete-all]");
        const clearMany = event.target.closest("[data-db-clear-database]");
        const sort = event.target.closest("[data-db-sort]");
        const cell = event.target.closest("[data-db-cell]");
        const del = event.target.closest("[data-db-mark-delete]");

        if (refresh || download || add || update || clearOne || clearMany || sort || cell || del) {
          event.preventDefault();
          event.stopPropagation();
        }

        if (refresh) return this.refresh(refresh);
        if (download) return this.downloadCurrentTable(download);
        if (add) return this.addRow();
        if (update) return this.confirmUpdate();
        if (clearOne) return this.confirmDeleteAll();
        if (clearMany) return this.openClearDatabaseModal();
        if (sort) return this.cycleSort(sort.dataset.dbSort || "");
        if (cell) return this.openCellModal(cell);

        if (del) {
          const row = del.closest("tr");
          if (!row) return;
          if (row.dataset.dbState === "new") row.remove();
          else this.setRowState(row, row.dataset.dbState === "delete" ? "clean" : "delete");
          this.setDirty(true);
        }
      });
    },

    async loadTables() {
      try {
        const payload = await this.parent.postJson(this.parent.route("softwareDatabaseTables", "/api/software/database/tables"), {});
        const data = payload.data || payload;
        this.tables = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
        this.render();
      } catch (error) {
        this.parent.toast("Tables failed", error.message || "Unable to load database tables.", "danger");
      }
    },

    async loadTable(tableName) {
      if (!tableName) {
        this.tableData = {};
        this.render();
        return;
      }

      try {
        const payload = await this.parent.postJson(this.parent.route("softwareDatabaseTable", `/api/software/database/table/${encodeURIComponent(tableName)}`, tableName), {});
        this.tableData = payload.data || payload;
        this.dirty = false;
        this.render();
      } catch (error) {
        this.parent.toast("Table failed", error.message || "Unable to load table.", "danger");
      }
    },

    async refresh(button = null) {
      if (this.busy.refresh) return;
      this.busy.refresh = true;
      this.setButtonBusy(button, true, "Refreshing...");
      try {
        this.dirty = false;
        await this.loadTables();
        if (this.currentTable) await this.loadTable(this.currentTable);
        this.parent.toast("Database refreshed", "Tables and selected rows were reloaded.", "success");
      } finally {
        this.busy.refresh = false;
        this.setButtonBusy(this.root.querySelector("[data-db-refresh]"), false);
      }
    },

    addRow() {
      const columns = this.getColumns();
      if (!columns.length) {
        this.parent.toast("No columns", "Select a table with columns first.", "warning");
        return;
      }

      const tbody = this.root.querySelector("[data-db-tbody]");
      if (!tbody) return;
      if (tbody.querySelector(".ec-software-empty")) tbody.innerHTML = "";

      const tr = document.createElement("tr");
      tr.dataset.dbRow = "";
      tr.dataset.dbIndex = `new-${Date.now()}`;
      tr.dataset.dbState = "new";
      tr.innerHTML = `
        <td><span class="ec-software-pill" data-db-row-state>new</span></td>
        ${columns.map((col) => `
          <td>
            <input class="ec-software-db-cell" type="text" value="" data-db-cell="${this.parent.escapeHtml(col)}" ${col === "id" ? "readonly" : ""}>
          </td>
        `).join("")}
        <td><button class="ec-software-btn ec-software-btn-danger" type="button" data-db-mark-delete>Delete</button></td>
      `;
      tbody.prepend(tr);
      this.setDirty(true);
    },

    collectBatch() {
      const create = [];
      const update = [];
      const del = [];

      this.root.querySelectorAll("tr[data-db-state]").forEach((row) => {
        const state = row.dataset.dbState;
        const id = Number(row.dataset.dbRow || 0);
        const data = this.collectRow(row);

        if (state === "new") {
          delete data.id;
          create.push(data);
        } else if (state === "dirty" && id > 0) {
          update.push({ id, data });
        } else if (state === "delete" && id > 0) {
          del.push(id);
        }
      });

      return { create, update, delete: del };
    },

    collectRow(row) {
      const out = {};
      row.querySelectorAll("[data-db-cell]").forEach((cell) => {
        const key = cell.dataset.dbCell;
        out[key] = this.parseCellValue(cell.value);
      });
      return out;
    },

    parseCellValue(value) {
      const raw = String(value ?? "").trim();
      if (raw === "") return "";
      if ((raw.startsWith("{") && raw.endsWith("}")) || (raw.startsWith("[") && raw.endsWith("]"))) {
        try { return JSON.parse(raw); } catch {}
      }
      if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
      return raw;
    },

    confirmUpdate() {
      const batch = this.collectBatch();
      const total = batch.create.length + batch.update.length + batch.delete.length;

      if (!this.currentTable || total <= 0) {
        this.parent.toast("No changes", "There are no staged changes to update.", "warning");
        return;
      }

      this.parent.openConfirm({
        title: `Update ${this.currentTable}`,
        message: `This will apply ${total} staged database change(s). A backend backup is created before batch update.`,
        onConfirm: async (confirmPayload) => {
          if (this.busy.update) return;
          this.busy.update = true;
          try {
            await this.parent.postJson(
              this.parent.route("softwareDatabaseBatch", `/api/software/database/table/${encodeURIComponent(this.currentTable)}/batch`, this.currentTable),
              Object.assign({}, batch, confirmPayload)
            );
            this.parent.toast("Database updated", `${total} staged change(s) were applied.`, "success");
            this.parent.closeModal();
            await this.loadTable(this.currentTable);
          } catch (error) {
            this.parent.toast("Update failed", error.message || "Unable to update database.", "danger");
          } finally {
            this.busy.update = false;
          }
        }
      });
    },

    confirmDeleteAll() {
      if (!this.currentTable) return;
      this.parent.openConfirm({
        title: `Delete All: ${this.currentTable}`,
        message: `This clears all rows from ${this.currentTable}. Backend will require Developer role and confirmation.`,
        onConfirm: async (confirmPayload) => {
          try {
            await this.parent.postJson(
              this.parent.route("softwareDatabaseClear", `/api/software/database/table/${encodeURIComponent(this.currentTable)}/clear`, this.currentTable),
              confirmPayload
            );
            this.parent.toast("Table cleared", `${this.currentTable} was cleared.`, "success");
            this.parent.closeModal();
            await this.loadTable(this.currentTable);
            await this.loadTables();
          } catch (error) {
            this.parent.toast("Delete all failed", error.message || "Unable to clear table.", "danger");
          }
        }
      });
    },

    openClearDatabaseModal() {
      if (this.busy.clear) return;
      this.clearOtp = { token: "", verified: false };
      const modal = this.parent.openModal({
        title: "Clear Database Tables",
        sizeClass: "ec-modal-wide",
        body: window.SoftwareDatabaseStructure.renderClearDatabaseModal(this.tables),
        footer: `<button class="ec-software-btn" type="button" data-modal-close>Cancel</button><button class="ec-software-btn ec-software-btn-danger" type="button" data-db-clear-proceed disabled>Proceed</button>`
      });

      modal?.querySelector("[data-db-clear-select-all]")?.addEventListener("click", () => {
        modal.querySelectorAll("[data-db-clear-table]:not(:disabled)").forEach((box) => { box.checked = true; });
      });
      modal?.querySelector("[data-db-clear-select-none]")?.addEventListener("click", () => {
        modal.querySelectorAll("[data-db-clear-table]").forEach((box) => { box.checked = false; });
      });
      modal?.querySelector("[data-db-clear-send-otp]")?.addEventListener("click", (event) => this.sendClearOtp(event.currentTarget, modal));
      modal?.querySelector("[data-db-clear-verify-otp]")?.addEventListener("click", () => this.verifyClearOtp(modal));
      modal?.querySelector("[data-db-clear-proceed]")?.addEventListener("click", () => this.proceedClearDatabase(modal));
    },

    async sendClearOtp(button, modal) {
      if (button.dataset.busy === "true" || button.dataset.locked === "true") return;
      const user = this.parent.getCurrentUser?.() || {};
      this.setButtonBusy(button, true, "Sending...");
      try {
        const payload = await this.parent.postJson(this.parent.route("authRequestOtp", "/api/auth/request-otp"), {
          account_id: user.id || user.account_id || user.superuser_id || "",
          username: user.username || "",
          purpose: "database_clear",
          approval_message: `${user.name || "Developer"} @${user.username || "developer"} requested OTP to clear selected ElectriCredit database tables.`
        });
        this.clearOtp.token = payload.data?.otp_token || payload.otp_token || "";
        this.clearOtp.verified = false;
        this.setOtpStatus(modal, "OTP sent. Enter the code and click Verify OTP.", "");
        this.lockButtonCountdown(button, this.getCooldownSeconds(payload));
      } catch (error) {
        this.setButtonBusy(button, false);
        this.setOtpStatus(modal, error.message || "Unable to send OTP.", "danger");
      }
    },

    async verifyClearOtp(modal) {
      const code = String(modal?.querySelector("[data-db-clear-otp]")?.value || "").trim();
      if (!code) {
        this.setOtpStatus(modal, "Enter the OTP first.", "danger");
        return;
      }
      if (!this.clearOtp.token) {
        this.setOtpStatus(modal, "Send OTP first before verifying.", "danger");
        return;
      }

      try {
        await this.parent.postJson(this.parent.route("authVerifyOtp", "/api/auth/verify-otp"), {
          otp_token: this.clearOtp.token,
          otp_code: code,
          purpose: "database_clear",
          consume: false
        });
        this.clearOtp.verified = true;
        this.setOtpStatus(modal, "OTP verified. You can now proceed to the 16-character confirmation.", "ok");
        const proceed = modal.querySelector("[data-db-clear-proceed]");
        if (proceed) proceed.disabled = false;
      } catch (error) {
        this.clearOtp.verified = false;
        this.setOtpStatus(modal, error.message || "Invalid OTP.", "danger");
      }
    },

    proceedClearDatabase(modal) {
      if (!this.clearOtp.verified) {
        this.setOtpStatus(modal, "Verify OTP before proceeding.", "danger");
        return;
      }
      const selected = Array.from(modal.querySelectorAll("[data-db-clear-table]:checked")).map((box) => box.value).filter(Boolean);
      if (!selected.length) {
        this.parent.toast("No tables selected", "Choose at least one safe table to clear.", "warning");
        return;
      }

      this.parent.openConfirm({
        title: "Confirm Database Clear",
        message: `This will clear ${selected.length} selected table(s): ${selected.join(", ")}. A database backup is created first.`,
        onConfirm: async (confirmPayload) => {
          if (this.busy.clear) return;
          this.busy.clear = true;
          try {
            await this.parent.postJson(this.parent.route("softwareDatabaseClearMultiple", "/api/software/database/clear"), {
              tables: selected,
              otp_verified: true,
              ...confirmPayload
            });
            this.parent.toast("Database cleared", "Selected tables were cleared after backup.", "success");
            this.parent.closeModal();
            this.parent.closeModal();
            await this.refresh();
          } catch (error) {
            this.parent.toast("Clear failed", error.message || "Unable to clear selected tables.", "danger");
          } finally {
            this.busy.clear = false;
          }
        }
      });
    },

    openCellModal(cell) {
      const col = cell.dataset.dbCell || "cell";
      const original = cell.value || "";
      const readonly = cell.readOnly;
      const modal = this.parent.openModal({
        title: `Cell Editor: ${col}`,
        sizeClass: "ec-modal-wide",
        body: window.SoftwareDatabaseStructure.renderCellModal(original, col),
        footer: `<button class="ec-software-btn" type="button" data-db-cell-cancel>Cancel</button><button class="ec-software-btn ec-software-btn-primary" type="button" data-db-cell-save ${readonly ? "disabled" : ""}>Save Cell</button>`
      });
      const editor = modal?.querySelector("[data-db-cell-editor]");
      const preview = modal?.querySelector("[data-db-json-preview]");
      editor?.addEventListener("input", () => {
        if (preview) preview.innerHTML = window.SoftwareDatabaseStructure.jsonPreview(editor.value || "");
      });
      modal?.querySelector("[data-db-cell-cancel]")?.addEventListener("click", () => {
        const value = editor?.value || "";
        if (value !== original && this.hasBrokenJsonBoundary(value)) {
          this.parent.toast("Incomplete JSON", "The value looks like an unfinished object/array. Fix it or discard by closing again.", "warning");
          return;
        }
        this.parent.closeModal();
      });
      modal?.querySelector("[data-db-cell-save]")?.addEventListener("click", () => {
        const value = editor?.value || "";
        if (this.hasBrokenJsonBoundary(value)) {
          this.parent.toast("Incomplete JSON", "Object/array brackets are incomplete. Fix the value before saving.", "danger");
          return;
        }
        cell.value = value;
        const row = cell.closest("[data-db-row], [data-db-index]");
        if (row && row.dataset.dbState === "clean") this.setRowState(row, "dirty");
        this.setDirty(true);
        this.parent.closeModal();
      });
      window.setTimeout(() => editor?.focus(), 60);
    },

    hasBrokenJsonBoundary(value) {
      const text = String(value || "").trim();
      if (!text) return false;
      if ((text.startsWith("{") && !text.endsWith("}")) || (text.startsWith("[") && !text.endsWith("]"))) return true;
      if (/^[{[]/.test(text)) {
        try { JSON.parse(text); } catch { return true; }
      }
      return false;
    },

    cycleSort(column) {
      if (!column) return;
      if (this.sort.key !== column) this.sort = { key: column, direction: "asc" };
      else if (this.sort.direction === "asc") this.sort = { key: column, direction: "desc" };
      else this.sort = { key: "", direction: "" };
      this.render();
    },

    getRows() {
      return window.SoftwareDatabaseStructure.normalizeRows(this.tableData);
    },

    getColumns() {
      return window.SoftwareDatabaseStructure.normalizeColumns(this.tableData, this.getRows());
    },

    getVisibleRows() {
      let rows = this.getRows().slice();
      const search = String(this.search || "").toLowerCase().trim();
      if (search) rows = rows.filter((row) => JSON.stringify(row ?? {}).toLowerCase().includes(search));
      if (this.sort.key && this.sort.direction) {
        const key = this.sort.key;
        const dir = this.sort.direction === "desc" ? -1 : 1;
        rows.sort((a, b) => compareValues(a?.[key], b?.[key]) * dir);
      }
      return rows;
    },

    downloadCurrentTable(button = null) {
      if (!this.currentTable || this.busy.download) return;
      this.busy.download = true;
      this.setButtonBusy(button, true, "Downloading...");
      try {
        const rows = this.getVisibleRows();
        const columns = this.getColumns();
        const csv = this.toCsv(columns, rows);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `electricredit_${this.currentTable}_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this.parent.toast("Table downloaded", `${this.currentTable} CSV was prepared.`, "success");
      } finally {
        this.busy.download = false;
        this.setButtonBusy(this.root.querySelector("[data-db-download]"), false);
      }
    },

    toCsv(columns, rows) {
      const esc = (value) => {
        let text = value;
        if (text && typeof text === "object") text = JSON.stringify(text);
        text = String(text ?? "");
        return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
      };
      return [columns.map(esc).join(","), ...rows.map((row) => columns.map((col) => esc(row?.[col])).join(","))].join("\n");
    },

    setOtpStatus(modal, text, type = "") {
      const el = modal?.querySelector("[data-db-clear-otp-status]");
      if (!el) return;
      el.textContent = text;
      el.classList.toggle("is-ok", type === "ok");
      el.classList.toggle("is-danger", type === "danger");
    },

    getCooldownSeconds(payload) {
      const data = payload?.data || payload || {};
      const raw = data.expires_in || data.cooldown_seconds || data.ttl || 300;
      const seconds = Number(raw);
      return Number.isFinite(seconds) && seconds > 0 ? seconds : 300;
    },

    lockButtonCountdown(button, seconds = 300) {
      if (!button) return;
      let remaining = Math.max(10, Number(seconds || 300));
      const original = button.dataset.originalText || button.textContent.trim() || "Send OTP";
      button.dataset.originalText = original;
      button.dataset.locked = "true";
      const tick = () => { button.textContent = `Wait ${remaining}s`; };
      tick();
      const timer = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(timer);
          button.dataset.locked = "false";
          this.setButtonBusy(button, false);
          button.textContent = original;
          return;
        }
        tick();
      }, 1000);
    },

    setButtonBusy(button, busy, label = "Working...") {
      if (!button) return;
      if (busy) {
        if (!button.dataset.originalText) button.dataset.originalText = button.textContent.trim() || "Action";
        button.disabled = true;
        button.dataset.busy = "true";
        button.textContent = label;
        return;
      }
      if (button.dataset.locked === "true") return;
      button.disabled = false;
      button.dataset.busy = "false";
      if (button.dataset.originalText) button.textContent = button.dataset.originalText;
    },

    setRowState(row, state) {
      row.dataset.dbState = state;
      const label = row.querySelector("[data-db-row-state]");
      if (label) label.textContent = state;
    },

    setDirty(value) {
      this.dirty = Boolean(value);
      this.updateDirtyState();
    },

    updateDirtyState() {
      const button = this.root?.querySelector("[data-db-update]");
      if (button) button.disabled = !this.dirty;
    }
  };

  function compareValues(a, b) {
    const na = Number(a), nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    const da = Date.parse(a), db = Date.parse(b);
    if (Number.isFinite(da) && Number.isFinite(db)) return da - db;
    return String(a ?? "").localeCompare(String(b ?? ""), undefined, { numeric: true, sensitivity: "base" });
  }

  window.SoftwareDatabase = C;
})();
