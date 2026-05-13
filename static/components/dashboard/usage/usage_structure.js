/* =========================================================
   ELECTRICREDIT V2 - USAGE DASHBOARD STRUCTURE
   File: static/components/dashboard/usage/usage_structure.js
   ========================================================= */

(function () {
  "use strict";

  function render(data = {}) {
    const stats = normalizeStats(data.items || []);

    return `
      <div class="ec-dashboard-grid ec-usage-dashboard">
        <article class="ec-dashboard-chart-surface">
          <div class="ec-dashboard-toolbar">
            <div>
              <span class="ec-dashboard-chart-label">Hourly Usage</span>
              <strong>kWh usage by hub and hour</strong>
            </div>
          </div>

          <div class="ec-dashboard-chart" data-usage-chart></div>
        </article>

        <div class="ec-dashboard-metrics" aria-label="Usage summary">
          ${metric("Hubs", stats.hubs)}
          ${metric("Hours", "00-23")}
          ${metric("Total kWh", formatNumber(stats.kwh, 2))}
          ${metric("Peak Hour", stats.peakHour)}
        </div>
      </div>
    `;
  }

  function metric(label, value) {
    return `<article class="ec-dashboard-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
  }

  function normalizeStats(items) {
    const hubs = new Set(items.map((item) => pick(item, ["hub_id", "hubId", "id", "hub"])).filter(Boolean)).size;
    const kwh = items.reduce((sum, item) => sum + numberOf(item, ["consumed_kwh", "consumedKwh", "kwh", "value"]), 0);
    const hourTotals = new Map();

    items.forEach((item) => {
      const hour = getHour(pick(item, ["started", "created", "datetime", "hour"]));
      hourTotals.set(hour, (hourTotals.get(hour) || 0) + numberOf(item, ["consumed_kwh", "consumedKwh", "kwh", "value"]));
    });

    let peakHour = "--:00";
    let peakValue = -1;

    hourTotals.forEach((value, hour) => {
      if (value > peakValue) {
        peakValue = value;
        peakHour = `${String(hour).padStart(2, "0")}:00`;
      }
    });

    return { hubs, kwh, peakHour };
  }

  function getHour(value) {
    const numeric = Number(value);
    if (Number.isInteger(numeric) && numeric >= 0 && numeric <= 23) return numeric;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getHours();
  }

  function pick(item, keys) {
    for (const key of keys) {
      if (item?.[key] !== undefined && item?.[key] !== null && item?.[key] !== "") return item[key];
    }
    return "";
  }

  function numberOf(item, keys) {
    for (const key of keys) {
      const value = Number(item?.[key]);
      if (Number.isFinite(value)) return value;
    }
    return 0;
  }

  function formatNumber(value, decimals = 0) {
    return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  window.UsageDashboardStructure = { render, normalizeStats };
})();
