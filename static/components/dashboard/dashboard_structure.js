/* =========================================================
   ELECTRICREDIT V2 - DASHBOARD STRUCTURE
   File: static/components/dashboard/dashboard_structure.js
   Purpose: Main dashboard shell, monitor, and 4-way tab switch
   ========================================================= */

(function () {
  "use strict";

  const TABS = [
    {
      id: "power",
      label: "POWER",
      hint: "electricity trend",
      title: "Power Analytics"
    },
    {
      id: "hub",
      label: "HUBS",
      hint: "performance",
      title: "Hub Analytics"
    },
    {
      id: "user",
      label: "USERS",
      hint: "cards",
      title: "User Analytics"
    },
    {
      id: "usage",
      label: "USAGE",
      hint: "hourly heatmap",
      title: "Usage Analytics"
    }
  ];

  function render(data = {}) {
    const summary = normalizeSummary(data);

    return `
      <div id="dashboard" class="ec-dashboard" data-dashboard-section>
        <div class="ec-dashboard-shell">
          <header class="ec-dashboard-hero">
            <div class="ec-dashboard-hero-copy">
              <span class="ec-dashboard-kicker">Dashboard</span>
              <h2>System Analytics</h2>
              <p>
                Public read-only monitoring for electricity trends, hub performance,
                user activity, and hourly usage.
              </p>
            </div>

            <div class="ec-dashboard-live" aria-label="Dashboard live summary">
              ${statusItem("Users", summary.users)}
              ${statusItem("Cards", summary.cards)}
              ${statusItem("Hubs", summary.hubs)}
              ${statusItem("Active", summary.activeSessions)}
            </div>
          </header>

          <section class="ec-dashboard-monitor" aria-label="Dashboard chart monitor">
            <div class="ec-dashboard-monitor-top">
              <div>
                <span class="ec-dashboard-chart-label">Chart Monitor</span>
                <strong data-dashboard-title>Power analytics</strong>
              </div>

              <nav class="ec-dashboard-tabs" aria-label="Dashboard pages" data-dashboard-tabs>
                ${TABS.map((tab, index) => renderTab(tab, index === 0)).join("")}
              </nav>
            </div>

            <div class="ec-dashboard-panels">
              ${TABS.map((tab, index) => `
                <section
                  class="ec-dashboard-panel ${index === 0 ? "is-active" : ""}"
                  data-dashboard-panel="${escapeHtml(tab.id)}"
                  ${index === 0 ? "" : "hidden"}
                >
                  <div data-dashboard-mount="${escapeHtml(tab.id)}"></div>
                </section>
              `).join("")}
            </div>
          </section>
        </div>
      </div>
    `;
  }

  function renderTab(tab, active) {
    return `
      <button
        type="button"
        class="ec-dashboard-tab ${active ? "is-active" : ""}"
        data-dashboard-tab="${escapeHtml(tab.id)}"
        data-dashboard-tab-title="${escapeHtml(tab.title || `${tab.label} Analytics`)}"
        aria-selected="${active ? "true" : "false"}"
      >
        <strong>${escapeHtml(tab.label)}</strong>
        <span>${escapeHtml(tab.hint)}</span>
      </button>
    `;
  }

  function statusItem(label, value) {
    return `
      <article class="ec-dashboard-live-item">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `;
  }

  function normalizeSummary(data = {}) {
    const counts = data.counts || data.summary || data || {};
    return {
      users: pick(counts.users, counts.total_users, 0),
      cards: pick(counts.cards, counts.total_cards, 0),
      hubs: pick(counts.hubs, counts.total_hubs, 0),
      activeSessions: pick(counts.active_sessions, counts.activeSessions, counts.sessions_active, counts.sessions, 0)
    };
  }

  function pick(...values) {
    for (const value of values) {
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return 0;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  window.DashboardStructure = { tabs: TABS, render, normalizeSummary };
})();
