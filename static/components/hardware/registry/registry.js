/* =========================================================
   ELECTRICREDIT V2 - HARDWARE REGISTRY CONTROLLER
   File: static/components/hardware/registry/registry.js
   ========================================================= */

(function () {
  "use strict";

  const HardwareRegistry = {
    root: null,
    parent: null,
    app: null,
    items: [],

    async init(context = {}) {
      this.root = context.root;
      this.parent = context.parent || window.HardwareController;
      this.app = context.app || window.ElectriCredit || null;

      if (!this.root || !window.HardwareRegistryStructure) return;

      window.HardwareRegistryDesign?.inject?.();
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
      this.root.innerHTML = `<div class="ec-hardware-loading">Loading registry stations...</div>`;
      this.items = await this.loadData();
      this.render();
    },

    async loadData() {
      try {
        const payload = await this.parent.getJson(this.parent.route("registry", "/api/registry"));
        const data = payload.data || payload;
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.items)) return data.items;
        if (Array.isArray(data.registry)) return data.registry;
        if (Array.isArray(data.registry_stations)) return data.registry_stations;
        return [];
      } catch (error) {
        console.warn("Hardware registry failed:", error);
        return [];
      }
    },

    render() {
      this.root.innerHTML = window.HardwareRegistryStructure.render({
        items: this.items,
        access: this.access
      });
    },

    bindEvents() {
      this.root.addEventListener("click", async (event) => {
        const refresh = event.target.closest("[data-registry-refresh]");
        if (refresh) {
          await this.refresh();
          this.parent.toast("Registry refreshed", "Registry Station list has been reloaded.", "success");
          return;
        }

        const add = event.target.closest("[data-registry-add]");
        if (add) {
          this.openRegisterModal();
          return;
        }

        const details = event.target.closest("[data-registry-details]");
        if (details) {
          this.openDetailsModal(details.dataset.registryDetails);
          return;
        }

        const edit = event.target.closest("[data-registry-edit]");
        if (edit) {
          this.openEditModal(edit.dataset.registryEdit);
          return;
        }

        const ping = event.target.closest("[data-registry-ping]");
        if (ping) {
          await this.sendAction("registryPing", "/api/registry/ping", { id: ping.dataset.registryPing }, "Registry Station ping sent.");
          return;
        }

        const enable = event.target.closest("[data-registry-enable]");
        if (enable) {
          await this.sendAction("registryEnable", "/api/registry/enable", { id: enable.dataset.registryEnable }, "Registry Station enabled.");
          return;
        }

        const disable = event.target.closest("[data-registry-disable]");
        if (disable) {
          await this.sendAction("registryDisable", "/api/registry/disable", { id: disable.dataset.registryDisable }, "Registry Station disabled.");
          return;
        }

        const del = event.target.closest("[data-registry-delete]");
        if (del) {
          this.confirmDelete(del.dataset.registryDelete);
        }
      });
    },

    findItem(id) {
      return window.HardwareRegistryStructure.normalizeItems(this.items).find((row) => String(row.id) === String(id));
    },

    async sendAction(routeName, fallbackUrl, body, successMessage) {
      try {
        await this.parent.postJson(this.parent.route(routeName, fallbackUrl), body);
        this.parent.toast("Hardware action", successMessage, "success");
        await this.refresh();
        await this.parent.refreshAll();
      } catch (error) {
        this.parent.toast("Action failed", error.message || "Unable to complete registry action.", "danger");
      }
    },

    openDetailsModal(id) {
      const item = this.findItem(id);
      if (!item) {
        this.parent.toast("Registry not found", "Unable to locate this Registry Station.", "warning");
        return;
      }

      this.parent.openModal({
        title: `REGISTRY[${item.id}] Details`,
        body: window.HardwareStructure.renderDeviceModalDetails(item, "REGISTRY"),
        footer: `
          <button class="ec-btn" type="button" data-modal-close>Close</button>
          <button class="ec-btn ec-btn-primary" type="button" data-hardware-modal-edit-registry="${this.parent.escapeHtml(item.id)}" ${this.access.canEdit ? "" : "disabled"}>Edit</button>
        `
      });

      const modalRoot = document.querySelector("#modal-root");
      modalRoot?.querySelector("[data-hardware-modal-edit-registry]")?.addEventListener("click", () => {
        this.parent.closeModal();
        this.openEditModal(item.id);
      });
    },

    openEditModal(id) {
      const item = this.findItem(id);
      if (!item) {
        this.parent.toast("Registry not found", "Unable to locate this Registry Station.", "warning");
        return;
      }

      if (!this.access.canEdit) {
        this.parent.toast("Permission denied", "Owner or Developer account is required to edit registry information.", "warning");
        return;
      }

      const modal = this.parent.openModal({
        title: `Edit REGISTRY[${item.id}]`,
        body: window.HardwareStructure.renderEditForm(item, "registry"),
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
          const url = this.parent.route("databaseTableRowUpdate", `/api/database/table/registry_stations/row/${encodeURIComponent(item.id)}`, "registry_stations", item.id);
          await this.parent.putJson(url, payload);
          this.parent.toast("Registry updated", `REGISTRY[${item.id}] information has been updated.`, "success");
          this.parent.closeModal();
          await this.refresh();
          await this.parent.refreshAll();
        } catch (error) {
          this.parent.toast("Update failed", error.message || "Unable to update registry.", "danger");
        }
      });
    },

    async openRegisterModal() {
      if (!this.access.canRegister) {
        this.parent.toast("Developer only", "Only logged Developer accounts can register hardware.", "warning");
        return;
      }

      const nextId = await this.loadNextId("registry");
      const modal = this.parent.openModal({
        title: "Register Registry Station",
        body: window.HardwareStructure.renderRegisterForm("registry", nextId),
        footer: `
          <button class="ec-btn" type="button" data-modal-close>Cancel</button>
          <button class="ec-btn ec-btn-primary" type="button" data-hardware-save-register>Register Registry</button>
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

        await this.registerRegistry(payload);
      });
    },

    async loadNextId(type = "registry") {
      try {
        const payload = await this.parent.getJson(`/api/hardware/next-id?type=${encodeURIComponent(type)}`);
        const data = payload.data || payload;
        return data.next_id || data.id || data.next || "";
      } catch (_) {
        return "";
      }
    },

    async registerRegistry(payload, override = false) {
      try {
        await this.parent.postJson(this.parent.route("registryRegister", "/api/registry/register"), Object.assign({}, payload, { override }));
        this.parent.toast("Registry registered", override ? "Registry details were overridden and re-registered." : "New Registry Station has been registered.", "success");
        this.parent.closeModal();
        await this.refresh();
        await this.parent.refreshAll();
      } catch (error) {
        if (this.isDuplicateError(error)) {
          this.openOverrideModal(error, payload);
          return;
        }
        this.parent.toast("Registration failed", error.message || "Unable to register registry.", "danger");
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
          await this.registerRegistry(payload, true);
        }
      });
    },

    confirmDelete(id) {
      const item = this.findItem(id);
      if (!item) {
        this.parent.toast("Registry not found", "Unable to locate this Registry Station.", "warning");
        return;
      }

      if (!this.access.canDelete) {
        this.parent.toast("Permission denied", "Owner or Developer account is required to delete hardware.", "warning");
        return;
      }

      this.parent.openDangerConfirm({
        title: `Delete REGISTRY[${item.id}]`,
        message: `This will delete REGISTRY[${item.id}] from the database. Prefer Disable when the hardware may still be used later.`,
        onConfirm: async () => {
          try {
            const url = this.parent.route("registryDelete", `/api/registry/${encodeURIComponent(item.id)}`, item.id);
            await this.parent.deleteJson(url);
            this.parent.toast("Registry deleted", `REGISTRY[${item.id}] has been deleted.`, "success");
            await this.refresh();
            await this.parent.refreshAll();
          } catch (error) {
            this.parent.toast("Delete failed", error.message || "Unable to delete registry.", "danger");
          }
        }
      });
    },

    formToObject(form) {
      const data = new FormData(form);
      const output = {};
      for (const [key, value] of data.entries()) {
        output[key] = String(value || "").trim();
      }
      return output;
    }
  };

  window.HardwareRegistry = HardwareRegistry;
})();
