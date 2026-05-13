/* SOFTWARE WIFI / CONNECTION STRUCTURE v2 */
(function () {
  "use strict";

  function render(data = {}) {
    const access = data.access || {};
    if (!access.configuration && !access.connection && !access.rates) {
      return window.SoftwareStructure.lockedCard("Connection Locked", "Administrator");
    }

    const status = data.status || {};
    const networks = Array.isArray(data.networks) ? data.networks : [];
    const device = data.device || {};

    return `
      <div class="ec-software-module ec-software-wifi">
        <div class="ec-software-toolbar">
          <div>
            <strong>Connection Section</strong>
            <span>Wi-Fi connection, local access policy, and Raspberry Pi network-ready settings.</span>
          </div>
          <div class="ec-software-actions">
            <button class="ec-software-btn" type="button" data-wifi-status>Refresh Status</button>
            <button class="ec-software-btn ec-software-btn-primary" type="button" data-wifi-scan>Scan Wi-Fi</button>
          </div>
        </div>

        <div class="ec-wifi-compact-status">
          ${compactStat("SSID", status.ssid || status.wifi_ssid || device.wifi_ssid || "—")}
          ${compactStat("IP", status.ip || status.wifi_ip || device.wifi_ip || "—")}
          ${compactStat("Internet", status.internet_status || device.internet_status || "unknown")}
          ${compactStat("Mode", labelize(device.network_mode || status.network_mode || "local_only"))}
        </div>

        <div class="ec-software-grid-2">
          <section class="ec-software-card">
            <div class="ec-software-toolbar">
              <div>
                <strong>Wi-Fi Access</strong>
                <span>${escapeHtml(status.message || "Connect the Raspberry Pi or development machine to Wi-Fi.")}</span>
              </div>
              <span class="ec-software-pill">${escapeHtml(status.platform || "local")}</span>
            </div>

            <label class="ec-software-field">
              <span>SSID</span>
              <input type="text" data-wifi-ssid placeholder="Network name">
            </label>

            <label class="ec-software-field">
              <span>Password</span>
              <input type="password" data-wifi-password placeholder="Network password">
            </label>

            <div class="ec-software-actions">
              <button class="ec-software-btn ec-software-btn-primary" type="button" data-wifi-connect>Connect</button>
              <button class="ec-software-btn ec-software-btn-danger" type="button" data-wifi-forget>Forget</button>
            </div>

            <div class="ec-software-note">
              Windows development can detect and scan Wi-Fi. Connecting on Windows usually requires a saved Wi-Fi profile.
              Raspberry Pi/Linux uses nmcli when available.
            </div>
          </section>

          <section class="ec-software-card">
            <div class="ec-software-toolbar">
              <div>
                <strong>Detected Networks</strong>
                <span>Click a network to fill the SSID field.</span>
              </div>
              <span class="ec-software-pill">${networks.length} found</span>
            </div>

            <div class="ec-software-scroll ec-wifi-list">
              ${networks.length ? networks.map(networkRow).join("") : emptyNetworks()}
            </div>
          </section>
        </div>

        <section class="ec-software-card">
          <div class="ec-software-toolbar">
            <div>
              <strong>Local Access Policy</strong>
              <span>These values are saved to the settings table and later used by the Raspberry Pi network/payment bridge setup.</span>
            </div>
            <button class="ec-software-btn ec-software-btn-primary" type="button" data-wifi-save-hotspot>Save Connection Settings</button>
          </div>

          <div class="ec-software-grid">
            <label class="ec-software-field">
              <span>Hotspot Name</span>
              <input type="text" data-wifi-hotspot-name value="${escapeAttr(device.hotspot_name || "ElectriCredit")}">
            </label>

            <label class="ec-software-field">
              <span>Hotspot Password</span>
              <input type="password" data-wifi-hotspot-password value="${escapeAttr(device.hotspot_password || "")}" placeholder="Optional local hotspot password">
            </label>

            <label class="ec-software-field">
              <span>Local Server URL</span>
              <input type="text" data-wifi-local-url value="${escapeAttr(device.local_server_url || "http://192.168.4.1:5000")}" placeholder="http://192.168.4.1:5000">
            </label>

            <label class="ec-software-field">
              <span>Payment Bridge URL</span>
              <input type="text" data-wifi-payment-url value="${escapeAttr(device.payment_bridge_url || "")}" placeholder="http://192.168.4.1:7000 or bridge URL">
            </label>
          </div>

          <div class="ec-wifi-mode-grid">
            ${modeCard("local_only", "Local", "Offline local mode. UI, hubs, registry, and SQLite work inside the ElectriCredit network.", device.network_mode || "local_only")}
            ${modeCard("payment_only", "Payment", "Payment bridge access is allowed, but general internet access is still restricted/unavailable.", device.network_mode || "local_only")}
            ${modeCard("live_online", "Live", "Online mode. The Raspberry Pi can reach outside services such as payment, email, SMS, or cloud APIs.", device.network_mode || "local_only")}
          </div>
        </section>
      </div>
    `;
  }

  function networkRow(item = {}) {
    const ssid = item.ssid || item.name || "Hidden Network";
    const signal = item.signal ?? item.strength ?? "—";
    const security = item.security || item.auth || item.authentication || "unknown";

    return `
      <button type="button" class="ec-wifi-network" data-wifi-network="${escapeAttr(ssid)}">
        <strong>${escapeHtml(ssid)}</strong>
        <span>${escapeHtml(security)} • Signal ${escapeHtml(signal)}</span>
      </button>
    `;
  }

  function compactStat(label, value) {
    return `
      <article class="ec-wifi-compact-item">
        <span>${escapeHtml(label)}</span>
        <strong title="${escapeAttr(value)}">${escapeHtml(value)}</strong>
      </article>
    `;
  }

  function modeCard(value, title, description, selected) {
    return `
      <label class="ec-wifi-mode ${String(value) === String(selected) ? "is-active" : ""}">
        <input type="radio" name="ec_wifi_mode" value="${escapeAttr(value)}" data-wifi-network-mode ${String(value) === String(selected) ? "checked" : ""}>
        <span>
          <strong>${escapeHtml(title)}</strong>
          <small>${escapeHtml(description)}</small>
        </span>
      </label>
    `;
  }

  function emptyNetworks() {
    return `<div class="ec-software-empty"><div><strong>No networks loaded</strong><p>Click Scan Wi-Fi to list available networks.</p></div></div>`;
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

  window.SoftwareWifiStructure = { render };
})();
