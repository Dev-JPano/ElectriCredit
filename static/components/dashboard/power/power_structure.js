/* =========================================================
   ELECTRICREDIT V2 - POWER DASHBOARD STRUCTURE
   File: static/components/dashboard/power/power_structure.js
   ========================================================= */

(function () {
  "use strict";

  function render(data = {}) {
    const stats = normalizeStats(data.items || []);

    return `
      <div class="ec-dashboard-grid ec-power-dashboard">
        <article class="ec-dashboard-chart-surface">
          <div class="ec-dashboard-toolbar">
            <div>
              <span class="ec-dashboard-chart-label">Power Trend</span>
              <strong>Electricity usage over time</strong>
            </div>

            <div class="ec-dashboard-tools">
              <select class="ec-dashboard-select" data-power-view aria-label="Power view">
                <option value="overall">Overall</option>
                <option value="day">Day</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>

              <select class="ec-dashboard-select" data-power-sort aria-label="Power sorting">
                <option value="date_down">Newest first</option>
                <option value="date_up">Oldest first</option>
                <option value="consume_down">Highest kWh</option>
                <option value="consume_up">Lowest kWh</option>
              </select>
            </div>
          </div>

          <div class="ec-dashboard-chart" data-power-chart></div>
        </article>

        <div class="ec-dashboard-metrics" aria-label="Power summary">
          ${metric("Total kWh", formatNumber(stats.totalKwh, 2))}
          ${metric("Sessions", stats.sessions)}
          ${metric("Average kWh", formatNumber(stats.avgKwh, 2))}
          ${metric("Peak kWh", formatNumber(stats.peakKwh, 2))}
        </div>
      </div>
    `;
  }

  function metric(label, value) {
    return `<article class="ec-dashboard-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
  }

  function normalizeStats(items) {
    const totalKwh = items.reduce((sum, item) => sum + numberOf(item, ["consumed_kwh", "consumedKwh", "kwh", "value"]), 0);
    const sessions = items.reduce((sum, item) => sum + numberOf(item, ["session_count", "sessions"], 0), 0) || items.length;
    const peakKwh = items.reduce((max, item) => Math.max(max, numberOf(item, ["consumed_kwh", "consumedKwh", "kwh", "value"])), 0);
    return { totalKwh, sessions, avgKwh: sessions ? totalKwh / sessions : 0, peakKwh };
  }

  function numberOf(item, keys, fallback = 0) {
    for (const key of keys) {
      const value = Number(item?.[key]);
      if (Number.isFinite(value)) return value;
    }
    return fallback;
  }

  function formatNumber(value, decimals = 0) {
    return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  window.PowerDashboardStructure = { render, normalizeStats };
})();
