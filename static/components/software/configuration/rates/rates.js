/* SOFTWARE RATES CONTROLLER v1 */
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
      if (!this.root || !window.SoftwareRatesStructure) return;
      window.SoftwareRatesDesign?.inject?.();
      this.render();
      this.bindEvents();
    },

    render() {
      this.root.innerHTML = window.SoftwareRatesStructure.render({
        rates: this.summary.rates || {},
        access: this.summary.access || {}
      });
      this.recompute();
    },

    bindEvents() {
      this.root.addEventListener("input", (event) => {
        if (event.target.closest("[data-rate-field]")) this.recompute();
      });

      this.root.addEventListener("click", async (event) => {
        if (event.target.closest("[data-rates-refresh]")) {
          await this.refresh();
          this.parent.toast("Rates refreshed", "Latest rate settings loaded.", "success");
          return;
        }

        if (event.target.closest("[data-rates-update]")) {
          await this.updateRates();
        }
      });
    },

    recompute() {
      const base = this.getNumber("base_rate");
      const tenant = this.getNumber("tenant_rate");
      const income = tenant - base;
      const target = this.root.querySelector('[data-rate-field="income_per_kwh"]');
      if (target) target.value = income.toFixed(2);
    },

    getNumber(name) {
      const input = this.root.querySelector(`[data-rate-field="${name}"]`);
      const value = Number(input?.value || 0);
      return Number.isFinite(value) ? value : 0;
    },

    async refresh() {
      const payload = await this.parent.postJson(this.parent.route("softwareSummary", "/api/software/summary"), {});
      this.summary = window.SoftwareStructure.normalizeSummary(payload);
      this.render();
    },

    async updateRates() {
      const base = this.getNumber("base_rate");
      const tenant = this.getNumber("tenant_rate");

      if (base < 0 || tenant < 0) {
        this.parent.toast("Invalid rates", "Rates cannot be negative.", "danger");
        return;
      }

      const button = this.root.querySelector("[data-rates-update]");
      if (button) button.disabled = true;

      try {
        const payload = await this.parent.postJson(
          this.parent.route("softwareRatesUpdate", "/api/software/rates"),
          {
            base_rate: base,
            tenant_rate: tenant
          }
        );

        this.summary.rates = payload.data || payload.rates || {
          base_rate: base,
          tenant_rate: tenant,
          income_per_kwh: tenant - base
        };

        this.parent.toast("Rates updated", "Base rate and tenant rate were saved.", "success");
        await this.parent.refreshAll();
      } catch (error) {
        this.parent.toast("Update failed", error.message || "Unable to update rates.", "danger");
      } finally {
        if (button) button.disabled = false;
      }
    }
  };

  window.SoftwareRates = C;
})();
