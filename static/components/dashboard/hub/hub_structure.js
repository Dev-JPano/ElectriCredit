/* =========================================================
   ELECTRICREDIT V2 - HUB DASHBOARD STRUCTURE
   File: static/components/dashboard/hub/hub_structure.js
   ========================================================= */

(function () {
  "use strict";

  function render(data = {}) {
    const stats = normalizeStats(data.items || []);

    return `
      <div class="ec-dashboard-grid ec-hub-dashboard">
        <article class="ec-dashboard-chart-surface">
          <div class="ec-dashboard-toolbar">
            <div>
              <span class="ec-dashboard-chart-label">Hub Performance</span>
              <strong>Compare hubs by kWh, sessions, or revenue</strong>
            </div>

            <div class="ec-dashboard-tools">
              <select class="ec-dashboard-select" data-hub-view aria-label="Hub performance view">
                <option value="power">Power / kWh</option>
                <option value="sessions">Session count</option>
                <option value="revenue">Revenue</option>
              </select>
            </div>
          </div>

          <div class="ec-dashboard-chart" data-hub-chart></div>
        </article>

        <div class="ec-dashboard-metrics" aria-label="Hub summary">
          ${metric("Hubs", stats.hubs)}
          ${metric("Sessions", stats.sessions)}
          ${metric("Total kWh", formatNumber(stats.kwh, 2))}
          ${metric("Revenue", formatPeso(stats.revenue))}
        </div>
      </div>
    `;
  }

  function metric(label, value) {
    return `<article class="ec-dashboard-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
  }

  function normalizeStats(items) {
    const hubs = new Set(items.map((item) => pick(item, ["hub_id", "hubId", "id", "hub"])).filter(Boolean)).size;
    const sessions = items.reduce((sum, item) => sum + numberOf(item, ["session_count", "sessions"], 0), 0) || items.length;
    const kwh = items.reduce((sum, item) => sum + numberOf(item, ["consumed_kwh", "consumedKwh", "kwh", "value"]), 0);
    const revenue = items.reduce((sum, item) => sum + numberOf(item, ["revenue", "total_revenue"]), 0);
    return { hubs, sessions, kwh, revenue };
  }

  function pick(item, keys) {
    for (const key of keys) {
      if (item?.[key] !== undefined && item?.[key] !== null && item?.[key] !== "") return item[key];
    }
    return "";
  }

  function numberOf(item, keys, fallback = 0) {
    for (const key of keys) {
      const value = Number(item?.[key]);
      if (Number.isFinite(value)) return value;
    }
    return fallback;
  }

  function formatPeso(value) {
    return `₱${formatNumber(value, 2)}`;
  }

  function formatNumber(value, decimals = 0) {
    return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  window.HubDashboardStructure = { render, normalizeStats };
})();
