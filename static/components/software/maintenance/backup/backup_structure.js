/* SOFTWARE BACKUP MAINTENANCE STRUCTURE v1 */
(function () {
  "use strict";

  function render(data = {}) {
    const access = data.access || {};
    if (!access.backups && !access.maintenance) return window.SoftwareStructure.lockedCard("Backup Locked", "Developer");

    const items = Array.isArray(data.items) ? data.items : [];

    return `
      <div class="ec-software-module ec-software-backup">
        <div class="ec-software-toolbar">
          <div>
            <strong>Back Up Section</strong>
            <span>View backup folder records. Select rows to download or delete.</span>
          </div>
          <div class="ec-software-actions">
            <button class="ec-software-btn" type="button" data-backup-refresh>Refresh</button>
            <button class="ec-software-btn ec-software-btn-primary" type="button" data-backup-create>Create Backup</button>
            <button class="ec-software-btn" type="button" data-backup-download disabled>Download</button>
            <button class="ec-software-btn ec-software-btn-danger" type="button" data-backup-delete disabled>Delete</button>
          </div>
        </div>

        <div class="ec-software-card">
          <div class="ec-software-toolbar">
            <label class="ec-software-switch">
              <input type="checkbox" data-backup-select-all>
              <span>Select All</span>
            </label>
            <span class="ec-software-pill">${items.length} backup(s)</span>
          </div>

          <div class="ec-software-scroll" data-backup-list>
            ${items.length ? items.map(backupRow).join("") : empty()}
          </div>
        </div>
      </div>
    `;
  }

  function backupRow(item = {}) {
    const id = item.id || item.backup_id || "";
    const filename = item.filename || item.name || "backup.db";
    const date = item.created_at || item.datetime || item.created || "";
    const reason = item.reason || "";
    const exists = item.exists === false ? "missing" : "available";
    const size = Number(item.size_bytes || 0);

    return `
      <label class="ec-software-backup-row">
        <input type="checkbox" data-backup-check value="${escapeAttr(id)}">
        <span>
          <strong>BACKUP[${escapeHtml(id)}] • ${escapeHtml(filename)}</strong>
          <span>${escapeHtml(date)} • ${escapeHtml(exists)} • ${formatBytes(size)}</span>
          ${reason ? `<span>${escapeHtml(reason)}</span>` : ""}
        </span>
      </label>
    `;
  }

  function empty() {
    return `<div class="ec-software-empty"><div><strong>No backups found</strong><p>Create a backup or refresh the backup folder.</p></div></div>`;
  }

  function formatBytes(bytes) {
    const n = Number(bytes || 0);
    if (!n) return "0 B";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
  }

  window.SoftwareBackupStructure = { render };
})();
