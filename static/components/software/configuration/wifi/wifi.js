/* SOFTWARE WIFI / CONNECTION CONTROLLER v3 */
(function () {
  "use strict";

  const C = {
    root: null,
    parent: null,
    summary: null,
    status: {},
    networks: [],
    busy: {
      status: false,
      scan: false,
      connect: false,
      forget: false,
      save: false
    },

    async init(ctx = {}) {
      this.root = ctx.root;
      this.parent = ctx.parent || window.SoftwareController;
      this.summary = ctx.summary || {};
      this.busy = { status: false, scan: false, connect: false, forget: false, save: false };

      if (!this.root || !window.SoftwareWifiStructure) return;

      window.SoftwareWifiDesign?.inject?.();
      this.status = this.summary.device || {};
      this.render();
      this.bindEvents();
      await this.refreshStatus(false);
    },

    render() {
      this.root.innerHTML = window.SoftwareWifiStructure.render({
        access: this.summary.access || {},
        device: Object.assign({}, this.summary.device || {}, this.status || {}),
        status: this.status || {},
        networks: this.networks
      });
    },

    bindEvents() {
      if (!this.root || this.root.dataset.wifiBound === "true") return;
      this.root.dataset.wifiBound = "true";

      this.root.addEventListener("change", (event) => {
        const mode = event.target.closest("[data-wifi-network-mode]");
        if (!mode) return;

        this.root.querySelectorAll(".ec-wifi-mode").forEach((item) => item.classList.remove("is-active"));
        mode.closest(".ec-wifi-mode")?.classList.add("is-active");
      });

      this.root.addEventListener("click", async (event) => {
        const network = event.target.closest("[data-wifi-network]");
        const status = event.target.closest("[data-wifi-status]");
        const scan = event.target.closest("[data-wifi-scan]");
        const connect = event.target.closest("[data-wifi-connect]");
        const forget = event.target.closest("[data-wifi-forget]");
        const save = event.target.closest("[data-wifi-save-hotspot]");

        if (!network && !status && !scan && !connect && !forget && !save) return;

        event.preventDefault();
        event.stopPropagation();

        if (network) {
          const input = this.root.querySelector("[data-wifi-ssid]");
          if (input) input.value = network.dataset.wifiNetwork || "";
          return;
        }

        if (status) return this.refreshStatus(true, status);
        if (scan) return this.scanNetworks(scan);
        if (connect) return this.connect(connect);
        if (forget) return this.forget(forget);
        if (save) return this.saveHotspot(save);
      });
    },

    async refreshStatus(showToast = true, button = null) {
      if (this.busy.status) return;

      this.busy.status = true;
      this.setButtonBusy(button || this.root.querySelector("[data-wifi-status]"), true, "Refreshing...");

      try {
        const payload = await this.parent.postJson(
          this.parent.route("softwareConnectionStatus", "/api/software/connection/status"),
          {}
        );

        this.status = payload.data || {};
        this.render();

        if (showToast) {
          this.parent.toast("Connection refreshed", "Connection status was updated.", "success");
        }
      } catch (error) {
        this.parent.toast("Connection failed", error.message || "Unable to load connection status.", "danger");
      } finally {
        this.busy.status = false;
        this.setButtonBusy(this.root.querySelector("[data-wifi-status]"), false);
      }
    },

    async scanNetworks(button = null) {
      if (this.busy.scan) return;

      this.busy.scan = true;
      this.setButtonBusy(button || this.root.querySelector("[data-wifi-scan]"), true, "Scanning...");

      try {
        const payload = await this.parent.postJson(
          this.parent.route("softwareConnectionScan", "/api/software/connection/scan"),
          {}
        );

        const data = payload.data || {};
        this.networks = Array.isArray(data.networks) ? data.networks : (Array.isArray(data.items) ? data.items : []);
        this.render();

        this.parent.toast("Scan complete", `${this.networks.length} network(s) found.`, "success");
      } catch (error) {
        this.parent.toast("Scan failed", error.message || "Unable to scan Wi-Fi.", "danger");
      } finally {
        this.busy.scan = false;
        this.setButtonBusy(this.root.querySelector("[data-wifi-scan]"), false);
      }
    },

    async connect(button = null) {
      if (this.busy.connect) return;

      const ssid = this.root.querySelector("[data-wifi-ssid]")?.value || "";
      const password = this.root.querySelector("[data-wifi-password]")?.value || "";

      if (!ssid.trim()) {
        this.parent.toast("SSID required", "Enter or select a Wi-Fi network.", "warning");
        return;
      }

      this.busy.connect = true;
      this.setButtonBusy(button || this.root.querySelector("[data-wifi-connect]"), true, "Connecting...");

      try {
        await this.parent.postJson(
          this.parent.route("softwareConnectionConnect", "/api/software/connection/connect"),
          { ssid, password }
        );

        this.parent.toast("Wi-Fi request sent", `Connection request sent for ${ssid}.`, "success");

        const pass = this.root.querySelector("[data-wifi-password]");
        if (pass) pass.value = "";

        await this.refreshStatus(false);
      } catch (error) {
        this.parent.toast("Connect failed", error.message || "Unable to connect Wi-Fi.", "danger");
      } finally {
        this.busy.connect = false;
        this.setButtonBusy(this.root.querySelector("[data-wifi-connect]"), false);
      }
    },

    async forget(button = null) {
      if (this.busy.forget) return;

      const ssid = this.root.querySelector("[data-wifi-ssid]")?.value || "";
      if (!ssid.trim()) {
        this.parent.toast("SSID required", "Enter or select a Wi-Fi network to forget.", "warning");
        return;
      }

      this.busy.forget = true;
      this.setButtonBusy(button || this.root.querySelector("[data-wifi-forget]"), true, "Forgetting...");

      try {
        await this.parent.postJson(
          this.parent.route("softwareConnectionForget", "/api/software/connection/forget"),
          { ssid }
        );

        this.parent.toast("Wi-Fi forgotten", `${ssid} was removed/marked as forgotten.`, "success");

        const input = this.root.querySelector("[data-wifi-ssid]");
        if (input) input.value = "";

        await this.refreshStatus(false);
      } catch (error) {
        this.parent.toast("Forget failed", error.message || "Unable to forget Wi-Fi.", "danger");
      } finally {
        this.busy.forget = false;
        this.setButtonBusy(this.root.querySelector("[data-wifi-forget]"), false);
      }
    },

    async saveHotspot(button = null) {
      if (this.busy.save) return;

      const hotspot_name = this.root.querySelector("[data-wifi-hotspot-name]")?.value || "ElectriCredit";
      const hotspot_password = this.root.querySelector("[data-wifi-hotspot-password]")?.value || "";
      const local_server_url = this.root.querySelector("[data-wifi-local-url]")?.value || "";
      const payment_bridge_url = this.root.querySelector("[data-wifi-payment-url]")?.value || "";
      const network_mode = this.root.querySelector("[data-wifi-network-mode]:checked")?.value || "local_only";

      this.busy.save = true;
      this.setButtonBusy(button || this.root.querySelector("[data-wifi-save-hotspot]"), true, "Saving...");

      try {
        await this.parent.putJson(this.parent.route("softwareConnectionUpdate", "/api/software/connection"), {
          hotspot_name,
          hotspot_password,
          local_server_url,
          payment_bridge_url,
          network_mode
        });

        this.parent.toast("Connection settings saved", "Local access mode, hotspot, and bridge URL were updated.", "success");
        await this.parent.refreshAll();
      } catch (error) {
        this.parent.toast("Save failed", error.message || "Unable to save connection settings.", "danger");
      } finally {
        this.busy.save = false;
        this.setButtonBusy(this.root.querySelector("[data-wifi-save-hotspot]"), false);
      }
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

  window.SoftwareWifi = C;
})();
