/* SOFTWARE BONUS STRUCTURE v1 */
(function () {
  "use strict";

  function render(data = {}) {
    const access = data.access || {};
    if (!access.bonus) return window.SoftwareStructure.lockedCard("Bonus Locked", "Owner");

    const users = Array.isArray(data.users) ? data.users : [];

    return `
      <div class="ec-software-module ec-software-bonus">
        <div class="ec-software-toolbar">
          <div>
            <strong>Bonus / Punishment Section</strong>
            <span>Apply positive or negative balance changes to selected cards.</span>
          </div>
          <div class="ec-software-actions">
            <button class="ec-software-btn" type="button" data-bonus-refresh>Refresh Cards</button>
          </div>
        </div>

        <div class="ec-software-grid-2">
          <section class="ec-software-card">
            <div class="ec-software-toolbar">
              <div>
                <strong>Card Selector</strong>
                <span>Select users and card records.</span>
              </div>
              <label class="ec-software-switch">
                <input type="checkbox" data-bonus-select-all>
                <span>ALL</span>
              </label>
            </div>

            <div class="ec-software-scroll" data-bonus-card-list>
              ${users.length ? users.map(userGroup).join("") : emptyUsers()}
            </div>
          </section>

          <section class="ec-software-card">
            <label class="ec-software-field">
              <span>Balance Amount</span>
              <input type="number" step="0.01" data-bonus-amount placeholder="Example: 20 or -50">
            </label>

            <div class="ec-software-note">
              Positive amount adds balance. Negative amount deducts balance. Sending requires a 16-character confirmation code.
            </div>

            <div class="ec-software-card">
              <div class="ec-software-toolbar">
                <div>
                  <strong>Notify</strong>
                  <span data-bonus-notify-preview>No notification message set.</span>
                </div>
                <label class="ec-software-switch">
                  <input type="checkbox" data-bonus-notify disabled>
                  <span>Enabled</span>
                </label>
              </div>

              <div class="ec-software-actions">
                <label class="ec-software-switch">
                  <input type="checkbox" data-bonus-notify-email>
                  <span>Email</span>
                </label>
                <label class="ec-software-switch">
                  <input type="checkbox" data-bonus-notify-sms>
                  <span>SMS</span>
                </label>
              </div>

              <button class="ec-software-btn" type="button" data-bonus-notify-modal>Write Notify Message</button>
            </div>

            <div class="ec-software-actions">
              <button class="ec-software-btn" type="button" data-bonus-clear>Clear</button>
              <button class="ec-software-btn" type="button" data-bonus-copy>Copy</button>
              <button class="ec-software-btn ec-software-btn-primary" type="button" data-bonus-send disabled>Send</button>
            </div>

            <div class="ec-software-toast-stream" data-bonus-stream></div>
          </section>
        </div>
      </div>
    `;
  }

  function userGroup(user = {}) {
    const cards = Array.isArray(user.cards) ? user.cards : [];
    return `
      <section class="ec-software-user-group" data-bonus-user="${escapeAttr(user.id || "")}">
        <div class="ec-software-user-head">
          <strong>${escapeHtml(user.name || "User")} <span class="ec-software-pill">USER[${escapeHtml(user.id || "")}]</span></strong>
          <label class="ec-software-switch">
            <input type="checkbox" data-bonus-user-all>
            <span>All</span>
          </label>
        </div>

        <div class="ec-software-check-list">
          ${cards.length ? cards.map((card) => cardItem(user, card)).join("") : `<div class="ec-software-note">No cards linked.</div>`}
        </div>
      </section>
    `;
  }

  function cardItem(user, card = {}) {
    const id = pick(card.id, card.card_id, "");
    const uid = pick(card.uid, card.rfid_uid, card.card_uid, "No UID");
    const balance = Number(card.balance || 0);

    return `
      <label class="ec-software-check-item">
        <input
          type="checkbox"
          data-bonus-card
          value="${escapeAttr(id)}"
          data-card-label="${escapeAttr(`${user.name || "User"} CARD[${id}]`)}"
        >
        <span>
          <strong>CARD[${escapeHtml(id)}] • ${escapeHtml(uid)}</strong>
          <span>Balance: ₱${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </span>
      </label>
    `;
  }

  function emptyUsers() {
    return `<div class="ec-software-empty"><div><strong>No users/cards loaded</strong><p>Click Refresh Cards.</p></div></div>`;
  }

  function notifyModal(message = "") {
    return `
      <div class="ec-software-modal-body">
        <div class="ec-software-note">
          Title is automatically handled as ElectriCredit Bonus / Balance Adjustment. Write only the message body.
        </div>
        <label class="ec-software-field">
          <span>Notify Message</span>
          <textarea data-bonus-notify-message placeholder="Type the message sent to selected card owners...">${escapeHtml(message)}</textarea>
        </label>
      </div>
    `;
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

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
  }

  window.SoftwareBonusStructure = { render, notifyModal };
})();
