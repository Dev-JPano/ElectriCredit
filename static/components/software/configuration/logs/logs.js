/* SOFTWARE LOGS CONTROLLER v3 */
(function () {
  "use strict";

  const C = {
    root: null,
    parent: null,
    summary: null,
    items: [],
    busy: {
      refresh: false,
      download: false,
      clearPrompt: false,
      clearRun: false
    },

    async init(ctx = {}) {
      this.root = ctx.root;
      this.parent = ctx.parent || window.SoftwareController;
      this.summary = ctx.summary || {};
      this.busy = { refresh: false, download: false, clearPrompt: false, clearRun: false };

      if (!this.root || !window.SoftwareLogsStructure) return;

      window.SoftwareLogsDesign?.inject?.();
      this.render();
      this.bindEvents();
      await this.refresh(false);
    },

    render() {
      this.root.innerHTML = window.SoftwareLogsStructure.render({
        items: this.items,
        access: this.summary.access || {},
        role: this.parent.getCurrentUser()?.role || this.summary.role || "VISITOR",
        backups: this.summary.counts?.backups || 0
      });
    },

    bindEvents() {
      if (!this.root || this.root.dataset.logsBound === "true") return;
      this.root.dataset.logsBound = "true";

      this.root.addEventListener("click", async (event) => {
        const refresh = event.target.closest("[data-logs-refresh]");
        const download = event.target.closest("[data-logs-download]");
        const clear = event.target.closest("[data-logs-clear]");

        if (!refresh && !download && !clear) return;

        event.preventDefault();
        event.stopPropagation();

        if (refresh) return this.refresh(true, refresh);
        if (download) return this.downloadLogs(download);
        if (clear) return this.confirmClearLogs(clear);
      });
    },

    async refresh(showToast = true, button = null) {
      if (this.busy.refresh) return;
      this.busy.refresh = true;
      this.setButtonBusy(button || this.root.querySelector("[data-logs-refresh]"), true, "Refreshing...");

      try {
        const payload = await this.parent.postJson(
          this.parent.route("softwareLogs", "/api/software/logs"),
          { limit: 300 }
        );

        const data = payload.data || {};
        this.items = Array.isArray(data.items) ? data.items : [];
        this.render();

        if (showToast) {
          this.parent.toast("Logs refreshed", `${this.items.length} logs loaded.`, "success");
        }
      } catch (error) {
        this.parent.toast("Logs failed", error.message || "Unable to load logs.", "danger");
      } finally {
        this.busy.refresh = false;
        this.setButtonBusy(this.root.querySelector("[data-logs-refresh]"), false);
      }
    },

    async downloadLogs(button = null) {
      if (this.busy.download) return;
      this.busy.download = true;
      this.setButtonBusy(button || this.root.querySelector("[data-logs-download]"), true, "Downloading...");

      try {
        const payload = await this.parent.postJson(
          this.parent.route("softwareLogsDownload", "/api/software/logs/download"),
          {}
        );

        const data = payload.data || {};
        const blob = new Blob([data.content || ""], { type: data.content_type || "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = data.filename || "electricredit_logs.csv";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        this.parent.toast("Logs downloaded", "CSV log file was prepared.", "success");
      } catch (error) {
        this.parent.toast("Download failed", error.message || "Unable to download logs.", "danger");
      } finally {
        this.busy.download = false;
        this.setButtonBusy(this.root.querySelector("[data-logs-download]"), false);
      }
    },

    confirmClearLogs(button = null) {
      if (this.busy.clearPrompt || this.busy.clearRun) return;

      this.busy.clearPrompt = true;
      this.setButtonBusy(button || this.root.querySelector("[data-logs-clear]"), true, "Opening...");

      const modal = this.parent.openConfirm({
        title: "Backup + Clear Logs",
        message: "This creates a database backup first, then clears logs. Owner or Developer access is required.",
        onConfirm: async (confirmPayload) => {
          if (this.busy.clearRun) return;

          this.busy.clearRun = true;

          try {
            await this.parent.postJson(
              this.parent.route("softwareLogsBackupClear", "/api/software/logs/backup-clear"),
              confirmPayload
            );

            this.parent.toast("Logs cleared", "A backup was created before clearing logs.", "success");
            this.parent.closeModal();
            await this.refresh(false);
          } catch (error) {
            this.parent.toast("Clear failed", error.message || "Unable to clear logs.", "danger");
          } finally {
            this.busy.clearRun = false;
            this.busy.clearPrompt = false;
            this.setButtonBusy(this.root.querySelector("[data-logs-clear]"), false);
          }
        }
      });

      // Prevent rapid multi-click modal opening, but allow retry if user cancels.
      window.setTimeout(() => {
        if (!this.busy.clearRun) {
          this.busy.clearPrompt = false;
          this.setButtonBusy(this.root.querySelector("[data-logs-clear]"), false);
        }
      }, 900);

      return modal;
    },

    setButtonBusy(button, busy, label = "Working...") {
      if (!button) return;

      if (busy) {
        if (!button.dataset.originalText) {
          button.dataset.originalText = button.textContent.trim() || "Action";
        }
        button.disabled = true;
        button.dataset.busy = "true";
        button.textContent = label;
        return;
      }

      button.disabled = false;
      button.dataset.busy = "false";
      if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
      }
    }
  };

  window.SoftwareLogs = C;
})();
