/* SOFTWARE ANNOUNCEMENT CONTROLLER v2 */
(function () {
  "use strict";

  const C = {
    root: null,
    parent: null,
    summary: null,
    recipients: null,
    selectedEmails: [],
    selectedNumbers: [],

    async init(ctx = {}) {
      this.root = ctx.root;
      this.parent = ctx.parent || window.SoftwareController;
      this.summary = ctx.summary || {};
      if (!this.root || !window.SoftwareAnnouncementStructure) return;
      window.SoftwareAnnouncementDesign?.inject?.();
      this.render();
      this.bindEvents();
    },

    render() {
      this.root.innerHTML = window.SoftwareAnnouncementStructure.render({
        access: this.summary.access || {}
      });
      this.syncModes();
      this.updatePreview();
    },

    bindEvents() {
      this.root.addEventListener("change", (event) => {
        if (event.target.closest("[data-email-member-mode]") || event.target.closest("[data-sms-member-mode]")) {
          this.syncModes();
        }
      });

      this.root.addEventListener("input", (event) => {
        if (event.target.closest("[data-email-body], [data-email-title]")) {
          this.updatePreview();
        }
      });

      this.root.addEventListener("click", async (event) => {
        if (event.target.closest("[data-ann-sample]")) return this.insertSample();
        if (event.target.closest("[data-ann-refresh-recipients]")) return this.loadRecipients(true);
        if (event.target.closest("[data-email-member-picker]")) return this.openRecipientPicker("email");
        if (event.target.closest("[data-sms-member-picker]")) return this.openRecipientPicker("sms");
        if (event.target.closest("[data-email-clear]")) return this.clearEmail();
        if (event.target.closest("[data-sms-clear]")) return this.clearSms();
        if (event.target.closest("[data-email-copy]")) return this.copyEmail();
        if (event.target.closest("[data-sms-copy]")) return this.copySms();
        if (event.target.closest("[data-email-send]")) return this.sendEmail();
        if (event.target.closest("[data-sms-send]")) return this.sendSms();
      });
    },

    syncModes() {
      const emailMember = this.root.querySelector("[data-email-member-mode]")?.checked !== false;
      const smsMember = this.root.querySelector("[data-sms-member-mode]")?.checked !== false;

      toggle(this.root.querySelector("[data-email-custom-receivers]"), !emailMember);
      toggle(this.root.querySelector("[data-email-member-picker]"), emailMember);
      toggle(this.root.querySelector("[data-sms-custom-receivers]"), !smsMember);
      toggle(this.root.querySelector("[data-sms-member-picker]"), smsMember);
    },

    updatePreview() {
      const body = this.root.querySelector("[data-email-body]")?.value || "";
      const title = this.root.querySelector("[data-email-title]")?.value || "ElectriCredit announcement";
      const grid = this.root.querySelector("[data-ann-grid]");
      const panel = this.root.querySelector("[data-ann-preview-panel]");
      const iframe = this.root.querySelector("[data-email-preview]");
      const titleEl = this.root.querySelector("[data-email-preview-title]");

      const hasHtml = body.trim().length > 0;

      if (grid) grid.classList.toggle("is-previewing", hasHtml);
      if (panel) panel.hidden = !hasHtml;
      if (titleEl) titleEl.textContent = title;

      if (iframe && hasHtml) {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(body);
          doc.close();
        }
      }
    },

    insertSample() {
      const title = this.root.querySelector("[data-email-title]");
      const body = this.root.querySelector("[data-email-body]");
      if (title && !title.value.trim()) title.value = "ElectriCredit Announcement";
      if (body) body.value = window.SoftwareAnnouncementStructure.sampleEmailHtml();
      this.updatePreview();
      this.parent.toast("Sample inserted", "Theme-friendly HTML email sample inserted.", "success");
    },

    async loadRecipients(showToast = false) {
      try {
        const payload = await this.parent.postJson(
          this.parent.route("softwareRecipients", "/api/software/recipients"),
          {}
        );
        this.recipients = payload.data || {};
        if (showToast) this.parent.toast("Members loaded", "Recorded emails and numbers are ready.", "success");
        return this.recipients;
      } catch (error) {
        this.parent.toast("Recipients failed", error.message || "Unable to load recipients.", "danger");
        return null;
      }
    },

    async openRecipientPicker(type) {
      if (!this.recipients) await this.loadRecipients(false);
      if (!this.recipients) return;

      const selected = type === "sms" ? this.selectedNumbers : this.selectedEmails;

      const modal = this.parent.openModal({
        title: type === "sms" ? "Select member numbers" : "Select member emails",
        sizeClass: "ec-modal-wide",
        body: window.SoftwareAnnouncementStructure.recipientModal(this.recipients, type, selected),
        footer: `
          <button class="ec-software-btn" type="button" data-modal-close>Cancel</button>
          <button class="ec-software-btn ec-software-btn-primary" type="button" data-recipient-apply>Apply Selected</button>
        `
      });

      modal?.addEventListener("change", (event) => {
        const all = event.target.closest("[data-recipient-all]");
        if (all) {
          modal.querySelectorAll("[data-recipient-check], [data-recipient-group-all]").forEach((input) => {
            input.checked = all.checked;
          });
          return;
        }

        const groupAll = event.target.closest("[data-recipient-group-all]");
        if (groupAll) {
          const group = groupAll.closest("[data-recipient-group]");
          group?.querySelectorAll("[data-recipient-check]").forEach((input) => {
            input.checked = groupAll.checked;
          });
        }
      });

      modal?.querySelector("[data-recipient-apply]")?.addEventListener("click", () => {
        const values = Array.from(modal.querySelectorAll("[data-recipient-check]:checked")).map((input) => input.value);
        if (type === "sms") this.selectedNumbers = unique(values);
        else this.selectedEmails = unique(values);
        this.parent.toast("Receivers selected", `${values.length} receiver(s) selected.`, "success");
        this.parent.closeModal();
      });
    },

    emailPayload() {
      const memberMode = this.root.querySelector("[data-email-member-mode]")?.checked !== false;
      const custom = splitReceivers(this.root.querySelector("[data-email-custom-receivers]")?.value || "");
      return {
        receivers: memberMode ? this.selectedEmails : custom,
        title: this.root.querySelector("[data-email-title]")?.value || "",
        html: this.root.querySelector("[data-email-body]")?.value || ""
      };
    },

    smsPayload() {
      const memberMode = this.root.querySelector("[data-sms-member-mode]")?.checked !== false;
      const custom = splitReceivers(this.root.querySelector("[data-sms-custom-receivers]")?.value || "");
      return {
        receivers: memberMode ? this.selectedNumbers : custom,
        title: this.root.querySelector("[data-sms-title]")?.value || "",
        message: this.root.querySelector("[data-sms-body]")?.value || ""
      };
    },

    async sendEmail() {
      const payload = this.emailPayload();

      if (!payload.receivers.length) return this.parent.toast("No receivers", "Select members or enter custom emails.", "warning");
      if (!payload.title.trim()) return this.parent.toast("Missing title", "Email title is required.", "warning");
      if (!payload.html.trim()) return this.parent.toast("Missing body", "Email HTML body is required.", "warning");

      const button = this.root.querySelector("[data-email-send]");
      if (button) button.disabled = true;

      try {
        const result = await this.parent.postJson(
          this.parent.route("softwareAnnouncementEmail", "/api/software/announcement/email"),
          payload
        );
        const data = result.data || {};
        this.parent.toast("Email sent", `${data.sent || 0} sent, ${data.failed || 0} failed.`, data.failed ? "warning" : "success");
        this.clearEmail();
      } catch (error) {
        this.parent.toast("Email failed", error.message || "Unable to send email.", "danger");
      } finally {
        if (button) button.disabled = false;
      }
    },

    async sendSms() {
      const payload = this.smsPayload();

      if (!payload.receivers.length) return this.parent.toast("No receivers", "Select members or enter custom numbers.", "warning");
      if (!payload.message.trim()) return this.parent.toast("Missing message", "SMS body is required.", "warning");

      const button = this.root.querySelector("[data-sms-send]");
      if (button) button.disabled = true;

      try {
        const result = await this.parent.postJson(
          this.parent.route("softwareAnnouncementSms", "/api/software/announcement/sms"),
          payload
        );
        const data = result.data || {};
        this.parent.toast("SMS sent", `${data.sent || 0} sent, ${data.failed || 0} failed.`, data.failed ? "warning" : "success");
        this.clearSms();
      } catch (error) {
        this.parent.toast("SMS failed", error.message || "Unable to send SMS.", "danger");
      } finally {
        if (button) button.disabled = false;
      }
    },

    clearEmail() {
      this.selectedEmails = [];
      ["[data-email-custom-receivers]", "[data-email-title]", "[data-email-body]"].forEach((selector) => {
        const el = this.root.querySelector(selector);
        if (el) el.value = "";
      });
      this.updatePreview();
    },

    clearSms() {
      this.selectedNumbers = [];
      ["[data-sms-custom-receivers]", "[data-sms-title]", "[data-sms-body]"].forEach((selector) => {
        const el = this.root.querySelector(selector);
        if (el) el.value = "";
      });
    },

    async copyEmail() {
      const payload = this.emailPayload();
      await copyText(`Title: ${payload.title}\nReceivers: ${payload.receivers.join(", ")}\n\n${payload.html}`);
      this.parent.toast("Copied", "Email draft copied.", "success");
    },

    async copySms() {
      const payload = this.smsPayload();
      await copyText(`Title: ${payload.title}\nReceivers: ${payload.receivers.join(", ")}\n\n${payload.message}`);
      this.parent.toast("Copied", "SMS draft copied.", "success");
    }
  };

  function toggle(el, show) {
    if (!el) return;
    el.hidden = !show;
  }

  function unique(list) {
    return Array.from(new Set(list.filter(Boolean)));
  }

  function splitReceivers(value) {
    return unique(String(value || "").split(/[,\n;]/).map((item) => item.trim()).filter(Boolean));
  }

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

  window.SoftwareAnnouncement = C;
})();
