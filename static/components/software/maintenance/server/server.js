/* SOFTWARE SERVER MAINTENANCE CONTROLLER v2 */
(function () {
  "use strict";

  const C = {
    root: null,
    parent: null,
    summary: null,

    async init(ctx = {}) {
      this.root = ctx.root;
      this.parent = ctx.parent || window.SoftwareController;
      this.summary = ctx.summary || {};
      if (!this.root || !window.SoftwareServerStructure) return;
      window.SoftwareServerDesign?.inject?.();
      this.render();
      this.bindEvents();
    },

    render() {
      this.root.innerHTML = window.SoftwareServerStructure.render({
        access: this.summary.access || {},
        device: this.summary.device || {}
      });
    },

    bindEvents() {
      this.root.addEventListener("click", async (event) => {
        if (event.target.closest("[data-server-refresh]")) return this.refresh();
        if (event.target.closest("[data-server-device-save]")) return this.confirmDeviceUpdate();
        if (event.target.closest("[data-server-set-balance]")) return this.confirmSetBalance();
      });
    },

    async refresh() {
      try {
        const payload = await this.parent.postJson(this.parent.route("softwareSummary", "/api/software/summary"), {});
        this.summary = window.SoftwareStructure.normalizeSummary(payload);
        this.render();
        this.parent.toast("Server refreshed", "Device/server data was reloaded.", "success");
      } catch (error) {
        this.parent.toast("Refresh failed", error.message || "Unable to refresh server data.", "danger");
      }
    },

    getDevicePayload() {
      const out = {};
      this.root.querySelectorAll("[data-server-field]").forEach((field) => {
        const key = field.dataset.serverField;
        const value = field.value || "";

        if ((key === "payment_bridge_api_key" || key === "payment_bridge_secret") && isMasked(value)) return;
        out[key] = value;
      });
      return out;
    },

    confirmDeviceUpdate() {
      const payload = this.getDevicePayload();

      this.parent.openConfirm({
        title: "Update Server / Payment Bridge",
        message: "This changes ElectriCredit server identity or payment bridge settings. Developer confirmation is required.",
        onConfirm: async (confirmPayload) => {
          try {
            await this.parent.putJson(this.parent.route("softwareDevice", "/api/software/device"), Object.assign({}, payload, confirmPayload));
            this.parent.toast("Server updated", "Device and payment bridge settings were saved.", "success");
            this.parent.closeModal();
            await this.refresh();
          } catch (error) {
            this.parent.toast("Update failed", error.message || "Unable to update server settings.", "danger");
          }
        }
      });
    },

    confirmSetBalance() {
      const amount = Number(this.root.querySelector("[data-server-balance-amount]")?.value || 0);
      if (!Number.isFinite(amount)) return this.parent.toast("Invalid amount", "Enter a valid balance amount.", "warning");

      this.parent.openConfirm({
        title: "Set All Card Balances",
        message: `This will overwrite every card balance to ₱${amount.toFixed(2)}. Developer confirmation is required.`,
        onConfirm: async (confirmPayload) => {
          try {
            await this.parent.postJson(this.parent.route("softwareSetAllBalance", "/api/software/balance/set-all"), Object.assign({ amount }, confirmPayload));
            this.parent.toast("Balances updated", `All cards were set to ₱${amount.toFixed(2)}.`, "success");
            this.parent.closeModal();
            const input = this.root.querySelector("[data-server-balance-amount]");
            if (input) input.value = "";
          } catch (error) {
            this.parent.toast("Set failed", error.message || "Unable to set all balances.", "danger");
          }
        }
      });
    }
  };

  function isMasked(value) {
    return /^•+/.test(String(value || "")) || /^\*+/.test(String(value || ""));
  }

  window.SoftwareServer = C;
})();
