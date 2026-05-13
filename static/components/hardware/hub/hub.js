/* =========================================================
   ELECTRICREDIT V2 - HARDWARE HUB CONTROLLER
   File: static/components/hardware/hub/hub.js
   ========================================================= */

(function () {
  "use strict";

  const HardwareHub = {
    root: null,
    parent: null,
    app: null,
    items: [],

    async init(context = {}) {
      this.root = context.root;
      this.parent = context.parent || window.HardwareController;
      this.app = context.app || window.ElectriCredit || null;

      if (!this.root || !window.HardwareHubStructure) return;

      window.HardwareHubDesign?.inject?.();
      await this.refresh();
      this.bindEvents();
    },

    get access() {
      return {
        canPing: this.parent?.hasRole?.("ADMINISTRATOR") || false,
        canEdit: this.parent?.hasRole?.("OWNER") || false,
        canManage: this.parent?.hasRole?.("OWNER") || false,
        canDelete: this.parent?.hasRole?.("OWNER") || false,
        canRegister: this.parent?.hasRole?.("DEVELOPER") || false
      };
    },

    async refresh() {
      this.root.innerHTML = `<div class="ec-hardware-loading">Loading hub modules...</div>`;
      this.items = await this.loadData();
      this.render();
    },

    async loadData() {
      try {
        const payload = await this.parent.getJson(this.parent.route("hubs", "/api/hubs"));
        const data = payload.data || payload;
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.items)) return data.items;
        if (Array.isArray(data.hubs)) return data.hubs;
        return [];
      } catch (error) {
        console.warn("Hardware hubs failed:", error);
        return [];
      }
    },

    render() {
      this.root.innerHTML = window.HardwareHubStructure.render({
        items: this.items,
        access: this.access
      });
    },

    bindEvents() {
      this.root.addEventListener("click", async (event) => {
        const refresh = event.target.closest("[data-hub-refresh]");
        if (refresh) {
          await this.refresh();
          this.parent.toast("Hubs refreshed", "Hub module list has been reloaded.", "success");
          return;
        }

        const add = event.target.closest("[data-hub-add]");
        if (add) {
          this.openRegisterModal();
          return;
        }

        const details = event.target.closest("[data-hub-details]");
        if (details) {
          this.openDetailsModal(details.dataset.hubDetails);
          return;
        }

        const edit = event.target.closest("[data-hub-edit]");
        if (edit) {
          this.openEditModal(edit.dataset.hubEdit);
          return;
        }

        const ping = event.target.closest("[data-hub-ping]");
        if (ping) {
          await this.sendAction("hubPing", "/api/hubs/ping", { id: ping.dataset.hubPing }, "Hub ping sent.");
          return;
        }

        const enable = event.target.closest("[data-hub-enable]");
        if (enable) {
          await this.sendAction("hubEnable", "/api/hubs/enable", { id: enable.dataset.hubEnable }, "Hub enabled.");
          return;
        }

        const disable = event.target.closest("[data-hub-disable]");
        if (disable) {
          await this.sendAction("hubDisable", "/api/hubs/disable", { id: disable.dataset.hubDisable }, "Hub disabled.");
          return;
        }

        const del = event.target.closest("[data-hub-delete]");
        if (del) {
          this.confirmDelete(del.dataset.hubDelete);
        }
      });
    },

    findItem(id) {
      return window.HardwareHubStructure.normalizeItems(this.items).find((row) => String(row.id) === String(id));
    },

    async sendAction(routeName, fallbackUrl, body, successMessage) {
      try {
        await this.parent.postJson(this.parent.route(routeName, fallbackUrl), body);
        this.parent.toast("Hardware action", successMessage, "success");
        await this.refresh();
        await this.parent.refreshAll();
      } catch (error) {
        this.parent.toast("Action failed", error.message || "Unable to complete hub action.", "danger");
      }
    },

    openDetailsModal(id) {
      const item = this.findItem(id);
      if (!item) {
        this.parent.toast("Hub not found", "Unable to locate this hub module.", "warning");
        return;
      }

      this.parent.openModal({
        title: `HUB[${item.id}] Details`,
        body: window.HardwareStructure.renderDeviceModalDetails(item, "HUB"),
        footer: `
          <button class="ec-btn" type="button" data-modal-close>Close</button>
          <button class="ec-btn ec-btn-primary" type="button" data-hardware-modal-edit-hub="${this.parent.escapeHtml(item.id)}" ${this.access.canEdit ? "" : "disabled"}>Edit</button>
        `
      });

      const modalRoot = document.querySelector("#modal-root");
      modalRoot?.querySelector("[data-hardware-modal-edit-hub]")?.addEventListener("click", () => {
        this.parent.closeModal();
        this.openEditModal(item.id);
      });
    },

    openEditModal(id) {
      const item = this.findItem(id);
      if (!item) {
        this.parent.toast("Hub not found", "Unable to locate this hub module.", "warning");
        return;
      }

      if (!this.access.canEdit) {
        this.parent.toast("Permission denied", "Owner or Developer account is required to edit hub information.", "warning");
        return;
      }

      const modal = this.parent.openModal({
        title: `Edit HUB[${item.id}]`,
        body: window.HardwareStructure.renderEditForm(item, "hub"),
        footer: `
          <button class="ec-btn" type="button" data-modal-close>Cancel</button>
          <button class="ec-btn ec-btn-primary" type="button" data-hardware-save-edit>Save Changes</button>
        `
      });

      modal?.querySelector("[data-hardware-save-edit]")?.addEventListener("click", async () => {
        const form = modal.querySelector("[data-hardware-edit-form]");
        if (!form) return;

        const payload = this.formToObject(form);
        payload.status = JSON.stringify(item.statusObject);

        try {
          const url = this.parent.route("databaseTableRowUpdate", `/api/database/table/hubs/row/${encodeURIComponent(item.id)}`, "hubs", item.id);
          await this.parent.putJson(url, payload);
          this.parent.toast("Hub updated", `HUB[${item.id}] information has been updated.`, "success");
          this.parent.closeModal();
          await this.refresh();
          await this.parent.refreshAll();
        } catch (error) {
          this.parent.toast("Update failed", error.message || "Unable to update hub.", "danger");
        }
      });
    },

    async openRegisterModal() {
      if (!this.access.canRegister) {
        this.parent.toast("Developer only", "Only logged Developer accounts can register hardware.", "warning");
        return;
      }

      const nextId = await this.loadNextId("hub");
      const modal = this.parent.openModal({
        title: "Register Hub Module",
        body: window.HardwareStructure.renderRegisterForm("hub", nextId),
        footer: `
          <button class="ec-btn" type="button" data-modal-close>Cancel</button>
          <button class="ec-btn ec-btn-primary" type="button" data-hardware-save-register>Register Hub</button>
        `
      });

      modal?.querySelector("[data-hardware-save-register]")?.addEventListener("click", async () => {
        const form = modal.querySelector("[data-hardware-register-form]");
        if (!form) return;

        const payload = this.formToObject(form);
        payload.status = JSON.stringify({
          available: true,
          status: "enabled",
          connection: "offline"
        });

        await this.registerHub(payload);
      });
    },

    async loadNextId(type = "hub") {
      try {
        const payload = await this.parent.getJson(`/api/hardware/next-id?type=${encodeURIComponent(type)}`);
        const data = payload.data || payload;
        return data.next_id || data.id || data.next || "";
      } catch (_) {
        return "";
      }
    },

    async registerHub(payload, override = false) {
      try {
        await this.parent.postJson(this.parent.route("hubRegister", "/api/hubs/register"), Object.assign({}, payload, { override }));
        this.parent.toast("Hub registered", override ? "Hub details were overridden and re-registered." : "New Hub Module has been registered.", "success");
        this.parent.closeModal();
        await this.refresh();
        await this.parent.refreshAll();
      } catch (error) {
        if (this.isDuplicateError(error)) {
          this.openOverrideModal(error, payload);
          return;
        }
        this.parent.toast("Registration failed", error.message || "Unable to register hub.", "danger");
      }
    },

    isDuplicateError(error) {
      const data = error?.data || error?.payload?.data || error?.payload || {};
      const code = String(error?.code || data.code || data.error_code || "").toUpperCase();
      return Boolean(data.requires_override || code.includes("DUPLICATE") || String(error?.message || "").toLowerCase().includes("already registered"));
    },

    openOverrideModal(error, payload) {
      const data = error?.data || error?.payload?.data || error?.payload || {};
      const current = data.current || data.existing || data.device || data.record || data;
      const type = String(current.type || current.device_type || current.table || "hardware").replace(/_/g, " ").toUpperCase();
      const id = current.id || current.hub_id || current.registry_id || current.registry_station_id || "?";
      const location = current.location || current.room || "Unassigned";
      const mac = current.mac || current.mac_address || payload.mac || "Unknown";

      this.parent.openDangerConfirm({
        title: "MAC already registered",
        message: `This MAC Address is already registered as ${type}[${id}] at ${location}. MAC: ${mac}. Override will replace the saved hardware details and reset its registration progress.`,
        onConfirm: async () => {
          await this.registerHub(payload, true);
        }
      });
    },

    confirmDelete(id) {
      const item = this.findItem(id);
      if (!item) {
        this.parent.toast("Hub not found", "Unable to locate this hub module.", "warning");
        return;
      }

      if (!this.access.canDelete) {
        this.parent.toast("Permission denied", "Owner or Developer account is required to delete hardware.", "warning");
        return;
      }

      this.parent.openDangerConfirm({
        title: `Delete HUB[${item.id}]`,
        message: `This will delete HUB[${item.id}] from the database. Prefer Disable when the hardware may still be used later.`,
        onConfirm: async () => {
          try {
            const url = this.parent.route("hubDelete", `/api/hubs/${encodeURIComponent(item.id)}`, item.id);
            await this.parent.deleteJson(url);
            this.parent.toast("Hub deleted", `HUB[${item.id}] has been deleted.`, "success");
            await this.refresh();
            await this.parent.refreshAll();
          } catch (error) {
            this.parent.toast("Delete failed", error.message || "Unable to delete hub.", "danger");
          }
        }
      });
    },

    formToObject(form) {
      const data = new FormData(form);
      const output = {};
      for (const [key, value] of data.entries()) {
        if (["revenue", "consumed_kwh"].includes(key)) {
          output[key] = Number(value || 0);
        } else {
          output[key] = String(value || "").trim();
        }
      }
      return output;
    }
  };

  window.HardwareHub = HardwareHub;
})();
