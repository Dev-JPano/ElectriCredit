/* =========================================================
   ELECTRICREDIT V2 - GLOBAL VALIDATOR
   File: static/utils/validator.js

   Purpose:
   - Centralized 16-character confirmation flow
   - Prevent copy/cut/context menu on generated code
   - Reusable by Software, Peopleware, Hardware, and future modules
   ========================================================= */

(function () {
  "use strict";

  const DEFAULT_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?";

  const Validator = {
    randomCode(length = 16, chars = DEFAULT_CHARS) {
      const safeLength = Number.isFinite(Number(length)) ? Math.max(4, Number(length)) : 16;
      let output = "";

      if (window.crypto && window.crypto.getRandomValues) {
        const values = new Uint32Array(safeLength);
        window.crypto.getRandomValues(values);
        for (let index = 0; index < safeLength; index += 1) {
          output += chars[values[index] % chars.length];
        }
        return output;
      }

      for (let index = 0; index < safeLength; index += 1) {
        output += chars[Math.floor(Math.random() * chars.length)];
      }

      return output;
    },

    openConfirm(controller, options = {}) {
      if (!controller || typeof controller.openModal !== "function") {
        console.warn("Validator requires a controller with openModal().");
        return null;
      }

      const code = options.code || this.randomCode(options.length || 16, options.chars || DEFAULT_CHARS);
      const title = options.title || "Confirm Action";
      const message = options.message || "This action requires confirmation.";
      const keyword = options.keyword || "confirmation code";
      const danger = options.danger !== false;
      const proceedText = options.proceedText || "Proceed";
      const cancelText = options.cancelText || "Cancel";
      const sizeClass = options.sizeClass || "";

      const modal = controller.openModal({
        title,
        sizeClass,
        body: `
          <div class="ec-validator-body ec-software-modal-body ec-software-confirm">
            <div class="ec-validator-note ec-software-note">${this.escapeHtml(message)}</div>

            <label class="ec-validator-field ec-software-field ec-validator-nocopy ec-software-nocopy">
              <span>Confirmation code</span>
              <input
                type="text"
                value="${this.escapeAttr(code)}"
                readonly
                tabindex="-1"
                aria-label="Generated confirmation code"
                data-validator-generated-code
                oncopy="return false"
                oncut="return false"
                oncontextmenu="return false"
                ondragstart="return false"
              >
            </label>

            <label class="ec-validator-field ec-software-field">
              <span>Type the ${this.escapeHtml(keyword)}</span>
              <input
                type="text"
                data-validator-confirm-input
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
                placeholder="Type the generated code exactly"
              >
            </label>

            <div class="ec-validator-hint">
              Type the code manually. Copying is blocked so destructive actions are intentional.
            </div>
          </div>
        `,
        footer: `
          <button class="ec-software-btn" type="button" data-modal-close>${this.escapeHtml(cancelText)}</button>
          <button class="ec-software-btn ${danger ? "ec-software-btn-danger" : "ec-software-btn-primary"}" type="button" data-validator-confirm-proceed disabled>${this.escapeHtml(proceedText)}</button>
        `
      });

      this.bindConfirmModal(modal, controller, options, code);
      return modal;
    },

    bindConfirmModal(modal, controller, options, code) {
      if (!modal) return;

      this.injectDesign();

      const generated = modal.querySelector("[data-validator-generated-code]");
      const input = modal.querySelector("[data-validator-confirm-input]");
      const proceed = modal.querySelector("[data-validator-confirm-proceed]");

      const normalize = (value) => String(value || "").trim();
      const update = () => {
        const matched = normalize(input?.value) === code;
        if (proceed) proceed.disabled = !matched;
        input?.classList.toggle("is-valid", matched);
        input?.classList.toggle("is-invalid", Boolean(input?.value) && !matched);
      };

      generated?.addEventListener("copy", preventEvent);
      generated?.addEventListener("cut", preventEvent);
      generated?.addEventListener("contextmenu", preventEvent);
      generated?.addEventListener("dragstart", preventEvent);
      generated?.addEventListener("selectstart", preventEvent);

      input?.addEventListener("input", update);
      input?.addEventListener("paste", () => {
        window.setTimeout(update, 0);
      });

      proceed?.addEventListener("click", async () => {
        const typed = normalize(input?.value);

        if (typed !== code) {
          this.toast(controller, "Code does not match", "Type the exact generated confirmation code.", "danger");
          return;
        }

        try {
          await options.onConfirm?.({
            confirmation_code: code,
            confirmation_text: typed,
            validator_code: code,
            validator_text: typed
          });
        } catch (error) {
          this.toast(controller, "Action failed", error.message || "Unable to complete action.", "danger");
        }
      });

      window.setTimeout(() => input?.focus(), 80);
      update();
    },

    validateTypedCode(code, typed) {
      return String(code || "").trim() === String(typed || "").trim();
    },

    injectDesign() {
      const id = "electricredit-validator-design-v1";
      if (document.getElementById(id)) return;

      const style = document.createElement("style");
      style.id = id;
      style.textContent = `
        .ec-validator-body{
          display:grid;
          gap:.85rem;
        }

        .ec-validator-nocopy input,
        [data-validator-generated-code]{
          user-select:none;
          -webkit-user-select:none;
          letter-spacing:.12em;
          font-weight:1000;
          text-align:center;
          cursor:default;
        }

        .ec-validator-hint{
          border:1px dashed color-mix(in srgb,var(--ec-warning) 38%,var(--ec-border));
          border-radius:.9rem;
          padding:.7rem;
          background:color-mix(in srgb,var(--ec-warning) 8%,transparent);
          color:var(--ec-txtforbg2);
          font-size:.82rem;
          line-height:1.45;
        }

        [data-validator-confirm-input].is-valid{
          border-color:color-mix(in srgb,var(--ec-success) 68%,var(--ec-border))!important;
          box-shadow:0 0 0 3px color-mix(in srgb,var(--ec-success) 13%,transparent)!important;
        }

        [data-validator-confirm-input].is-invalid{
          border-color:color-mix(in srgb,var(--ec-danger) 68%,var(--ec-border))!important;
          box-shadow:0 0 0 3px color-mix(in srgb,var(--ec-danger) 12%,transparent)!important;
        }
      `;
      document.head.appendChild(style);
    },

    toast(controller, title, text = "", type = "info") {
      if (controller && typeof controller.toast === "function") {
        controller.toast(title, text, type);
      } else {
        console.log(`[${type}] ${title}`, text);
      }
    },

    escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    },

    escapeAttr(value) {
      return this.escapeHtml(value).replaceAll("`", "&#096;");
    }
  };

  function preventEvent(event) {
    event.preventDefault();
    return false;
  }

  window.ElectriCreditValidator = Validator;
  window.ECValidator = Validator;
})();
