/* SOFTWARE RATES STRUCTURE v1 */
(function () {
  "use strict";

  function render(data = {}) {
    const rates = data.rates || {};
    const base = number(rates.base_rate, 15);
    const tenant = number(rates.tenant_rate, 20);
    const income = tenant - base;
    const access = data.access || {};

    if (!access.rates && !access.configuration) {
      return window.SoftwareStructure.lockedCard("Rates Locked", "Administrator");
    }

    return `
      <div class="ec-software-module ec-software-rates">
        <div class="ec-software-toolbar">
          <div>
            <strong>Rates Section</strong>
            <span>Update base rate and tenant rate. Income per kWh is auto-computed.</span>
          </div>
          <div class="ec-software-actions">
            <button class="ec-software-btn" type="button" data-rates-refresh>Refresh</button>
            <button class="ec-software-btn ec-software-btn-primary" type="button" data-rates-update>Update</button>
          </div>
        </div>

        <div class="ec-software-card">
          <div class="ec-software-grid">
            ${field("Base Rate", "base_rate", base, "number", "0.01")}
            ${field("Tenant Rate", "tenant_rate", tenant, "number", "0.01")}
            ${field("Income Per kWh", "income_per_kwh", income.toFixed(2), "number", "0.01", true)}
          </div>

          <div class="ec-software-mini-stats">
            ${stat("Base", peso(base))}
            ${stat("Tenant", peso(tenant))}
            ${stat("Income/kWh", peso(income))}
            ${stat("Mode", income != 0 ? income > 0 ? "profit" : "loss" : "neutral")}
          </div>

          <div class="ec-software-note">
            Formula: Tenant Rate - Base Rate = Income Per kWh. This is only a configuration update;
            actual billing still depends on card sessions and consumed kWh.
          </div>
        </div>
      </div>
    `;
  }

  function field(label, name, value, type = "text", step = "", readonly = false) {
    return `
      <label class="ec-software-field">
        <span>${escapeHtml(label)}</span>
        <input
          type="${escapeAttr(type)}"
          name="${escapeAttr(name)}"
          value="${escapeAttr(value)}"
          ${step ? `step="${escapeAttr(step)}"` : ""}
          ${readonly ? "readonly" : ""}
          data-rate-field="${escapeAttr(name)}"
        >
      </label>
    `;
  }

  function stat(label, value) {
    return `
      <article class="ec-software-mini-stat">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `;
  }

  function number(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function peso(value) {
    return `₱${number(value, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
  }

  window.SoftwareRatesStructure = { render, number };
})();
