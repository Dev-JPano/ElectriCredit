/* SOFTWARE DATABASE MAINTENANCE STRUCTURE v2 */
(function () {
  "use strict";

  function render(data = {}) {
    const access = data.access || {};
    if (!access.database && !access.maintenance) return window.SoftwareStructure.lockedCard("Database Locked", "Developer");

    const tables = Array.isArray(data.tables) ? data.tables : [];
    const current = data.current || "";
    const tableData = data.tableData || {};
    const rows = Array.isArray(data.rows) ? data.rows : normalizeRows(tableData);
    const columns = Array.isArray(data.columns) && data.columns.length ? data.columns : normalizeColumns(tableData, rows);
    const sort = data.sort || { key: "", direction: "" };
    const search = data.search || "";

    return `
      <div class="ec-software-module ec-software-database">
        <div class="ec-software-toolbar">
          <div>
            <strong>Database Section</strong>
            <span>Developer-only staged editor. Search, sort, inspect, edit, export, and clear tables safely.</span>
          </div>
          <div class="ec-software-actions">
            <button class="ec-software-btn" type="button" data-db-refresh>Refresh</button>
            <button class="ec-software-btn ec-software-btn-danger" type="button" data-db-clear-database ${tables.length ? "" : "disabled"}>Clear Database</button>
          </div>
        </div>

        <div class="ec-software-card">
          <div class="ec-software-db-header">
            <label class="ec-software-field">
              <span>Table</span>
              <select data-db-table-select>
                <option value="">Select table</option>
                ${tables.map((table) => tableOption(table, current)).join("")}
              </select>
            </label>

            <label class="ec-software-field ec-software-db-search-field">
              <span>Search Rows</span>
              <input type="search" value="${escapeAttr(search)}" placeholder="Search current table..." data-db-search ${current ? "" : "disabled"}>
            </label>

            <div class="ec-software-actions ec-software-db-actions">
              <button class="ec-software-btn" type="button" data-db-download ${current ? "" : "disabled"}>Download</button>
              <button class="ec-software-btn ec-software-btn-danger" type="button" data-db-delete-all ${current ? "" : "disabled"}>Delete All</button>
              <button class="ec-software-btn" type="button" data-db-add-row ${current ? "" : "disabled"}>Add Row</button>
              <button class="ec-software-btn ec-software-btn-primary" type="button" data-db-update disabled>Update</button>
            </div>
          </div>

          ${current ? tableView(current, columns, rows, sort) : emptySelect()}
        </div>
      </div>
    `;
  }

  function tableOption(table, current) {
    const name = typeof table === "string" ? table : (table.name || table.table || "");
    const label = typeof table === "string" ? table : `${table.name || table.table || ""}${table.count !== undefined ? ` (${table.count})` : ""}`;
    return `<option value="${escapeAttr(name)}" ${String(name) === String(current) ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }

  function tableView(tableName, columns, rows, sort = {}) {
    return `
      <div class="ec-software-note">
        Editing cells, adding rows, and marking deletes are staged only. Click UPDATE to apply them.
        Click column headers to sort: low → high, high → low, neutral.
      </div>

      <div class="ec-software-table-wrap">
        <table class="ec-software-db-table" data-db-table="${escapeAttr(tableName)}">
          <thead>
            <tr>
              <th>State</th>
              ${columns.map((col) => sortableHeader(col, sort)).join("")}
              <th>Delete</th>
            </tr>
          </thead>
          <tbody data-db-tbody>
            ${rows.length ? rows.map((row, index) => rowView(row, columns, index)).join("") : emptyRow(columns)}
          </tbody>
        </table>
      </div>
    `;
  }

  function sortableHeader(col, sort = {}) {
    const active = sort.key === col;
    const mark = active ? (sort.direction === "asc" ? " ↑" : sort.direction === "desc" ? " ↓" : "") : "";
    return `<th><button class="ec-db-sort-btn ${active ? "is-active" : ""}" type="button" data-db-sort="${escapeAttr(col)}">${escapeHtml(col)}${mark}</button></th>`;
  }

  function rowView(row, columns, index) {
    const id = row.id || row.ID || "";
    return `
      <tr data-db-row="${escapeAttr(id)}" data-db-index="${escapeAttr(index)}" data-db-state="clean">
        <td><span class="ec-software-pill" data-db-row-state>clean</span></td>
        ${columns.map((col) => cell(row, col)).join("")}
        <td><button class="ec-software-btn ec-software-btn-danger" type="button" data-db-mark-delete>Delete</button></td>
      </tr>
    `;
  }

  function cell(row, col) {
    const value = row[col];
    const formatted = formatCell(value);
    const readonly = col === "id";
    const jsonType = jsonPreviewType(formatted);
    return `
      <td>
        <input
          class="ec-software-db-cell ${jsonType ? `is-json is-${jsonType}` : ""}"
          type="text"
          value="${escapeAttr(formatted)}"
          title="${escapeAttr(formatted)}"
          data-db-cell="${escapeAttr(col)}"
          data-db-cell-type="${escapeAttr(jsonType)}"
          ${readonly ? "readonly" : ""}
        >
      </td>
    `;
  }

  function renderClearDatabaseModal(tables = []) {
    const items = tables.map((table) => {
      const name = typeof table === "string" ? table : (table.name || table.table || "");
      const count = typeof table === "string" ? "" : (table.count !== undefined ? table.count : "");
      const blocked = String(name).toLowerCase() === "backups";
      return `
        <label class="ec-db-clear-table ${blocked ? "is-disabled" : ""}">
          <input type="checkbox" value="${escapeAttr(name)}" data-db-clear-table ${blocked ? "disabled" : ""}>
          <span>
            <strong>${escapeHtml(name)}</strong>
            <small>${blocked ? "Use Backup section" : `${escapeHtml(count)} row(s)`}</small>
          </span>
        </label>
      `;
    }).join("");

    return `
      <div class="ec-db-clear-modal">
        <div class="ec-software-note">
          Select tables to clear. The Backups table is protected here so backup files and database rows stay synced.
        </div>
        <div class="ec-db-clear-top">
          <button class="ec-software-btn" type="button" data-db-clear-select-all>Select All Safe Tables</button>
          <button class="ec-software-btn" type="button" data-db-clear-select-none>Clear Selection</button>
        </div>
        <div class="ec-db-clear-list">${items}</div>

        <div class="ec-db-otp-box">
          <label class="ec-software-field">
            <span>Developer OTP</span>
            <div class="ec-db-otp-actions">
              <button class="ec-software-btn" type="button" data-db-clear-send-otp>Send OTP</button>
              <input type="text" inputmode="numeric" maxlength="12" placeholder="000000" data-db-clear-otp>
              <button class="ec-software-btn ec-software-btn-primary" type="button" data-db-clear-verify-otp>Verify OTP</button>
            </div>
          </label>
          <p class="ec-db-otp-status" data-db-clear-otp-status>OTP verification is required before proceeding.</p>
        </div>
      </div>
    `;
  }

  function renderCellModal(value = "", column = "") {
    return `
      <div class="ec-db-cell-modal">
        <div class="ec-software-note">
          Editing column: <strong>${escapeHtml(column)}</strong>. JSON-like values are checked before saving.
        </div>
        <textarea class="ec-db-cell-editor" data-db-cell-editor spellcheck="false">${escapeHtml(value)}</textarea>
        <div class="ec-db-json-preview" data-db-json-preview>${jsonPreview(value)}</div>
      </div>
    `;
  }

  function jsonPreview(value = "") {
    const text = String(value || "").trim();
    if (!text || !/^[[{]/.test(text)) return `<span class="ec-muted">Hover/click JSON cells to inspect object or array content.</span>`;
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return `<strong>Array Preview</strong><ul>${parsed.map((item, i) => `<li><span>Item ${i + 1}</span><code>${escapeHtml(formatCell(item))}</code></li>`).join("")}</ul>`;
      }
      if (parsed && typeof parsed === "object") {
        return `<strong>Object Preview</strong><ul>${Object.entries(parsed).map(([k, v]) => `<li><span>${escapeHtml(k)}</span><code>${escapeHtml(formatCell(v))}</code></li>`).join("")}</ul>`;
      }
    } catch {
      return `<strong>JSON Preview</strong><p class="is-danger">Invalid or incomplete JSON.</p>`;
    }
    return `<span class="ec-muted">No JSON preview available.</span>`;
  }

  function emptyRow(columns) {
    return `
      <tr>
        <td colspan="${columns.length + 2}">
          <div class="ec-software-empty"><div><strong>No rows</strong><p>Add a row to begin editing.</p></div></div>
        </td>
      </tr>
    `;
  }

  function emptySelect() {
    return `<div class="ec-software-empty"><div><strong>Select a table</strong><p>Choose a table to load rows and columns.</p></div></div>`;
  }

  function normalizeRows(tableData) {
    if (Array.isArray(tableData)) return tableData;
    if (Array.isArray(tableData.items)) return tableData.items;
    if (Array.isArray(tableData.rows)) return tableData.rows;
    if (tableData.data) return normalizeRows(tableData.data);
    return [];
  }

  function normalizeColumns(tableData, rows) {
    if (Array.isArray(tableData.columns) && tableData.columns.length) {
      return tableData.columns.map((col) => typeof col === "string" ? col : (col.name || col.key)).filter(Boolean);
    }

    const set = new Set();
    rows.forEach((row) => Object.keys(row || {}).forEach((key) => set.add(key)));
    const cols = Array.from(set);
    cols.sort((a, b) => {
      if (a === "id") return -1;
      if (b === "id") return 1;
      return a.localeCompare(b);
    });
    return cols;
  }

  function formatCell(value) {
    if (value === undefined || value === null) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }

  function jsonPreviewType(value) {
    const text = String(value || "").trim();
    if (text.startsWith("{")) return "object";
    if (text.startsWith("[")) return "array";
    return "";
  }

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
  }

  window.SoftwareDatabaseStructure = {
    render,
    normalizeRows,
    normalizeColumns,
    renderClearDatabaseModal,
    renderCellModal,
    jsonPreview,
    formatCell
  };
})();
