/* SOFTWARE BACKUP MAINTENANCE CONTROLLER v1 */
(function () {
  "use strict";

  const C = {
    root: null,
    parent: null,
    summary: null,
    items: [],

    async init(ctx = {}) {
      this.root = ctx.root;
      this.parent = ctx.parent || window.SoftwareController;
      this.summary = ctx.summary || {};
      if (!this.root || !window.SoftwareBackupStructure) return;
      window.SoftwareBackupDesign?.inject?.();
      this.render();
      this.bindEvents();
      await this.refresh(false);
    },

    render() {
      this.root.innerHTML = window.SoftwareBackupStructure.render({
        access: this.summary.access || {},
        items: this.items
      });
      this.updateActions();
    },

    bindEvents() {
      this.root.addEventListener("change", (event) => {
        const all = event.target.closest("[data-backup-select-all]");
        if (all) {
          this.root.querySelectorAll("[data-backup-check]").forEach((input) => {
            input.checked = all.checked;
          });
        }
        if (event.target.closest("[data-backup-select-all], [data-backup-check]")) this.updateActions();
      });

      this.root.addEventListener("click", async (event) => {
        if (event.target.closest("[data-backup-refresh]")) return this.refresh(true);
        if (event.target.closest("[data-backup-create]")) return this.createBackup();
        if (event.target.closest("[data-backup-download]")) return this.downloadSelected();
        if (event.target.closest("[data-backup-delete]")) return this.confirmDeleteSelected();
      });
    },

    selectedIds() {
      return Array.from(this.root.querySelectorAll("[data-backup-check]:checked"))
        .map((input) => Number(input.value))
        .filter((id) => id > 0);
    },

    updateActions() {
      const ids = this.selectedIds();
      const download = this.root.querySelector("[data-backup-download]");
      const del = this.root.querySelector("[data-backup-delete]");
      if (download) download.disabled = ids.length !== 1;
      if (del) del.disabled = ids.length < 1;
    },

    async refresh(showToast = true) {
      try {
        const payload = await this.parent.postJson(this.parent.route("softwareBackups", "/api/software/backups"), {});
        const data = payload.data || {};
        this.items = Array.isArray(data.items) ? data.items : [];
        this.render();
        if (showToast) this.parent.toast("Backups refreshed", `${this.items.length} backup(s) loaded.`, "success");
      } catch (error) {
        this.parent.toast("Backups failed", error.message || "Unable to load backups.", "danger");
      }
    },

    async createBackup() {
      try {
        await this.parent.postJson(this.parent.route("softwareBackupCreate", "/api/software/backups/create"), {
          reason: "Manual Software maintenance backup"
        });
        this.parent.toast("Backup created", "A new backup was created.", "success");
        await this.refresh(false);
      } catch (error) {
        this.parent.toast("Backup failed", error.message || "Unable to create backup.", "danger");
      }
    },

    async downloadSelected() {
      const ids = this.selectedIds();
      if (ids.length !== 1) {
        this.parent.toast("Select one", "Select exactly one backup to download.", "warning");
        return;
      }

      try {
        const payload = await this.parent.postJson(
          this.parent.route("softwareBackupDownload", `/api/software/backups/download/${encodeURIComponent(ids[0])}`, ids[0]),
          {}
        );
        const data = payload.data || {};
        this.parent.toast("Backup ready", data.filename ? `${data.filename} is ready on server path.` : "Backup prepared.", "success");
        console.log("Backup download metadata:", data);
      } catch (error) {
        this.parent.toast("Download failed", error.message || "Unable to download backup.", "danger");
      }
    },

    confirmDeleteSelected() {
      const ids = this.selectedIds();
      if (!ids.length) {
        this.parent.toast("No selection", "Select backups to delete.", "warning");
        return;
      }

      this.parent.openConfirm({
        title: "Delete Selected Backups",
        message: `This will delete ${ids.length} selected backup record(s)/file(s). Developer confirmation is required.`,
        onConfirm: async (confirmPayload) => {
          try {
            await this.parent.postJson(
              this.parent.route("softwareBackupsDelete", "/api/software/backups/delete"),
              Object.assign({ ids: ids }, confirmPayload)
            );
            this.parent.toast("Backups deleted", `${ids.length} backup(s) deleted.`, "success");
            this.parent.closeModal();
            await this.refresh(false);
          } catch (error) {
            this.parent.toast("Delete failed", error.message || "Unable to delete backups.", "danger");
          }
        }
      });
    }
  };

  window.SoftwareBackup = C;
})();
