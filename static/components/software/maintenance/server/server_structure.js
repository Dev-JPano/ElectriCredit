/* SOFTWARE SERVER MAINTENANCE STRUCTURE v2 */
(function () {
  "use strict";

  function render(data = {}) {
    const access = data.access || {};
    if (!access.maintenance && !access.device) return window.SoftwareStructure.lockedCard("Server Maintenance Locked", "Developer");

    const device = data.device || {};

    return `
      <div class="ec-software-module ec-software-server">
        <div class="ec-software-toolbar">
          <div>
            <strong>Server Section</strong>
            <span>Developer-only device identity, payment bridge credentials, and global balance tools.</span>
          </div>
          <div class="ec-software-actions">
            <button class="ec-software-btn" type="button" data-server-refresh>Refresh</button>
          </div>
        </div>

        <div class="ec-software-grid-2">
          <section class="ec-software-card">
            <div class="ec-software-toolbar">
              <div>
                <strong>Device / Bridge Identity</strong>
                <span>Changing these requires confirmation on backend.</span>
              </div>
              <button class="ec-software-btn ec-software-btn-primary" type="button" data-server-device-save>Update Identity</button>
            </div>

            ${field("Device ID", "device_id", device.device_id || "ELECTRICREDIT-LOCAL-001")}
            ${field("Bridge ID", "bridge_id", device.bridge_id || device.payment_bridge_id || "")}
            ${field("Payment Bridge Owner ID", "payment_bridge_owner_id", device.payment_bridge_owner_id || "")}
            ${field("Payment Bridge System ID", "payment_bridge_system_id", device.payment_bridge_system_id || "")}

            <div class="ec-software-note">
              These are settings records used to identify this ElectriCredit server when connecting to your future payment bridge gateway.
            </div>
          </section>

          <section class="ec-software-card">
            <div class="ec-software-toolbar">
              <div>
                <strong>Payment Bridge API</strong>
                <span>Prepare API connection details for the payment gateway/bridge you will build soon.</span>
              </div>
              <button class="ec-software-btn ec-software-btn-primary" type="button" data-server-device-save>Update API</button>
            </div>

            ${field("Payment Bridge URL", "payment_bridge_url", device.payment_bridge_url || "")}
            ${field("Payment API Key", "payment_bridge_api_key", device.payment_bridge_api_key || "", "password")}
            ${field("Payment API Secret", "payment_bridge_secret", device.payment_bridge_secret || "", "password")}
            ${select("Payment Bridge Mode", "payment_bridge_mode", device.payment_bridge_mode || "disabled", ["disabled", "sandbox", "production"])}
            ${select("Payment Bridge Status", "payment_bridge_status", device.payment_bridge_status || "not_configured", ["not_configured", "testing", "connected", "disabled"])}

            <div class="ec-software-note">
              Sensitive values may be masked by the backend. Re-enter a key/secret only when changing it.
            </div>
          </section>
        </div>

        <section class="ec-software-card">
          <div class="ec-software-toolbar">
            <div>
              <strong>Set All Balance</strong>
              <span>Sets every card balance to one fixed amount. Developer only.</span>
            </div>
            <button class="ec-software-btn ec-software-btn-danger" type="button" data-server-set-balance>Set All</button>
          </div>

          <label class="ec-software-field">
            <span>New Balance</span>
            <input type="number" step="0.01" data-server-balance-amount placeholder="Example: 100">
          </label>

          <div class="ec-software-note">
            This ignores previous balances and overwrites all card balances. Use for reset/testing only.
          </div>
        </section>
      </div>
    `;
  }

  function field(label, name, value, type = "text") {
    return `
      <label class="ec-software-field">
        <span>${escapeHtml(label)}</span>
        <input type="${escapeAttr(type)}" data-server-field="${escapeAttr(name)}" value="${escapeAttr(value)}">
      </label>
    `;
  }

  function select(label, name, value, options) {
    return `
      <label class="ec-software-field">
        <span>${escapeHtml(label)}</span>
        <select data-server-field="${escapeAttr(name)}">
          ${options.map((option) => `<option value="${escapeAttr(option)}" ${String(option) === String(value) ? "selected" : ""}>${escapeHtml(labelize(option))}</option>`).join("")}
        </select>
      </label>
    `;
  }

  function labelize(value) {
    return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (x) => x.toUpperCase());
  }

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
  }

  window.SoftwareServerStructure = { render };
})();
