/* ELECTRICREDIT V2 - SOFTWARE STRUCTURE v3 */
(function () {
  "use strict";

  const MODULES = [
    {
      id: "rates",
      label: "Rates",
      hint: "base / tenant",
      title: "Rate Configuration",
      subtitle: "Update electricity rates and preview income per kWh.",
      role: "ADMINISTRATOR"
    },
    {
      id: "wifi",
      label: "Connection",
      hint: "wifi / hotspot",
      title: "Connection Manager",
      subtitle: "Administrator-level Wi-Fi and local network connection controls.",
      role: "ADMINISTRATOR"
    },
    {
      id: "logs",
      label: "Logs",
      hint: "view / backup",
      title: "System Logs",
      subtitle: "Terminal-style log viewer with role-aware backup and download actions.",
      role: "ADMINISTRATOR"
    },
    {
      id: "announcement",
      label: "Announcement",
      hint: "email / sms",
      title: "Announcements",
      subtitle: "Send HTML email or SMS announcements to members or custom receivers.",
      role: "ADMINISTRATOR"
    },
    {
      id: "bonus",
      label: "Bonus",
      hint: "balance tools",
      title: "Balance Bonus",
      subtitle: "Apply positive or negative balance changes to selected cards.",
      role: "OWNER"
    },
    {
      id: "server",
      label: "Server",
      hint: "device / bridge",
      title: "Server Maintenance",
      subtitle: "Developer-only device ID, bridge ID, and all-balance maintenance.",
      role: "DEVELOPER"
    },
    {
      id: "database",
      label: "Database",
      hint: "safe table editor",
      title: "Database Maintenance",
      subtitle: "Developer-only Supabase-style table editor with staged updates.",
      role: "DEVELOPER"
    },
    {
      id: "backup",
      label: "Backup",
      hint: "restore / delete",
      title: "Backup Maintenance",
      subtitle: "Developer-only backup listing, download, restore, and delete controls.",
      role: "DEVELOPER"
    }
  ];

  function render(data = {}) {
    const summary = normalizeSummary(data);
    const access = summary.access || {};

    return `
      <div id="software" class="ec-software" data-software-section>
        <div class="ec-software-shell">
          <header class="ec-software-head">
            <div>
              <span class="ec-software-kicker">Software</span>
              <h2>System Console</h2>
              <p>
                Manage configuration, network connection, announcements, logs, balance operations,
                and developer-only maintenance through the ElectriCredit RBAC waterfall.
              </p>
            </div>

            <div class="ec-software-status" aria-label="Software status">
              ${stat("Role", summary.role || "VISITOR")}
              ${stat("Users", summary.counts.users || 0)}
              ${stat("Cards", summary.counts.cards || 0)}
              ${stat("Backups", summary.counts.backups || 0)}
            </div>
          </header>

          <section class="ec-software-console" aria-label="Software console">
            <div class="ec-software-console-top">
              <div class="ec-software-console-title">
                <strong data-software-title>${escapeHtml(MODULES[0].title)}</strong>
                <span data-software-subtitle>${escapeHtml(MODULES[0].subtitle)}</span>
              </div>

              <nav class="ec-software-tabs" aria-label="Software tools" data-software-tabs>
                ${MODULES.map((item, index) => tab(item, index === 0, access)).join("")}
              </nav>
            </div>

            ${MODULES.map((item, index) => panel(item, index === 0)).join("")}
          </section>
        </div>
      </div>
    `;
  }

  function tab(item, active, access) {
    const allowed = canOpen(item, access);
    return `
      <button
        type="button"
        class="ec-software-tab ${active ? "is-active" : ""} ${allowed ? "" : "is-locked"}"
        data-software-tab="${escapeAttr(item.id)}"
        aria-selected="${active ? "true" : "false"}"
        ${allowed ? "" : 'aria-disabled="true"'}
      >
        <strong>${escapeHtml(item.label)}</strong>
        <span>${allowed ? escapeHtml(item.hint) : "locked"}</span>
      </button>
    `;
  }

  function panel(item, active) {
    return `
      <section
        class="ec-software-panel ${active ? "is-active" : ""}"
        data-software-panel="${escapeAttr(item.id)}"
        ${active ? "" : "hidden"}
      >
        <div data-software-mount="${escapeAttr(item.id)}" class="ec-software-loading">
          Loading ${escapeHtml(item.label.toLowerCase())}...
        </div>
      </section>
    `;
  }

  function stat(label, value) {
    return `
      <article class="ec-software-stat">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(formatValue(value))}</strong>
      </article>
    `;
  }

  function lockedCard(title, requiredRole) {
    return `
      <div class="ec-software-locked">
        <div>
          <strong>${escapeHtml(title || "Locked")}</strong>
          <p>${escapeHtml(requiredRole || "Higher role")} access is required to use this tool.</p>
        </div>
      </div>
    `;
  }

  function canOpen(item, access) {
    if (["server", "database", "backup"].includes(item.id)) return Boolean(access.maintenance || access.database || access.backups || access.device);
    if (item.id === "wifi") return Boolean(access.configuration || access.connection || access.rates);
    if (item.id === "bonus") return Boolean(access.bonus);
    if (item.id === "logs") return Boolean(access.logs_view);
    if (item.id === "announcement") return Boolean(access.announcement);
    return Boolean(access.configuration || access.rates);
  }

  function normalizeSummary(input = {}) {
    let source = input;
    for (let i = 0; i < 4; i += 1) {
      if (source && typeof source === "object" && !Array.isArray(source) && "data" in source) source = source.data;
      else break;
    }

    if (!source || typeof source !== "object") source = {};

    return {
      role: source.role || "VISITOR",
      access: source.access || {},
      counts: source.counts || {},
      rates: source.rates || {},
      device: source.device || {},
      providers: source.providers || {},
      settings: source.settings || {}
    };
  }

  function formatValue(value) {
    if (value === undefined || value === null || value === "") return "—";
    if (typeof value === "number") return value.toLocaleString();
    return String(value);
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

  window.SoftwareStructure = {
    modules: MODULES,
    render,
    stat,
    lockedCard,
    normalizeSummary,
    formatValue,
    escapeHtml,
    escapeAttr
  };
})();
