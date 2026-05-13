/* =========================================================
   ELECTRICREDIT V2 - USER DASHBOARD STRUCTURE
   File: static/components/dashboard/user/user_structure.js
   ========================================================= */

(function () {
  "use strict";

  function render(data = {}) {
    const stats = normalizeStats(data.items || []);

    return `
      <div class="ec-dashboard-grid ec-user-dashboard">
        <article class="ec-dashboard-chart-surface">
          <div class="ec-dashboard-toolbar">
            <div>
              <span class="ec-dashboard-chart-label">User Ranking</span>
              <strong>Top users and cards</strong>
            </div>

            <div class="ec-dashboard-tools">
              <select class="ec-dashboard-select" data-user-view aria-label="User ranking view">
                <option value="user">Total per user</option>
                <option value="card">Per card</option>
              </select>

              <select class="ec-dashboard-select" data-user-metric aria-label="User ranking metric">
                <option value="revenue">Total revenue</option>
                <option value="kwh">Total kWh</option>
              </select>
            </div>
          </div>

          <div class="ec-dashboard-chart" data-user-chart></div>
        </article>

        <div class="ec-dashboard-metrics" aria-label="User summary">
          ${metric("Users", stats.users)}
          ${metric("Cards", stats.cards)}
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
    const users = new Set(items.map((item) => pick(item, ["user_id", "userId", "id"])).filter(Boolean)).size || items.length;
    const cards = items.reduce((sum, item) => sum + numberOf(item, ["card_count", "cards_count"], Array.isArray(item.cards) ? item.cards.length : 0), 0);
    const kwh = items.reduce((sum, item) => sum + numberOf(item, ["total_used_kwh", "used_kwh", "kwh", "total_kwh"]), 0);
    const revenue = items.reduce((sum, item) => sum + numberOf(item, ["total_revenue", "revenue", "balance", "total_balance"]), 0);
    return { users, cards, kwh, revenue };
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

  window.UserDashboardStructure = { render, normalizeStats };
})();
