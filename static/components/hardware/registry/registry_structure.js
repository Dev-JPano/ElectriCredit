/* =========================================================
   ELECTRICREDIT V2 - HARDWARE REGISTRY STRUCTURE
   File: static/components/hardware/registry/registry_structure.js
   ========================================================= */

(function () {
  "use strict";

  function render(data = {}) {
    const items = normalizeItems(data.items || []);
    const stats = normalizeStats(items);
    const access = data.access || {};

    return `
      <div class="ec-registry-hardware">
        <div class="ec-hardware-toolbar">
          <div>
            <strong>ESP32 Registry Stations</strong>
            <span>RFID card registration, scan request handling, and coin-slot top-up.</span>
          </div>
          <div class="ec-hardware-actions">
            <button class="ec-hardware-btn" type="button" data-registry-refresh>Refresh</button>
            <button class="ec-hardware-btn ec-hardware-btn-primary" type="button" data-registry-add ${access.canRegister ? "" : "disabled"} title="${access.canRegister ? "Register Registry" : "Developer only"}">Add Registry</button>
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
          ${metric("Registry Stations", stats.total)}
          ${metric("Online", stats.online)}
          ${metric("Available", stats.available)}
          ${metric("Disabled", stats.disabled)}
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
            <strong>${escapeHtml(formatLabel("REGISTRY", item.id))}</strong>
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
          ${detail("Purpose", "RFID + Coin Slot")}
        </div>

        <div class="ec-hardware-device-actions">
          <button class="ec-hardware-btn" type="button" data-registry-details="${escapeHtml(item.id)}">Details</button>
          <button class="ec-hardware-btn" type="button" data-registry-ping="${escapeHtml(item.id)}" ${access.canPing ? "" : "disabled"}>Ping</button>
          <button class="ec-hardware-btn" type="button" data-registry-edit="${escapeHtml(item.id)}" ${access.canEdit ? "" : "disabled"}>Edit</button>
          ${
            isEnabled
              ? `<button class="ec-hardware-btn ec-hardware-btn-warning" type="button" data-registry-disable="${escapeHtml(item.id)}" ${access.canManage ? "" : "disabled"}>Disable</button>`
              : `<button class="ec-hardware-btn ec-hardware-btn-primary" type="button" data-registry-enable="${escapeHtml(item.id)}" ${access.canManage ? "" : "disabled"}>Enable</button>`
          }
          <button class="ec-hardware-btn ec-hardware-btn-danger" type="button" data-registry-delete="${escapeHtml(item.id)}" ${access.canDelete ? "" : "disabled"}>Delete</button>
        </div>
      </article>
    `;
  }

  function renderEmpty() {
    return `
      <div class="ec-hardware-empty">
        <div>
          <strong>No registry stations yet</strong>
          <p>Registered ESP32 Registry Stations will appear here after they connect to the Raspberry Pi server.</p>
        </div>
      </div>
    `;
  }

  function normalizeItems(raw) {
    const list = Array.isArray(raw) ? raw : unwrapArray(raw);

    return list.map((item, index) => {
      const statusObject = parseStatus(item.status);

      return {
        id: pick(item.id, item.registry_id, item.registry_station_id, index + 1),
        mac: pick(item.mac, item.mac_address, ""),
        location: pick(item.location, item.room, item.name, ""),
        created: pick(item.created, item.created_at, ""),
        statusObject
      };
    });
  }

  function unwrapArray(value) {
    if (!value || typeof value !== "object") return [];
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.registry)) return value.registry;
    if (Array.isArray(value.registry_stations)) return value.registry_stations;
    if (value.data) return unwrapArray(value.data);
    return [];
  }

  function normalizeStats(items) {
    return {
      total: items.length,
      online: items.filter((item) => item.statusObject.connection === "online").length,
      available: items.filter((item) => item.statusObject.available === true).length,
      disabled: items.filter((item) => item.statusObject.status !== "enabled").length
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

  window.HardwareRegistryStructure = {
    render,
    normalizeItems,
    normalizeStats
  };
})();
