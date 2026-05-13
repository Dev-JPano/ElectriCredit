/* SOFTWARE BONUS CONTROLLER v1 */
(function () {
  "use strict";

  const C = {
    root: null,
    parent: null,
    summary: null,
    users: [],
    notifyMessage: "",
    sending: false,
    cancelRequested: false,

    async init(ctx = {}) {
      this.root = ctx.root;
      this.parent = ctx.parent || window.SoftwareController;
      this.summary = ctx.summary || {};
      if (!this.root || !window.SoftwareBonusStructure) return;
      window.SoftwareBonusDesign?.inject?.();
      this.render();
      this.bindEvents();
      await this.refresh(false);
    },

    render() {
      this.root.innerHTML = window.SoftwareBonusStructure.render({
        users: this.users,
        access: this.summary.access || {}
      });
      this.updateSendState();
      this.updateNotifyPreview();
    },

    bindEvents() {
      this.root.addEventListener("input", (event) => {
        if (event.target.closest("[data-bonus-amount]")) this.updateSendState();
      });

      this.root.addEventListener("change", (event) => {
        const all = event.target.closest("[data-bonus-select-all]");
        if (all) {
          this.root.querySelectorAll("[data-bonus-card], [data-bonus-user-all]").forEach((input) => {
            input.checked = all.checked;
          });
          this.updateSendState();
          return;
        }

        const userAll = event.target.closest("[data-bonus-user-all]");
        if (userAll) {
          const group = userAll.closest("[data-bonus-user]");
          group?.querySelectorAll("[data-bonus-card]").forEach((input) => {
            input.checked = userAll.checked;
          });
          this.updateSendState();
          return;
        }

        if (event.target.closest("[data-bonus-card], [data-bonus-notify-email], [data-bonus-notify-sms]")) {
          this.updateSendState();
        }
      });

      this.root.addEventListener("click", async (event) => {
        if (event.target.closest("[data-bonus-refresh]")) return this.refresh(true);
        if (event.target.closest("[data-bonus-notify-modal]")) return this.openNotifyModal();
        if (event.target.closest("[data-bonus-clear]")) return this.clear();
        if (event.target.closest("[data-bonus-copy]")) return this.copySummary();
        if (event.target.closest("[data-bonus-send]")) {
          if (this.sending) return this.cancelSend();
          return this.confirmSend();
        }
      });
    },

    async refresh(showToast = true) {
      try {
        const payload = await this.parent.getJson(this.parent.route("users", "/api/users"));
        const data = payload.data || payload;
        if (Array.isArray(data)) this.users = data;
        else if (Array.isArray(data.items)) this.users = data.items;
        else if (Array.isArray(data.users)) this.users = data.users;
        else this.users = [];
        this.render();
        if (showToast) this.parent.toast("Cards loaded", "Users and linked cards were loaded.", "success");
      } catch (error) {
        this.parent.toast("Cards failed", error.message || "Unable to load users/cards.", "danger");
      }
    },

    selectedCards() {
      return Array.from(this.root.querySelectorAll("[data-bonus-card]:checked")).map((input) => ({
        id: Number(input.value),
        label: input.dataset.cardLabel || `CARD[${input.value}]`
      })).filter((item) => item.id > 0);
    },

    amount() {
      const value = Number(this.root.querySelector("[data-bonus-amount]")?.value || 0);
      return Number.isFinite(value) ? value : 0;
    },

    updateSendState() {
      const button = this.root.querySelector("[data-bonus-send]");
      if (!button) return;
      const ready = this.amount() !== 0 && this.selectedCards().length > 0;
      button.disabled = !ready && !this.sending;
    },

    updateNotifyPreview() {
      const checkbox = this.root.querySelector("[data-bonus-notify]");
      const preview = this.root.querySelector("[data-bonus-notify-preview]");
      if (checkbox) checkbox.checked = Boolean(this.notifyMessage);
      if (preview) preview.textContent = this.notifyMessage || "No notification message set.";
    },

    openNotifyModal() {
      const modal = this.parent.openModal({
        title: "Bonus Notification",
        body: window.SoftwareBonusStructure.notifyModal(this.notifyMessage),
        footer: `
          <button class="ec-software-btn" type="button" data-bonus-notify-clear>Clear</button>
          <button class="ec-software-btn" type="button" data-bonus-notify-copy>Copy</button>
          <button class="ec-software-btn ec-software-btn-primary" type="button" data-bonus-notify-set>Set</button>
        `
      });

      modal?.querySelector("[data-bonus-notify-clear]")?.addEventListener("click", () => {
        const area = modal.querySelector("[data-bonus-notify-message]");
        if (area) area.value = "";
      });

      modal?.querySelector("[data-bonus-notify-copy]")?.addEventListener("click", async () => {
        await copyText(modal.querySelector("[data-bonus-notify-message]")?.value || "");
        this.parent.toast("Copied", "Notify message copied.", "success");
      });

      modal?.querySelector("[data-bonus-notify-set]")?.addEventListener("click", () => {
        this.notifyMessage = String(modal.querySelector("[data-bonus-notify-message]")?.value || "").trim();
        this.parent.closeModal();
        this.updateNotifyPreview();
        this.updateSendState();
      });
    },

    confirmSend() {
      const amount = this.amount();
      const cards = this.selectedCards();

      if (!cards.length) return this.parent.toast("No cards", "Select at least one card.", "warning");
      if (amount === 0) return this.parent.toast("Invalid amount", "Amount must not be 0.00.", "warning");

      this.parent.openConfirm({
        title: amount > 0 ? "Send Bonus" : "Send Balance Punishment",
        message: `This will apply ₱${amount.toFixed(2)} to ${cards.length} selected card(s).`,
        onConfirm: async (confirmPayload) => {
          this.parent.closeModal();
          await this.send(confirmPayload);
        }
      });
    },

    async send(confirmPayload = {}) {
      const amount = this.amount();
      const cards = this.selectedCards();

      this.sending = true;
      this.cancelRequested = false;
      this.updateSendButton("Cancel");

      const stream = this.root.querySelector("[data-bonus-stream]");
      if (stream) stream.innerHTML = "";

      try {
        for (const item of cards) {
          if (this.cancelRequested) break;

          const payload = Object.assign({}, confirmPayload, {
            amount,
            card_ids: [item.id],
            notify: Boolean(this.notifyMessage),
            notify_message: this.notifyMessage,
            notify_email: Boolean(this.root.querySelector("[data-bonus-notify-email]")?.checked),
            notify_sms: Boolean(this.root.querySelector("[data-bonus-notify-sms]")?.checked)
          });

          await this.parent.postJson(this.parent.route("softwareBonus", "/api/software/bonus"), payload);
          this.addStreamLine(`${amount > 0 ? "Added" : "Deducted"} ₱${Math.abs(amount).toFixed(2)} on ${item.label}`);
        }

        this.parent.toast("Balance operation done", this.cancelRequested ? "Operation cancelled." : "Selected cards were processed.", this.cancelRequested ? "warning" : "success");
        await this.refresh(false);
      } catch (error) {
        this.parent.toast("Bonus failed", error.message || "Unable to apply balance operation.", "danger");
      } finally {
        this.sending = false;
        this.cancelRequested = false;
        this.updateSendButton("Send");
        this.updateSendState();
      }
    },

    cancelSend() {
      this.cancelRequested = true;
      this.parent.toast("Cancelling", "The current operation will stop after this card.", "warning");
    },

    updateSendButton(text) {
      const button = this.root.querySelector("[data-bonus-send]");
      if (button) {
        button.textContent = text;
        button.disabled = false;
      }
    },

    addStreamLine(text) {
      const stream = this.root.querySelector("[data-bonus-stream]");
      if (!stream) return;
      const line = document.createElement("div");
      line.className = "ec-software-toast-line";
      line.textContent = text;
      stream.prepend(line);
    },

    clear() {
      this.notifyMessage = "";
      const amount = this.root.querySelector("[data-bonus-amount]");
      if (amount) amount.value = "";
      this.root.querySelectorAll("[data-bonus-card], [data-bonus-user-all], [data-bonus-select-all], [data-bonus-notify-email], [data-bonus-notify-sms]").forEach((input) => {
        input.checked = false;
      });
      const stream = this.root.querySelector("[data-bonus-stream]");
      if (stream) stream.innerHTML = "";
      this.updateNotifyPreview();
      this.updateSendState();
    },

    async copySummary() {
      const amount = this.amount();
      const cards = this.selectedCards();
      const text = [
        "ElectriCredit Balance Operation",
        `Amount: ₱${amount.toFixed(2)}`,
        `Cards: ${cards.map((item) => item.label).join(", ")}`,
        `Notify: ${this.notifyMessage || "No message"}`
      ].join("\n");

      await copyText(text);
      this.parent.toast("Copied", "Bonus operation summary copied.", "success");
    }
  };

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
  }

  window.SoftwareBonus = C;
})();
