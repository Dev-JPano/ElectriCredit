/* =========================================================
   ELECTRICREDIT V2 - HARDWARE HUB STRUCTURE
   File: static/components/hardware/hub/hub_structure.js
   ========================================================= */

(function () {
  "use strict";

  function render(data = {}) {
    const items = normalizeItems(data.items || []);
    const stats = normalizeStats(items);
    const access = data.access || {};

    return `
      <div class="ec-hub-hardware">
        <div class="ec-hardware-toolbar">
          <div>
            <strong>ESP32 Hub Modules</strong>
            <span>RFID access, relay control, PZEM monitoring, and session reporting.</span>
          </div>
          <div class="ec-hardware-actions">
            <button class="ec-hardware-btn" type="button" data-hub-refresh>Refresh</button>
            <button class="ec-hardware-btn ec-hardware-btn-primary" type="button" data-hub-add ${access.canRegister ? "" : "disabled"} title="${access.canRegister ? "Register Hub" : "Developer only"}">Add Hub</button>
          </div>
        </div>

        <div class="ec-hardware-scroll">
          ${
            items.length
              ? `<div class="ec-hardware-device-grid">${items.map((item) => renderCard(item, access)).join("")}</div>`
              : renderEmpty()
          }
        </div>

        <div class="ec-hardware-metrics">
          ${metric("Hub Modules", stats.total)}
          ${metric("Online", stats.online)}
          ${metric("Total kWh", formatNumber(stats.kwh, 2))}
          ${metric("Revenue", formatPeso(stats.revenue))}
        </div>
      </div>
    `;
  }

  function renderCard(item, access = {}) {
    const status = item.statusObject;
    const connection = String(status.connection || "offline").toLowerCase();
    const enabled = String(status.status || "disabled").toLowerCase();
    const available = Boolean(status.available);

    const isEnabled = enabled === "enabled";
    const isOnline = connection === "online";

    return `
      <article class="ec-hardware-device" style="--device-accent:${isOnline ? "var(--ec-success)" : "var(--ec-warning)"}">
        <header class="ec-hardware-device-head">
          <div class="ec-hardware-device-title">
            <strong>${escapeHtml(formatLabel("HUB", item.id))}</strong>
            <span>${escapeHtml(item.location || "Unassigned location")}</span>
          </div>
          ${chip(connection, isOnline ? "online" : "offline")}
        </header>

        <div class="ec-hardware-chip-row">
          ${chip(isEnabled ? "enabled" : "disabled", isEnabled ? "enabled" : "disabled")}
          ${chip(available ? "available" : "busy", available ? "available" : "busy")}
        </div>

        <div class="ec-hardware-detail-grid">
          ${detail("MAC Address", item.mac || "Unknown")}
          ${detail("Created", formatDate(item.created))}
          ${detail("Consumed kWh", formatNumber(item.consumed_kwh, 2))}
          ${detail("Revenue", formatPeso(item.revenue))}
        </div>

        <div class="ec-hardware-device-actions">
          <button class="ec-hardware-btn" type="button" data-hub-details="${escapeHtml(item.id)}">Details</button>
          <button class="ec-hardware-btn" type="button" data-hub-ping="${escapeHtml(item.id)}" ${access.canPing ? "" : "disabled"}>Ping</button>
          <button class="ec-hardware-btn" type="button" data-hub-edit="${escapeHtml(item.id)}" ${access.canEdit ? "" : "disabled"}>Edit</button>
          ${
            isEnabled
              ? `<button class="ec-hardware-btn ec-hardware-btn-warning" type="button" data-hub-disable="${escapeHtml(item.id)}" ${access.canManage ? "" : "disabled"}>Disable</button>`
              : `<button class="ec-hardware-btn ec-hardware-btn-primary" type="button" data-hub-enable="${escapeHtml(item.id)}" ${access.canManage ? "" : "disabled"}>Enable</button>`
          }
          <button class="ec-hardware-btn ec-hardware-btn-danger" type="button" data-hub-delete="${escapeHtml(item.id)}" ${access.canDelete ? "" : "disabled"}>Delete</button>
        </div>
      </article>
    `;
  }

  function renderEmpty() {
    return `
      <div class="ec-hardware-empty">
        <div>
          <strong>No hub modules yet</strong>
          <p>Registered ESP32 Hub Modules will appear here after they connect to the Raspberry Pi server.</p>
        </div>
      </div>
    `;
  }

  function normalizeItems(raw) {
    const list = Array.isArray(raw) ? raw : unwrapArray(raw);

    return list.map((item, index) => {
      const statusObject = parseStatus(item.status);

      return {
        id: pick(item.id, item.hub_id, index + 1),
        mac: pick(item.mac, item.mac_address, ""),
        location: pick(item.location, item.room, item.name, ""),
        revenue: Number(pick(item.revenue, item.total_revenue, 0)) || 0,
        consumed_kwh: Number(pick(item.consumed_kwh, item.kwh, item.used_kwh, 0)) || 0,
        created: pick(item.created, item.created_at, ""),
        statusObject
      };
    });
  }

  function unwrapArray(value) {
    if (!value || typeof value !== "object") return [];
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.hubs)) return value.hubs;
    if (value.data) return unwrapArray(value.data);
    return [];
  }

  function normalizeStats(items) {
    return {
      total: items.length,
      online: items.filter((item) => item.statusObject.connection === "online").length,
      kwh: items.reduce((sum, item) => sum + Number(item.consumed_kwh || 0), 0),
      revenue: items.reduce((sum, item) => sum + Number(item.revenue || 0), 0)
    };
  }

  function parseStatus(value) {
    const fallback = {
      available: false,
      status: "enabled",
      connection: "offline"
    };

    if (!value) return fallback;

    if (typeof value === "object") {
      return {
        available: value.available === true,
        status: value.status || fallback.status,
        connection: value.connection || fallback.connection
      };
    }

    try {
      const parsed = JSON.parse(value);
      return {
        available: parsed.available === true,
        status: parsed.status || fallback.status,
        connection: parsed.connection || fallback.connection
      };
    } catch (_) {
      return {
        ...fallback,
        status: String(value || fallback.status)
      };
    }
  }

  function metric(label, value) {
    return window.HardwareStructure?.metric?.(label, value) || `<article class="ec-hardware-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
  }

  function detail(label, value) {
    return window.HardwareStructure?.detail?.(label, value) || `<div class="ec-hardware-detail"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  }

  function chip(label, state) {
    return `<span class="ec-hardware-chip ec-chip-${escapeHtml(state)}">${escapeHtml(label)}</span>`;
  }

  function formatLabel(type, id) { return window.HardwareStructure?.formatLabel?.(type, id) || `${String(type).toUpperCase()}[${id || 0}]`; }
  function formatNumber(value, decimals = 0) { return window.HardwareStructure?.formatNumber?.(value, decimals) || Number(value || 0).toFixed(decimals); }
  function formatPeso(value) { return window.HardwareStructure?.formatPeso?.(value) || `₱${formatNumber(value, 2)}`; }
  function formatDate(value) { return window.HardwareStructure?.formatDate?.(value) || String(value || "Not recorded"); }

  function pick(...values) {
    for (const value of values) {
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

  window.HardwareHubStructure = {
    render,
    normalizeItems,
    normalizeStats
  };
})();
