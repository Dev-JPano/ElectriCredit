/* =========================================================
   ELECTRICREDIT V2 - HARDWARE STRUCTURE
   File: static/components/hardware/hardware_structure.js
   Purpose: Hardware shell and shared templates
   ========================================================= */

(function () {
  "use strict";

  const TABS = [
    {
      id: "hub",
      label: "Hubs",
      icon: "⚡",
      title: "Hub Modules",
      subtitle: "Power monitoring, RFID validation, relay control, and session reporting."
    },
    {
      id: "registry",
      label: "Registry",
      icon: "▣",
      title: "Registry Stations",
      subtitle: "RFID card registration, card scanning, and coin-slot top-up support."
    }
  ];

  function render(data = {}) {
    const summary = normalizeSummary(data);

    return `
      <div id="hardware" class="ec-hardware" data-hardware-section>
        <div class="ec-hardware-shell">
          <header class="ec-hardware-head">
            <div>
              <span class="ec-hardware-kicker">Hardware</span>
              <h2>Device Control</h2>
              <p>
                Monitor ESP32 Hub Modules and Registry Stations connected to the Raspberry Pi server.
                Public users can view device state. Protected actions are based on Administrator, Owner, and Developer roles.
              </p>
            </div>

            <div class="ec-hardware-status" aria-label="Hardware live summary">
              ${renderStatus("Hub Modules", summary.hubs)}
              ${renderStatus("Registry", summary.registryStations)}
              ${renderStatus("Online", summary.online)}
              ${renderStatus("Available", summary.available)}
            </div>
          </header>

          <section class="ec-hardware-console" aria-label="Hardware monitor">
            <div class="ec-hardware-console-top">
              <div class="ec-hardware-console-title">
                <strong data-hardware-title>${escapeHtml(TABS[0].title)}</strong>
                <span data-hardware-subtitle>${escapeHtml(TABS[0].subtitle)}</span>
              </div>

              <nav class="ec-hardware-tabs" aria-label="Hardware tabs" data-hardware-tabs>
                ${TABS.map((tab, index) => renderTab(tab, index === 0)).join("")}
              </nav>
            </div>

            <section class="ec-hardware-panel is-active" data-hardware-panel="hub">
              <div data-hardware-mount="hub" class="ec-hardware-loading">Loading hub modules...</div>
            </section>

            <section class="ec-hardware-panel" data-hardware-panel="registry" hidden>
              <div data-hardware-mount="registry" class="ec-hardware-loading">Loading registry stations...</div>
            </section>
          </section>
        </div>
      </div>
    `;
  }

  function renderTab(tab, active) {
    return `
      <button
        type="button"
        class="ec-hardware-tab ${active ? "is-active" : ""}"
        data-hardware-tab="${escapeHtml(tab.id)}"
        aria-selected="${active ? "true" : "false"}"
      >
        <span class="ec-hardware-tab-icon" aria-hidden="true">${escapeHtml(tab.icon)}</span>
        <span>${escapeHtml(tab.label)}</span>
      </button>
    `;
  }

  function renderStatus(label, value) {
    return `
      <article class="ec-hardware-stat">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(formatValue(value))}</strong>
      </article>
    `;
  }

  function metric(label, value) {
    return `
      <article class="ec-hardware-metric">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(formatValue(value))}</strong>
      </article>
    `;
  }

  function detail(label, value) {
    return `
      <div class="ec-hardware-detail">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(formatValue(value))}</strong>
      </div>
    `;
  }

  function renderDeviceModalDetails(item = {}, type = "HUB") {
    const status = item.statusObject || item.status || {};
    const isHub = String(type).toUpperCase() === "HUB";

    return `
      <div class="ec-hardware-modal-grid">
        <div class="ec-hardware-modal-note">
          <strong>${escapeHtml(formatLabel(type, item.id))}</strong>
          <br>
          ${escapeHtml(item.location || "Unassigned location")}
        </div>

        <div class="ec-hardware-modal-details">
          ${detail("Location", item.location || "Unassigned")}
          ${detail("MAC Address", item.mac || "Unknown")}
          ${isHub ? detail("Consumed kWh", formatNumber(item.consumed_kwh, 2)) : detail("Purpose", "RFID + Coin Slot")}
          ${isHub ? detail("Revenue", formatPeso(item.revenue)) : detail("Registration", "MAC-based device identity")}
          ${detail("Connection", status.connection || "offline")}
          ${detail("Status", status.status || "disabled")}
          ${detail("Availability", status.available ? "available" : "busy")}
          ${detail("Created", formatDate(item.created))}
        </div>
      </div>
    `;
  }

  function renderEditForm(item = {}, type = "hub") {
    return `
      <form class="ec-hardware-form" data-hardware-edit-form data-type="${escapeHtml(type)}" data-id="${escapeHtml(item.id)}">
        <div class="ec-hardware-form-grid">
          <label class="ec-hardware-form-field">
            <span>Hardware ID</span>
            <input type="text" value="${escapeAttr(formatLabel(type, item.id))}" readonly disabled>
          </label>

          <label class="ec-hardware-form-field">
            <span>Location</span>
            <input type="text" name="location" value="${escapeAttr(item.location || "")}" placeholder="e.g. Demo Room A" required>
          </label>

          <label class="ec-hardware-form-field">
            <span>MAC Address</span>
            <input type="text" name="mac" value="${escapeAttr(item.mac || "")}" placeholder="AA:BB:CC:00:00:01" required>
          </label>
        </div>

        <div class="ec-hardware-modal-note">
          ID is generated by the database and cannot be edited. IP Address is not used as a permanent identity because it only exists while the ESP32 is connected. Usage values such as kWh and revenue are updated by device sessions, not by manual registration.
        </div>
      </form>
    `;
  }

  function renderRegisterForm(type = "hub", nextId = "") {
    const isHub = type === "hub";
    const label = isHub ? "Hub Module" : "Registry Station";
    const previewId = nextId ? formatLabel(isHub ? "HUB" : "REGISTRY", nextId) : "Auto-generated after save";

    return `
      <form class="ec-hardware-form" data-hardware-register-form data-type="${escapeHtml(type)}">
        <div class="ec-hardware-form-grid">
          <label class="ec-hardware-form-field">
            <span>Hardware ID</span>
            <input type="text" value="${escapeAttr(previewId)}" readonly disabled>
          </label>

          <label class="ec-hardware-form-field">
            <span>${escapeHtml(label)} Location</span>
            <input type="text" name="location" placeholder="${isHub ? "e.g. Demo Room A" : "e.g. Front Desk"}" required>
          </label>

          <label class="ec-hardware-form-field">
            <span>MAC Address</span>
            <input type="text" name="mac" placeholder="AA:BB:CC:00:00:01" required>
          </label>
        </div>

        <div class="ec-hardware-modal-note">
          Only logged Developer accounts can register hardware. The database generates the ID automatically. MAC Address is the permanent module identity. IP Address is temporary and will be handled later by module.py during live ESP32 communication.
        </div>
      </form>
    `;
  }

  function normalizeSummary(input = {}) {
    const source = unwrapData(input);
    const hub = source.hubs || {};
    const registry = source.registry_stations || source.registryStations || source.registry || {};

    const hubs = pickNumber(hub.total, source.hubs, source.hub_modules, source.total_hubs, source.hub_count);
    const registryStations = pickNumber(registry.total, source.registry_stations, source.registries, source.registry_count);
    const online = pickNumber(source.online, source.online_devices, hub.online) + pickNumber(registry.online);
    const available = pickNumber(source.available, source.available_devices, hub.available) + pickNumber(registry.available);

    return { hubs, registryStations, online, available };
  }

  function unwrapData(value) {
    let current = value;
    for (let i = 0; i < 4; i += 1) {
      if (current && typeof current === "object" && !Array.isArray(current) && "data" in current) {
        current = current.data;
      } else {
        break;
      }
    }
    return current && typeof current === "object" ? current : {};
  }

  function pickNumber(...values) {
    for (const value of values) {
      const number = extractNumber(value);
      if (number !== null) return number;
    }
    return 0;
  }

  function extractNumber(value) {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    }
    if (Array.isArray(value)) return value.length;
    if (typeof value === "object") {
      for (const key of ["total", "count", "value", "items"]) {
        if (key in value) {
          const extracted = extractNumber(value[key]);
          if (extracted !== null) return extracted;
        }
      }
    }
    return null;
  }

  function formatLabel(type, id) {
    return `${String(type || "ITEM").toUpperCase()}[${id || 0}]`;
  }

  function formatNumber(value, decimals = 0) {
    return Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function formatPeso(value) {
    return `₱${formatNumber(value, 2)}`;
  }

  function formatDate(value) {
    if (!value) return "Not recorded";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function formatValue(value) {
    if (value === undefined || value === null || value === "") return "0";
    if (typeof value === "object") {
      const number = extractNumber(value);
      return number !== null ? String(number) : "0";
    }
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

  window.HardwareStructure = {
    tabs: TABS,
    render,
    metric,
    detail,
    renderDeviceModalDetails,
    renderEditForm,
    renderRegisterForm,
    normalizeSummary,
    formatLabel,
    formatNumber,
    formatPeso,
    formatDate,
    escapeHtml,
    escapeAttr
  };
})();
