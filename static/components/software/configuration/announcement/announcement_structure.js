/* SOFTWARE ANNOUNCEMENT STRUCTURE v2 */
(function () {
  "use strict";

  function render(data = {}) {
    const access = data.access || {};
    if (!access.announcement) return window.SoftwareStructure.lockedCard("Announcement Locked", "Administrator");

    return `
      <div class="ec-software-module ec-software-announcement">
        <div class="ec-software-toolbar">
          <div>
            <strong>Announcement Section</strong>
            <span>Send HTML email or SMS to members/custom receivers.</span>
          </div>
          <div class="ec-software-actions">
            <button class="ec-software-btn" type="button" data-ann-sample>Email Sample</button>
            <button class="ec-software-btn" type="button" data-ann-refresh-recipients>Load Members</button>
          </div>
        </div>

        <div class="ec-ann-grid" data-ann-grid>
          ${emailPanel(data)}
          ${smsPanel(data)}
          ${previewPanel()}
        </div>
      </div>
    `;
  }

  function emailPanel() {
    return `
      <section class="ec-software-card ec-ann-panel" data-ann-email-panel>
        <div class="ec-software-toolbar">
          <div>
            <strong>Email</strong>
            <span>HTML email body is supported.</span>
          </div>
          <label class="ec-software-switch">
            <input type="checkbox" data-email-member-mode checked>
            <span>Members</span>
          </label>
        </div>

        <label class="ec-software-field">
          <span>Receiver</span>
          <input type="text" data-email-custom-receivers placeholder="email@example.com, another@email.com" hidden>
          <button class="ec-software-btn" type="button" data-email-member-picker>Select member emails</button>
        </label>

        <label class="ec-software-field">
          <span>Title</span>
          <input type="text" data-email-title placeholder="ElectriCredit announcement">
        </label>

        <label class="ec-software-field">
          <span>Email HTML</span>
          <textarea data-email-body placeholder="<h2>Hello!</h2><p>Your announcement here...</p>"></textarea>
        </label>

        <div class="ec-software-actions">
          <button class="ec-software-btn" type="button" data-email-clear>Clear</button>
          <button class="ec-software-btn" type="button" data-email-copy>Copy</button>
          <button class="ec-software-btn ec-software-btn-primary" type="button" data-email-send>Send</button>
        </div>
      </section>
    `;
  }

  function smsPanel() {
    return `
      <section class="ec-software-card ec-ann-panel" data-ann-sms-panel>
        <div class="ec-software-toolbar">
          <div>
            <strong>SMS</strong>
            <span>Short plain text announcements.</span>
          </div>
          <label class="ec-software-switch">
            <input type="checkbox" data-sms-member-mode checked>
            <span>Members</span>
          </label>
        </div>

        <label class="ec-software-field">
          <span>Receiver</span>
          <input type="text" data-sms-custom-receivers placeholder="09123456789, 09998887777" hidden>
          <button class="ec-software-btn" type="button" data-sms-member-picker>Select member numbers</button>
        </label>

        <label class="ec-software-field">
          <span>Title</span>
          <input type="text" data-sms-title placeholder="ElectriCredit SMS">
        </label>

        <label class="ec-software-field">
          <span>SMS Message</span>
          <textarea data-sms-body placeholder="Your SMS announcement here..."></textarea>
        </label>

        <div class="ec-software-actions">
          <button class="ec-software-btn" type="button" data-sms-clear>Clear</button>
          <button class="ec-software-btn" type="button" data-sms-copy>Copy</button>
          <button class="ec-software-btn ec-software-btn-primary" type="button" data-sms-send>Send</button>
        </div>
      </section>
    `;
  }

  function previewPanel() {
    return `
      <section class="ec-software-card ec-ann-preview-panel" data-ann-preview-panel hidden>
        <div class="ec-software-toolbar">
          <div>
            <strong>Email Live Preview</strong>
            <span>Preview updates while writing HTML email.</span>
          </div>
          <span class="ec-software-pill">preview</span>
        </div>

        <div class="ec-ann-email-shell">
          <div class="ec-ann-email-subject" data-email-preview-title>ElectriCredit announcement</div>
          <iframe class="ec-ann-email-preview" data-email-preview sandbox="allow-same-origin"></iframe>
        </div>
      </section>
    `;
  }

  function sampleEmailHtml() {
    return `<div style="font-family:Arial,sans-serif;background:#020617;padding:24px;color:#f8fafc;">
  <div style="max-width:620px;margin:auto;background:rgba(15,23,42,.96);border:1px solid rgba(56,189,248,.35);border-radius:20px;padding:24px;">
    <h1 style="margin:0;color:#38bdf8;">ElectriCredit Announcement</h1>
    <p style="line-height:1.7;color:#cbd5e1;">Hello, this is an official update from the ElectriCredit local-first prepaid electricity system.</p>
    <div style="background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.28);border-radius:14px;padding:14px;margin:18px 0;">
      <strong style="color:#f8fafc;">Reminder:</strong>
      <span style="color:#cbd5e1;">Please monitor your card balance and power usage regularly.</span>
    </div>
    <a href="#" style="display:inline-block;background:#38bdf8;color:#020617;text-decoration:none;font-weight:bold;border-radius:999px;padding:12px 18px;">Open Dashboard</a>
    <p style="font-size:12px;color:#94a3b8;margin-top:22px;">ElectriCredit v2 • Local-first server notice</p>
  </div>
</div>`;
  }

  function recipientModal(data = {}, type = "email", selected = []) {
    const groups = [
      { id: "users", label: "Users", items: data.users || [] },
      { id: "operators", label: "Operators", items: data.operators || [] },
      { id: "developers", label: "Developers", items: data.developers || [] }
    ];

    return `
      <div class="ec-software-modal-body" data-recipient-modal="${escapeAttr(type)}">
        <label class="ec-software-switch">
          <input type="checkbox" data-recipient-all>
          <span>Select ALL categories</span>
        </label>

        ${groups.map((group) => recipientGroup(group, type, selected)).join("")}
      </div>
    `;
  }

  function recipientGroup(group, type, selected) {
    const items = group.items || [];

    return `
      <section class="ec-software-recipient-card" data-recipient-group="${escapeAttr(group.id)}">
        <div class="ec-software-recipient-head">
          <strong>${escapeHtml(group.label)}</strong>
          <label class="ec-software-switch">
            <input type="checkbox" data-recipient-group-all>
            <span>All</span>
          </label>
        </div>

        <div class="ec-software-check-list">
          ${items.length ? items.map((item) => recipientItem(item, type, selected)).join("") : `<div class="ec-software-note">No ${escapeHtml(type)} receivers recorded.</div>`}
        </div>
      </section>
    `;
  }

  function recipientItem(item, type, selected) {
    const values = type === "sms" ? (item.numbers || []) : (item.emails || []);
    if (!values.length) return "";

    return values.map((value) => {
      const checked = selected.includes(value);
      return `
        <label class="ec-software-check-item">
          <input type="checkbox" value="${escapeAttr(value)}" data-recipient-check ${checked ? "checked" : ""}>
          <span>
            <strong>${escapeHtml(item.name || item.username || "Member")}</strong>
            <span>${escapeHtml(item.type || "")} [${escapeHtml(item.id || "")}] • ${escapeHtml(value)}</span>
          </span>
        </label>
      `;
    }).join("");
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

  window.SoftwareAnnouncementStructure = { render, recipientModal, sampleEmailHtml };
})();
