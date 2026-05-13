/* SOFTWARE LOGS STRUCTURE v2 */
(function () {
  "use strict";

  function render(data = {}) {
    const access = data.access || {};
    if (!access.logs_view) return window.SoftwareStructure.lockedCard("Logs Locked", "Administrator");

    const items = sortLogs(Array.isArray(data.items) ? data.items : []);
    const roleLabel = roleAccessLabel(data.role || access.role || "");

    return `
      <div class="ec-software-module ec-software-logs">
        <div class="ec-software-toolbar">
          <div>
            <strong>Logs Section</strong>
            <span>Theme-aware terminal-style logs. Newest records are shown first.</span>
          </div>
          <div class="ec-software-actions">
            <button class="ec-software-btn" type="button" data-logs-refresh>Refresh</button>
            <button class="ec-software-btn ec-software-btn-primary" type="button" data-logs-download ${access.logs_download ? "" : "disabled"}>Download</button>
            <button class="ec-software-btn ec-software-btn-danger" type="button" data-logs-clear ${access.logs_delete ? "" : "disabled"}>Backup + Clear</button>
          </div>
        </div>

        <div class="ec-software-card ec-software-logs-card">
          <div class="ec-software-mini-stats">
            ${stat("Shown", items.length)}
            ${stat("Access", roleLabel)}
            ${stat("Download", access.logs_download ? "enabled" : "locked")}
            ${stat("Backups", data.backups ?? 0)}
          </div>

          <div class="ec-software-log-terminal" data-logs-list>
            <div class="ec-software-log-head">
              <span>TIME</span>
              <span>DATE</span>
              <span>ACTION</span>
              <span>AUTHOR</span>
            </div>
            ${items.length ? items.map(logRow).join("") : empty()}
          </div>
        </div>
      </div>
    `;
  }

  function logRow(row = {}) {
    const rawDate = pick(row.datetime, row.created, row.time, "");
    const parts = splitDate(rawDate);
    const author = pick(row.author, "SYSTEM");
    const action = pick(row.action, row.message, "");
    const tone = actionTone(action);

    return `
      <article class="ec-software-log-row2 is-${tone}">
        <time class="ec-log-time">${escapeHtml(parts.time)}</time>
        <span class="ec-log-date">${escapeHtml(parts.date)}</span>
        <strong class="ec-log-action">${highlightAction(action)}</strong>
        <span class="ec-log-author">${highlightAuthor(author)}</span>
      </article>
    `;
  }

  function empty() {
    return `<div class="ec-software-empty"><div><strong>No logs loaded</strong><p>Click refresh to load system logs.</p></div></div>`;
  }

  function stat(label, value) {
    return `
      <article class="ec-software-mini-stat">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `;
  }

  function sortLogs(items) {
    return items.slice().sort((a, b) => {
      const ad = Date.parse(a.datetime || a.created || a.time || "") || Number(a.id || 0);
      const bd = Date.parse(b.datetime || b.created || b.time || "") || Number(b.id || 0);
      return bd - ad;
    });
  }

  function splitDate(value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      const time = date.toLocaleTimeString(undefined, { hour12: false });
      const day = date.toLocaleDateString(undefined, { month: "long", day: "2-digit", year: "numeric" });
      return { time, date: day };
    }

    const text = String(value || "—");
    const chunks = text.split(/[T ]/);
    return {
      time: chunks[1] ? chunks[1].slice(0, 8) : "—",
      date: chunks[0] || "—"
    };
  }

  function actionTone(action) {
    const text = String(action || "").toLowerCase();
    if (/(delete|clear|failed|error|banned|disabled|danger)/.test(text)) return "danger";
    if (/(backup|download|warning|pending|hold|requested)/.test(text)) return "warning";
    if (/(created|registered|enabled|success|sent|updated|applied|login|logged)/.test(text)) return "success";
    return "info";
  }

  function highlightAction(value) {
    let safe = escapeHtml(value || "—");

    safe = safe.replace(/\b(DEVELOPER|OWNER|ADMINISTRATOR|USER|HUB|REGISTRY|CARD)\[(\d+)\]/g, '<mark class="ec-log-token">$1[$2]</mark>');
    safe = safe.replace(/\b(EMAIL|SMS|DELETE|FAILED|BACKUP|CLEAR|UPDATE|UPDATED|CREATED|REGISTERED|DISABLED|ENABLED|SENT)\b/g, '<mark class="ec-log-word">$1</mark>');
    safe = safe.replace(/₱-?\d+(\.\d+)?/g, '<mark class="ec-log-money">$&</mark>');

    return safe;
  }

  function highlightAuthor(value) {
    const safe = escapeHtml(value || "SYSTEM");
    return safe.replace(/\b(DEVELOPER|OWNER|ADMINISTRATOR|USER|SYSTEM)\[(\d+)\]/g, '<mark class="ec-log-token">$1[$2]</mark>');
  }

  function roleAccessLabel(role) {
    const text = String(role || "").toUpperCase();
    if (text === "DEVELOPER") return "Developer";
    if (text === "OWNER") return "Owner";
    if (text === "ADMINISTRATOR") return "Administrator";
    return "Read only";
  }

  function pick() {
    for (let i = 0; i < arguments.length; i += 1) {
      const value = arguments[i];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return "";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  window.SoftwareLogsStructure = { render };
})();
