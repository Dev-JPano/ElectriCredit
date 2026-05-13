/* =========================================================
   ELECTRICREDIT V2 - PROFILE CONTROLLER
   File: static/components/header/profile/profile.js

   Purpose:
   - Password login
   - OTP login with 6 separate input boxes
   - Request OTP with handled backend/email errors
   - Stack-style modal sub views
   - Profile image fallback resolver
   - Role-based account management shell
   ========================================================= */

(function () {
  "use strict";

  const STORAGE_KEYS = {
    auth: "electricredit.auth"
  };

  const DEFAULT_IMAGE = "/static/assets/default-image.png";

  const DEVELOPER_IMAGE_MAP = {
    "jaycob lumayag": "/static/assets/developers/Jaycob Lumayag.jpg",
    "jellen anos": "/static/assets/developers/Jellen Anos.jpg",
    "jhon anthony pano": "/static/assets/developers/Jhon Anthony Pano.jpg",
    "joselito jr tambacan": "/static/assets/developers/Joselito Jr. Tambacan.jpg",
    "joselito jr. tambacan": "/static/assets/developers/Joselito Jr. Tambacan.jpg",
    "joshane rhea paquibot": "/static/assets/developers/Joshane Rhea Paquibot.jpg"
  };

  const ProfileController = {
    root: null,
    panel: null,
    mainView: null,
    stackView: null,
    status: null,
    headProfile: null,
    logoutHead: null,
    app: null,
    currentUser: null,
    loginMode: "password",
    otpTokens: {
      login: "",
      changePassword: "",
      updateProfile: "",
      developerApproval: "",
      authorizerApproval: "",
      removeOwner: ""
    },
    currentManageRole: "",
    peopleCache: {},
    pendingRemove: null,
    managedOtpTokens: {},
    otpRequestLocks: {},
    otpCooldownTimers: {},

    async init(context = {}) {
      this.app = context.app || window.ElectriCredit || null;

      if (!window.ProfileStructure || !window.ProfileDesign) {
        console.warn("ProfileStructure or ProfileDesign is missing.");
        return;
      }

      window.ProfileDesign.inject();

      this.mountRoot();
      this.cacheElements();
      this.bindEvents();

      this.loadLocalAuth();
      await this.tryLoadSession();

      this.render();
    },

    mountRoot() {
      let root = document.querySelector("[data-profile-root]");

      if (!root) {
        root = document.createElement("div");
        root.className = "ec-profile-root";
        root.dataset.profileRoot = "true";
        document.body.appendChild(root);
      }

      root.innerHTML = window.ProfileStructure.renderModal();
      this.root = root;
    },

    cacheElements() {
      this.panel = this.root.querySelector("[data-profile-panel]");
      this.mainView = this.root.querySelector("[data-profile-main-view]");
      this.stackView = this.root.querySelector("[data-profile-stack-view]");
      this.status = this.root.querySelector("[data-profile-status]");
      this.headProfile = this.root.querySelector("[data-profile-head-profile]");
      this.logoutHead = this.root.querySelector("[data-profile-logout]");
    },

    bindEvents() {
      document.addEventListener(
        "click",
        (event) => {
          const button = event.target.closest("[data-profile-open]");
          if (!button) return;

          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          this.open();
        },
        true
      );

      this.root.addEventListener("click", async (event) => {
        try {
          if (event.target.closest("[data-profile-close]")) {
            this.close();
            return;
          }

          if (event.target.closest("[data-profile-logout]")) {
            this.logout();
            return;
          }

          if (event.target.closest("[data-profile-stack-close]")) {
            this.closeStackView();
            return;
          }

          const tab = event.target.closest("[data-profile-login-tab]");
          if (tab) {
            this.switchLoginTab(tab.dataset.profileLoginTab);
            return;
          }

          if (event.target.closest("[data-profile-request-login-otp]")) {
            await this.requestLoginOtp();
            return;
          }

          if (event.target.closest("[data-profile-request-change-password-otp]")) {
            await this.requestAccountOtp("change_password", "changePassword");
            return;
          }

          if (event.target.closest("[data-profile-request-update-profile-otp]")) {
            await this.requestAccountOtp("update_profile", "updateProfile");
            return;
          }

          if (event.target.closest("[data-profile-request-developer-otp]")) {
            await this.requestDeveloperOtp();
            return;
          }

          const changePasswordMode = event.target.closest("[data-profile-change-password-mode]");
          if (changePasswordMode) {
            this.setChangePasswordMode(changePasswordMode.dataset.profileChangePasswordMode || "password");
            return;
          }

          if (event.target.closest("[data-profile-request-authorizer-otp]")) {
            await this.requestPasswordAuthorizerOtp();
            return;
          }

          if (event.target.closest("[data-profile-clear-change-password]")) {
            this.clearChangePasswordForm();
            return;
          }

          const panelButton = event.target.closest("[data-profile-panel-view]");
          if (panelButton) {
            await this.showPanel(panelButton.dataset.profilePanelView);
            return;
          }

          const refresh = event.target.closest("[data-profile-refresh-accounts]");
          if (refresh) {
            await this.loadManageAccounts(refresh.dataset.profileRefreshAccounts);
            return;
          }

          const addAccount = event.target.closest("[data-profile-add-account]");
          if (addAccount) {
            this.openStackView(
              window.ProfileStructure.renderAddAccountForm(addAccount.dataset.profileAddAccount)
            );
            return;
          }

          const editButton = event.target.closest("[data-profile-edit-account]");
          if (editButton) {
            await this.showEditAccount(editButton.dataset.profileEditAccount);
            return;
          }

          const requestManagedOtp = event.target.closest("[data-profile-request-managed-otp]");
          if (requestManagedOtp) {
            await this.requestManagedUpdateOtp(requestManagedOtp.dataset.profileRequestManagedOtp);
            return;
          }

          const requestManagedPasswordOtp = event.target.closest("[data-profile-request-managed-password-otp]");
          if (requestManagedPasswordOtp) {
            await this.requestManagedUpdateOtp(requestManagedPasswordOtp.dataset.profileRequestManagedPasswordOtp, "managed_password_target");
            return;
          }

          const requestManagedApproverOtp = event.target.closest("[data-profile-request-managed-approver-otp]");
          if (requestManagedApproverOtp) {
            await this.requestManagedApproverOtp(requestManagedApproverOtp.dataset.profileRequestManagedApproverOtp);
            return;
          }

          const passwordMode = event.target.closest("[data-managed-password-mode]");
          if (passwordMode) {
            this.setManagedPasswordMode(passwordMode.dataset.managedPasswordMode || "password");
            return;
          }

          const requestRemoveOwnerOtp = event.target.closest("[data-profile-request-remove-owner-otp]");
          if (requestRemoveOwnerOtp) {
            await this.requestAccountOtp("remove_owner", "removeOwner");
            return;
          }

          const removeButton = event.target.closest("[data-profile-remove-account]");
          if (removeButton) {
            await this.removeAccount(
              removeButton.dataset.profileRemoveAccount,
              removeButton.dataset.profileRemoveRole
            );
          }
        } catch (error) {
          this.setStatus(error.message || "Profile action failed.", "danger");
        }
      });

      this.root.addEventListener("input", (event) => {
        const inlineOtp = event.target.closest("[data-profile-otp-digit]");
        if (inlineOtp) {
          this.handleInlineOtpInput(inlineOtp);
          return;
        }

        const pinBox = event.target.closest("[data-profile-pin-box]");
        if (pinBox) {
          this.handlePinInput(pinBox);
        }
      });

      this.root.addEventListener("keydown", (event) => {
        const inlineOtp = event.target.closest("[data-profile-otp-digit]");
        if (inlineOtp) {
          if (event.key === "Backspace" && !inlineOtp.value) {
            const index = Number(inlineOtp.dataset.profileOtpDigit || 0);
            const name = inlineOtp.dataset.profileOtpName || "otp";
            const previous = this.root.querySelector(`[data-profile-otp-name="${CSS.escape(name)}"][data-profile-otp-digit="${index - 1}"]`);
            if (previous) previous.focus();
          }
          return;
        }

        const pinBox = event.target.closest("[data-profile-pin-box]");
        if (!pinBox) return;

        if (event.key === "Backspace" && !pinBox.value) {
          const index = Number(pinBox.dataset.profilePinBox || 0);
          const previous = this.root.querySelector(`[data-profile-pin-box="${index - 1}"]`);
          if (previous) previous.focus();
        }
      });

      this.root.addEventListener("paste", (event) => {
        const inlineOtp = event.target.closest("[data-profile-otp-digit]");
        if (inlineOtp) {
          event.preventDefault();
          const text = (event.clipboardData || window.clipboardData).getData("text") || "";
          this.fillInlineOtpBoxes(inlineOtp.dataset.profileOtpName || "otp", text);
          return;
        }

        const pinBox = event.target.closest("[data-profile-pin-box]");
        if (!pinBox) return;

        event.preventDefault();
        const text = (event.clipboardData || window.clipboardData).getData("text") || "";
        this.fillOtpBoxes(text);
      });

      this.root.addEventListener("submit", async (event) => {
        try {
          const loginForm = event.target.closest("[data-profile-login-form]");
          if (loginForm) {
            event.preventDefault();
            await this.login();
            return;
          }

          const changePasswordForm = event.target.closest("[data-profile-change-password-form]");
          if (changePasswordForm) {
            event.preventDefault();
            await this.changePassword();
            return;
          }

          const editForm = event.target.closest("[data-profile-edit-form]");
          if (editForm) {
            event.preventDefault();
            await this.updateProfile();
            return;
          }

          const addForm = event.target.closest("[data-profile-add-account-form]");
          if (addForm) {
            event.preventDefault();
            await this.addAccount(addForm.dataset.role);
            return;
          }

          const editManagedForm = event.target.closest("[data-profile-edit-managed-form]");
          if (editManagedForm) {
            event.preventDefault();
            await this.updateManagedAccount(editManagedForm.dataset.targetId, editManagedForm.dataset.role);
            return;
          }

          const removeForm = event.target.closest("[data-profile-remove-account-form]");
          if (removeForm) {
            event.preventDefault();
            await this.confirmRemoveAccount(removeForm.dataset.targetId, removeForm.dataset.role);
          }
        } catch (error) {
          this.setStatus(error.message || "Request failed.", "danger");
        }
      });

      window.addEventListener("electricredit:profile-open", (event) => {
        if (event.cancelable) event.preventDefault();
        this.open();
      });

      window.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || this.panel.hidden) return;

        if (!this.stackView.hidden) {
          this.closeStackView();
        } else {
          this.close();
        }
      });
    },

    open() {
      this.panel.hidden = false;
      document.body.classList.add("ec-modal-open");
      this.render();
    },

    close() {
      this.panel.hidden = true;
      document.body.classList.remove("ec-modal-open");
      this.closeStackView({ silent: true });
    },

    render() {
      if (!this.mainView) return;

      this.currentUser = this.enrichProfileImage(this.currentUser);
      this.renderHeader();
      this.closeStackView({ silent: true });

      if (this.currentUser) {
        this.setStatus(`${this.currentUser.role} account logged in.`, "success");
        this.mainView.innerHTML = window.ProfileStructure.renderLoggedIn(this.currentUser);
      } else {
        this.setStatus("Visitor mode. Software is disabled.", "warning");
        this.mainView.innerHTML = window.ProfileStructure.renderLoggedOut(this.loginMode);
        this.switchLoginTab(this.loginMode, { preserveValues: true });
      }

      this.syncGlobalAuth();
    },

    renderHeader() {
      if (!this.headProfile) return;

      if (this.currentUser) {
        this.headProfile.innerHTML = window.ProfileStructure.renderUserHeader(this.currentUser);
        if (this.logoutHead) this.logoutHead.hidden = false;
      } else {
        this.headProfile.innerHTML = window.ProfileStructure.renderVisitorHeader();
        if (this.logoutHead) this.logoutHead.hidden = true;
      }
    },

    openStackView(html) {
      this.mainView.hidden = true;
      this.stackView.hidden = false;
      this.stackView.innerHTML = html;
      this.stackView.scrollTop = 0;
    },

    closeStackView(options = {}) {
      if (!this.stackView || !this.mainView) return;

      this.stackView.hidden = true;
      this.stackView.innerHTML = "";
      this.mainView.hidden = false;

      if (!options.silent) {
        this.setStatus(
          this.currentUser ? `${this.currentUser.role} account logged in.` : "Visitor mode. Software is disabled.",
          this.currentUser ? "success" : "warning"
        );
      }
    },

    switchLoginTab(mode, options = {}) {
      this.loginMode = mode === "otp" ? "otp" : "password";

      const usernameValue = this.root.querySelector("[data-profile-login-username]")?.value || "";

      this.root.querySelectorAll("[data-profile-login-tab]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.profileLoginTab === this.loginMode);
      });

      const passwordRow = this.root.querySelector("[data-profile-password-row]");
      const otpRow = this.root.querySelector("[data-profile-otp-row]");

      if (passwordRow) passwordRow.hidden = this.loginMode !== "password";
      if (otpRow) otpRow.hidden = this.loginMode !== "otp";

      if (options.preserveValues && usernameValue) {
        const username = this.root.querySelector("[data-profile-login-username]");
        if (username) username.value = usernameValue;
      }
    },

    handlePinInput(input) {
      input.value = input.value.replace(/\D/g, "").slice(0, 1);

      const index = Number(input.dataset.profilePinBox || 0);
      if (input.value && index < 5) {
        const next = this.root.querySelector(`[data-profile-pin-box="${index + 1}"]`);
        if (next) next.focus();
      }

      const code = this.getOtpCode();
      if (code.length === 6) {
        this.login().catch((error) => {
          this.setStatus(error.message || "OTP login failed.", "danger");
        });
      }
    },

    fillOtpBoxes(value) {
      const digits = String(value || "").replace(/\D/g, "").slice(0, 6).split("");
      const boxes = Array.from(this.root.querySelectorAll("[data-profile-pin-box]"));

      boxes.forEach((box, index) => {
        box.value = digits[index] || "";
      });

      const nextIndex = Math.min(digits.length, 5);
      boxes[nextIndex]?.focus();

      if (digits.length === 6) {
        this.login().catch((error) => {
          this.setStatus(error.message || "OTP login failed.", "danger");
        });
      }
    },

    getOtpCode() {
      return Array.from(this.root.querySelectorAll("[data-profile-pin-box]"))
        .map((input) => input.value || "")
        .join("")
        .replace(/\D/g, "")
        .slice(0, 6);
    },

    handleInlineOtpInput(input) {
      input.value = input.value.replace(/\D/g, "").slice(0, 1);

      const name = input.dataset.profileOtpName || "otp";
      const index = Number(input.dataset.profileOtpDigit || 0);
      if (input.value && index < 5) {
        const next = this.root.querySelector(`[data-profile-otp-name="${CSS.escape(name)}"][data-profile-otp-digit="${index + 1}"]`);
        if (next) next.focus();
      }

      this.updateInlineOtpValue(name);
    },

    fillInlineOtpBoxes(name, value) {
      const safeName = String(name || "otp");
      const digits = String(value || "").replace(/\D/g, "").slice(0, 6).split("");
      const boxes = Array.from(this.root.querySelectorAll(`[data-profile-otp-name="${CSS.escape(safeName)}"]`));

      boxes.forEach((box, index) => {
        box.value = digits[index] || "";
      });

      this.updateInlineOtpValue(safeName);
      boxes[Math.min(digits.length, 5)]?.focus();
    },

    updateInlineOtpValue(name) {
      const safeName = String(name || "otp");
      const group = this.root.querySelector(`[data-profile-otp-group="${CSS.escape(safeName)}"]`);
      if (!group) return "";

      const code = Array.from(group.querySelectorAll("[data-profile-otp-digit]"))
        .map((input) => input.value || "")
        .join("")
        .replace(/\D/g, "")
        .slice(0, 6);

      const targetSelector = group.dataset.profileOtpTarget || "";
      const target = targetSelector ? this.root.querySelector(targetSelector) : null;
      if (target) target.value = code;
      return code;
    },

    async login() {
      const username = this.root.querySelector("[data-profile-login-username]")?.value?.trim() || "";

      if (!username) {
        this.setStatus("Username is required.", "danger");
        return;
      }

      if (this.loginMode === "password") {
        const password = this.root.querySelector("[data-profile-login-password]")?.value || "";

        if (!password) {
          this.setStatus("Password is required.", "danger");
          return;
        }

        await this.performLogin({ username, password });
        return;
      }

      const otpCode = this.getOtpCode();

      if (!otpCode || otpCode.length < 6) {
        this.setStatus("Complete the 6-digit OTP first.", "danger");
        return;
      }

      if (!this.otpTokens.login) {
        this.setStatus("Send OTP first before logging in.", "danger");
        return;
      }

      await this.performLogin({
        username,
        otp_token: this.otpTokens.login,
        otp_code: otpCode
      });
    },

    async requestLoginOtp() {
      const button = this.root.querySelector("[data-profile-request-login-otp]");
      const lockKey = "login_otp";

      if (this.isOtpRequestLocked(lockKey) || button?.dataset.otpBusy === "true") return;

      const username = this.root.querySelector("[data-profile-login-username]")?.value?.trim() || "";

      if (!username) {
        this.setStatus("Username is required before sending OTP.", "danger");
        return;
      }

      this.setOtpButtonBusy(button, true);
      this.setStatus("Sending OTP...", "");

      try {
        const payload = await this.post("authRequestOtp", {
          username,
          purpose: "login",
          theme: window.ElectriCreditApp?.currentTheme || null
        });

        this.otpTokens.login = payload.data?.otp_token || "";
        this.lockOtpButton(button, lockKey, this.getOtpCooldownSeconds(payload));
        this.setStatus("Login OTP sent to account email.", "success");
        this.root.querySelector("[data-profile-pin-box='0']")?.focus();
      } catch (error) {
        this.setOtpButtonBusy(button, false);
        this.setStatus(
          error.message || "OTP could not be sent. Check SMTP configuration in .env.",
          "danger"
        );
      }
    },

    async performLogin(body) {
      this.setStatus("Logging in...", "");

      try {
        const payload = await this.post("authLogin", body);
        const user = payload.data?.user || payload.user || null;

        if (!user) {
          throw new Error("Login response has no user data.");
        }

        this.currentUser = this.enrichProfileImage(user);
        this.saveLocalAuth(this.currentUser);
        this.render();

        this.toast("Logged in", `${this.currentUser.role} account is active.`, "success");
      } catch (error) {
        this.setStatus(error.message || "Login failed.", "danger");
      }
    },

    logout() {
      this.currentUser = null;

      try {
        localStorage.removeItem(STORAGE_KEYS.auth);
      } catch (_) {}

      this.render();
      this.toast("Logged out", "Returned to Visitor mode.", "info");
    },

    async tryLoadSession() {
      try {
        const localId = this.currentUser?.id;
        if (!localId) return;

        const payload = await this.post("authMe", {
          account_id: localId
        });

        const user = payload.data?.user || payload.user || null;

        if (user) {
          this.currentUser = this.enrichProfileImage(user);
          this.saveLocalAuth(this.currentUser);
        }
      } catch (_) {}
    },

    async showPanel(panel) {
      if (!this.currentUser) return;

      if (panel === "change-password") {
        this.openStackView(window.ProfileStructure.renderChangePassword(this.currentUser));
        return;
      }

      if (panel === "edit-profile") {
        this.openStackView(window.ProfileStructure.renderEditProfile(this.currentUser));
        return;
      }

      if (panel === "manage-admins") {
        this.currentManageRole = "ADMINISTRATOR";
        this.openStackView(window.ProfileStructure.renderManageAccounts("Update Administrators", "ADMINISTRATOR"));
        await this.loadManageAccounts("ADMINISTRATOR");
        return;
      }

      if (panel === "manage-owners") {
        this.currentManageRole = "OWNER";
        this.openStackView(window.ProfileStructure.renderManageAccounts("Update Owners", "OWNER"));
        await this.loadManageAccounts("OWNER");
      }
    },


    getOtpButtonLockKey(button, fallback = "otp") {
      return String(button?.dataset?.otpLockKey || fallback || "otp");
    },

    getOtpButton(buttonOrSelector) {
      if (!buttonOrSelector) return null;
      if (typeof buttonOrSelector === "string") return this.root.querySelector(buttonOrSelector);
      return buttonOrSelector;
    },

    lockOtpButton(buttonOrSelector, lockKey = "", seconds = 300) {
      const button = this.getOtpButton(buttonOrSelector);
      if (!button) return;

      const key = lockKey || this.getOtpButtonLockKey(button, button.textContent || "otp");
      const safeSeconds = Math.max(10, Number(seconds || 300));

      this.otpRequestLocks[key] = true;
      button.disabled = true;
      button.dataset.otpLocked = "true";

      const originalText = button.dataset.originalText || button.textContent.trim() || "Send OTP";
      button.dataset.originalText = originalText;

      let remaining = safeSeconds;
      const render = () => {
        button.textContent = `Wait ${remaining}s`;
      };

      render();

      if (this.otpCooldownTimers[key]) {
        clearInterval(this.otpCooldownTimers[key]);
      }

      this.otpCooldownTimers[key] = setInterval(() => {
        remaining -= 1;

        if (remaining <= 0) {
          clearInterval(this.otpCooldownTimers[key]);
          delete this.otpCooldownTimers[key];
          delete this.otpRequestLocks[key];

          if (button.isConnected) {
            button.disabled = false;
            button.dataset.otpLocked = "false";
            button.textContent = originalText;
          }

          return;
        }

        if (button.isConnected) render();
      }, 1000);
    },

    setOtpButtonBusy(buttonOrSelector, busy = true, label = "Sending...") {
      const button = this.getOtpButton(buttonOrSelector);
      if (!button) return;

      if (busy) {
        if (!button.dataset.originalText) {
          button.dataset.originalText = button.textContent.trim() || "Send OTP";
        }
        button.disabled = true;
        button.dataset.otpBusy = "true";
        button.textContent = label;
      } else if (button.dataset.otpLocked !== "true") {
        button.disabled = false;
        button.dataset.otpBusy = "false";
        button.textContent = button.dataset.originalText || "Send OTP";
      }
    },

    isOtpRequestLocked(lockKey) {
      return Boolean(this.otpRequestLocks[String(lockKey || "otp")]);
    },

    getOtpCooldownSeconds(payload) {
      const data = payload?.data || payload || {};
      const raw = data.expires_in || data.expiry_seconds || data.cooldown_seconds || data.cooldown || data.ttl || 300;
      const seconds = Number(raw);
      return Number.isFinite(seconds) && seconds > 0 ? seconds : 300;
    },

    async requestAccountOtp(purpose, key) {
      if (!this.currentUser?.id) {
        this.setStatus("Login is required.", "danger");
        return;
      }

      const selectorMap = {
        changePassword: "[data-profile-request-change-password-otp]",
        updateProfile: "[data-profile-request-update-profile-otp]",
        removeOwner: "[data-profile-request-remove-owner-otp]"
      };

      const button = this.root.querySelector(selectorMap[key] || `[data-profile-request-${String(purpose || "").replaceAll("_", "-")}-otp]`);
      const lockKey = `account_${key || purpose}_${this.currentUser.id}`;

      if (this.isOtpRequestLocked(lockKey) || button?.dataset.otpBusy === "true") return;

      this.setOtpButtonBusy(button, true);
      this.setStatus("Sending OTP...", "");

      try {
        const payload = await this.post("authRequestOtp", {
          account_id: this.currentUser.id,
          username: this.currentUser.username,
          purpose,
          theme: window.ElectriCreditApp?.currentTheme || null
        });

        this.otpTokens[key] = payload.data?.otp_token || "";
        this.lockOtpButton(button, lockKey, this.getOtpCooldownSeconds(payload));
        this.setStatus("OTP sent to account email.", "success");
      } catch (error) {
        this.setOtpButtonBusy(button, false);
        this.setStatus(error.message || "Unable to send OTP. Check SMTP configuration.", "danger");
      }
    },

    async requestDeveloperOtp() {
      const button = this.root.querySelector("[data-profile-request-developer-otp]");
      const lockKey = "developer_approval_otp";

      if (this.isOtpRequestLocked(lockKey) || button?.dataset.otpBusy === "true") return;

      this.setOtpButtonBusy(button, true);
      this.setStatus("Sending Developer OTP...", "");

      try {
        const payload = await this.post("authRequestOtp", {
          purpose: "developer_approval",
          requested_by: this.currentUser?.id || null,
          theme: window.ElectriCreditApp?.currentTheme || null
        });

        this.otpTokens.developerApproval = payload.data?.otp_token || "";
        this.lockOtpButton(button, lockKey, this.getOtpCooldownSeconds(payload));
        this.setStatus("Developer OTP sent.", "success");
      } catch (error) {
        this.setOtpButtonBusy(button, false);
        this.setStatus(error.message || "Unable to send Developer OTP.", "danger");
      }
    },

    async changePassword() {
      const newPassword = this.root.querySelector("[data-profile-new-password]")?.value || "";
      const method = this.root.querySelector("[data-profile-change-password-method]")?.value || "password";
      const currentPassword = this.root.querySelector("[data-profile-current-password]")?.value || "";
      const accountOtp = this.root.querySelector("[data-profile-change-password-otp]")?.value?.trim() || "";
      const authorizerUsername = this.root.querySelector("[data-profile-authorizer-username]")?.value?.trim() || "";
      const authorizerOtp = this.root.querySelector("[data-profile-authorizer-otp]")?.value?.trim() || "";

      if (!newPassword) {
        this.setStatus("New password is required.", "danger");
        return;
      }

      if (method === "password" && !currentPassword) {
        this.setStatus("Old password is required.", "danger");
        return;
      }

      if (method === "otp" && (!this.otpTokens.changePassword || accountOtp.length !== 6)) {
        this.setStatus("Account OTP is required.", "danger");
        return;
      }

      if (!authorizerUsername || !this.otpTokens.authorizerApproval || authorizerOtp.length !== 6) {
        this.setStatus("Authorization username and OTP are required.", "danger");
        return;
      }

      try {
        const payload = await this.post("profileChangePassword", {
          account_id: this.currentUser.id,
          new_password: newPassword,
          password_verification_method: method,
          current_password: currentPassword,
          otp_token: this.otpTokens.changePassword,
          otp_code: accountOtp,
          authorizer_username: authorizerUsername,
          authorizer_otp_token: this.otpTokens.authorizerApproval,
          authorizer_otp_code: authorizerOtp
        });

        this.setStatus(payload.message || "Password changed.", "success");
        this.toast("Password changed", "Account password was updated.", "success");
        this.closeStackView();
      } catch (error) {
        this.setStatus(error.message || "Password change failed.", "danger");
      }
    },

    setChangePasswordMode(mode = "password") {
      const safe = mode === "otp" ? "otp" : "password";
      this.root.querySelectorAll("[data-profile-change-password-mode]").forEach((button) => {
        const active = button.dataset.profileChangePasswordMode === safe;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });

      this.root.querySelectorAll("[data-profile-change-password-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.profileChangePasswordPanel !== safe;
      });

      const hidden = this.root.querySelector("[data-profile-change-password-method]");
      if (hidden) hidden.value = safe;
    },

    clearChangePasswordForm() {
      [
        "[data-profile-new-password]",
        "[data-profile-current-password]",
        "[data-profile-authorizer-username]",
        "[data-profile-change-password-otp]",
        "[data-profile-authorizer-otp]"
      ].forEach((selector) => {
        const input = this.root.querySelector(selector);
        if (input) input.value = "";
      });

      this.root.querySelectorAll("[data-profile-otp-digit]").forEach((input) => {
        input.value = "";
      });

      this.otpTokens.changePassword = "";
      this.otpTokens.authorizerApproval = "";
      this.setStatus("Password form cleared.", "warning");
    },

    async requestPasswordAuthorizerOtp() {
      if (!this.currentUser?.id) {
        this.setStatus("Login is required.", "danger");
        return;
      }

      const authorizerUsername = this.root.querySelector("[data-profile-authorizer-username]")?.value?.trim() || "";
      const button = this.root.querySelector("[data-profile-request-authorizer-otp]");
      const lockKey = `self_authorizer_${this.currentUser.id}_${authorizerUsername}`;

      if (!authorizerUsername) {
        this.setStatus("Authorization username is required before sending OTP.", "danger");
        return;
      }

      if (this.isOtpRequestLocked(lockKey) || button?.dataset.otpBusy === "true") return;

      this.setOtpButtonBusy(button, true);
      this.setStatus("Sending authorization OTP...", "");

      try {
        const approvalMessage = `${this.currentUser?.name || "Requester"} @${this.currentUser?.username || "account"} has requested to change ${this.currentUser?.role || "ACCOUNT"}[${this.currentUser?.id || "?"}] ${this.currentUser?.name || this.currentUser?.username || "account"}'s password and requires your OTP.`;

        const payload = await this.post("authRequestOtp", {
          purpose: "password_authorization",
          username: authorizerUsername,
          approver_username: authorizerUsername,
          requested_by: this.currentUser?.id || null,
          requester_name: this.currentUser?.name || "",
          requester_username: this.currentUser?.username || "",
          target_id: this.currentUser?.id || "",
          target_account_id: this.currentUser?.id || "",
          target_role: this.currentUser?.role || "",
          target_name: this.currentUser?.name || "",
          target_username: this.currentUser?.username || "",
          approval_message: approvalMessage,
          theme: window.ElectriCreditApp?.currentTheme || null
        });

        this.otpTokens.authorizerApproval = payload.data?.otp_token || "";
        this.lockOtpButton(button, lockKey, this.getOtpCooldownSeconds(payload));
        this.setStatus("Authorization OTP request sent.", "success");
      } catch (error) {
        this.setOtpButtonBusy(button, false);
        this.setStatus(error.message || "Unable to send authorization OTP.", "danger");
      }
    },

    async updateProfile() {
      let links = [];

      try {
        links = JSON.parse(this.root.querySelector("[data-profile-edit-links]")?.value || "[]");
      } catch (_) {
        this.setStatus("Links must be valid JSON.", "danger");
        return;
      }

      const otpCode = this.root.querySelector("[data-profile-update-profile-otp]")?.value?.trim() || "";

      try {
        const payload = await this.put("profileUpdate", {
          account_id: this.currentUser.id,
          otp_token: this.otpTokens.updateProfile,
          otp_code: otpCode,
          name: this.root.querySelector("[data-profile-edit-name]")?.value?.trim() || "",
          username: this.root.querySelector("[data-profile-edit-username]")?.value?.trim() || "",
          birthdate: this.root.querySelector("[data-profile-edit-birthdate]")?.value || "",
          gender: this.root.querySelector("[data-profile-edit-gender]")?.value || "Other",
          emails: this.csv(this.root.querySelector("[data-profile-edit-emails]")?.value || ""),
          numbers: this.csv(this.root.querySelector("[data-profile-edit-numbers]")?.value || ""),
          image: this.root.querySelector("[data-profile-edit-image]")?.value?.trim() || "",
          links
        });

        const user = payload.data?.user || null;
        if (user) {
          this.currentUser = this.enrichProfileImage(user);
          this.saveLocalAuth(this.currentUser);
        }

        this.setStatus(payload.message || "Profile updated.", "success");
        this.toast("Profile updated", "Your profile changes were saved.", "success");
        this.render();
      } catch (error) {
        this.setStatus(error.message || "Profile update failed.", "danger");
      }
    },

    async loadManageAccounts(role) {
      const grid = this.root.querySelector("[data-profile-people-grid]");
      if (!grid) return;

      const safeRole = String(role || this.currentManageRole || "ADMINISTRATOR").toUpperCase();
      this.currentManageRole = safeRole;
      grid.innerHTML = window.ProfileStructure.renderLoadingPeople();

      try {
        const payload = await this.get("superusers", { role: safeRole });
        const data = payload.data || payload;
        const people = this.unwrapPeopleList(data)
          .filter((person) => String(person.role || "").toUpperCase() === safeRole);

        if (!people.length) {
          grid.innerHTML = window.ProfileStructure.renderEmptyPeople(safeRole);
          return;
        }

        this.peopleCache = this.peopleCache || {};
        const enrichedPeople = people.map((person) => this.enrichProfileImage(person));

        enrichedPeople.forEach((person) => {
          this.peopleCache[String(person.id)] = person;
        });

        grid.innerHTML = enrichedPeople
          .map((person) => window.ProfileStructure.renderPeopleCard(person))
          .join("");

        this.setStatus(`${safeRole} records loaded.`, "success");
      } catch (error) {
        grid.innerHTML = window.ProfileStructure.renderEmptyPeople(safeRole);
        this.setStatus(error.message || "Unable to load accounts.", "danger");
      }
    },

    unwrapPeopleList(data) {
      if (Array.isArray(data)) return data;
      if (!data || typeof data !== "object") return [];
      if (Array.isArray(data.items)) return data.items;
      if (Array.isArray(data.rows)) return data.rows;
      if (Array.isArray(data.superusers)) return data.superusers;
      if (Array.isArray(data.administrators)) return data.administrators;
      if (Array.isArray(data.owners)) return data.owners;
      if (Array.isArray(data.developers)) return data.developers;
      if (data.data) return this.unwrapPeopleList(data.data);
      return [];
    },

    async addAccount(role) {
      try {
        const payload = await this.post("superuserCreate", {
          actor_id: this.currentUser.id,
          role,
          name: this.root.querySelector("[data-add-name]")?.value?.trim() || "",
          username: this.root.querySelector("[data-add-username]")?.value?.trim() || "",
          password: this.root.querySelector("[data-add-password]")?.value || "",
          birthdate: this.root.querySelector("[data-add-birthdate]")?.value || "2000-01-01",
          gender: this.root.querySelector("[data-add-gender]")?.value || "Other",
          emails: this.csv(this.root.querySelector("[data-add-emails]")?.value || ""),
          numbers: this.csv(this.root.querySelector("[data-add-numbers]")?.value || ""),
          image: this.root.querySelector("[data-add-image]")?.value?.trim() || "",
          links: []
        });

        this.toast("Account created", payload.message || `${role} account added.`, "success");
        await this.showPanel(role === "OWNER" ? "manage-owners" : "manage-admins");
      } catch (error) {
        this.setStatus(error.message || "Unable to add account.", "danger");
      }
    },

    async showEditAccount(targetId) {
      let person = this.peopleCache?.[String(targetId)];

      if (!person) {
        try {
          const payload = await this.get("superuserDetail", { id: targetId });
          const data = payload.data || payload;
          person = data.item || data.person || data.account || data.superuser || data;
          if (person?.id) {
            person = this.enrichProfileImage(person);
            this.peopleCache[String(person.id)] = person;
          }
        } catch (_) {}
      }

      if (!person || !person.id) {
        this.setStatus("Account data is not loaded. Refresh the list first.", "danger");
        return;
      }

      this.openStackView(window.ProfileStructure.renderEditManagedAccountForm(person, this.currentUser));
      this.setManagedPasswordMode("password");
    },

    async requestManagedUpdateOtp(targetId, purpose = "update_profile") {
      if (!targetId) return;

      const button = this.root.querySelector(
        purpose === "managed_password_target"
          ? `[data-profile-request-managed-password-otp="${CSS.escape(String(targetId))}"]`
          : `[data-profile-request-managed-otp="${CSS.escape(String(targetId))}"]`
      );

      const lockKey = `managed_${purpose}_${targetId}`;
      if (this.isOtpRequestLocked(lockKey) || button?.dataset.otpBusy === "true") return;

      this.setOtpButtonBusy(button, true);

      try {
        const person = this.peopleCache?.[String(targetId)] || {};
        const payload = await this.post("authRequestOtp", {
          account_id: targetId,
          username: person.username || "",
          purpose,
          requested_by: this.currentUser?.id || null,
          requester_name: this.currentUser?.name || "",
          requester_username: this.currentUser?.username || "",
          target_name: person.name || "",
          target_username: person.username || "",
          theme: window.ElectriCreditApp?.currentTheme || null
        });

        this.managedOtpTokens[String(targetId)] = payload.data?.otp_token || "";
        this.lockOtpButton(button, lockKey, this.getOtpCooldownSeconds(payload));
        this.setStatus("OTP request sent. Check the registered email.", "success");
      } catch (error) {
        this.setOtpButtonBusy(button, false);
        this.setStatus(error.message || "Unable to send update OTP.", "danger");
      }
    },

    async requestManagedApproverOtp(targetId) {
      const person = this.peopleCache?.[String(targetId)] || {};
      const approverUsername = this.root.querySelector("[data-managed-approver-username]")?.value?.trim() || "";
      const button = this.root.querySelector(`[data-profile-request-managed-approver-otp="${CSS.escape(String(targetId))}"]`);
      const lockKey = `managed_approver_${targetId}_${approverUsername}`;

      if (!targetId) return;
      if (!approverUsername) {
        this.setStatus("Approver username is required before requesting OTP.", "danger");
        return;
      }

      if (this.isOtpRequestLocked(lockKey) || button?.dataset.otpBusy === "true") return;

      this.setOtpButtonBusy(button, true);

      try {
        const approvalMessage = `${this.currentUser?.name || "Requester"} @${this.currentUser?.username || "account"} has requested to change ${person.role || "ACCOUNT"}[${targetId}] ${person.name || person.username || "account"}'s password and requires your OTP.`;

        const payload = await this.post("authRequestOtp", {
          account_id: targetId,
          username: approverUsername,
          approver_username: approverUsername,
          purpose: "managed_password_approval",
          requested_by: this.currentUser?.id || null,
          requester_name: this.currentUser?.name || "",
          requester_username: this.currentUser?.username || "",
          target_id: targetId,
          target_role: person.role || "",
          target_name: person.name || "",
          target_username: person.username || "",
          approval_message: approvalMessage,
          theme: window.ElectriCreditApp?.currentTheme || null
        });

        this.managedOtpTokens[`approver_${targetId}`] = payload.data?.otp_token || "";
        this.managedOtpTokens[`approver:${targetId}`] = payload.data?.otp_token || "";
        this.lockOtpButton(button, lockKey, this.getOtpCooldownSeconds(payload));
        this.setStatus("Authorization OTP request sent.", "success");
      } catch (error) {
        this.setOtpButtonBusy(button, false);
        this.setStatus(error.message || "Unable to send authorization OTP.", "danger");
      }
    },

    setManagedPasswordMode(mode = "password") {
      const safe = mode === "otp" ? "otp" : "password";
      this.root.querySelectorAll("[data-managed-password-mode]").forEach((button) => {
        const active = button.dataset.managedPasswordMode === safe;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });

      const passwordPanel = this.root.querySelector("[data-managed-password-panel='password']");
      const otpPanel = this.root.querySelector("[data-managed-password-panel='otp']");
      if (passwordPanel) passwordPanel.hidden = safe !== "password";
      if (otpPanel) otpPanel.hidden = safe !== "otp";

      const hidden = this.root.querySelector("[data-managed-password-method]");
      if (hidden) hidden.value = safe;
    },

    async updateManagedAccount(targetId, role) {
      const target = this.peopleCache?.[String(targetId)] || {};
      const linkInput = this.root.querySelector("[data-managed-links]");
      const linkText = linkInput?.value || "[]";
      let links = null;
      let linksValid = true;

      try {
        links = JSON.parse(linkText || "[]");
        if (!Array.isArray(links) && (!links || typeof links !== "object")) {
          throw new Error("Links JSON must be an array or object.");
        }
      } catch (_) {
        linksValid = false;
        this.setStatus("Links JSON is invalid. Link changes will be ignored; other edits will continue.", "warning");
      }

      try {
        const url = this.route("superuserUpdate", targetId);
        const body = {
          actor_id: this.currentUser.id,
          target_id: targetId,
          otp_token: this.managedOtpTokens[String(targetId)] || "",
          otp_code: this.root.querySelector("[data-managed-otp]")?.value?.trim() || "",
          name: this.root.querySelector("[data-managed-name]")?.value?.trim() || "",
          username: this.root.querySelector("[data-managed-username]")?.value?.trim() || "",
          birthdate: this.root.querySelector("[data-managed-birthdate]")?.value || "",
          gender: this.root.querySelector("[data-managed-gender]")?.value || "Other",
          emails: this.csv(this.root.querySelector("[data-managed-emails]")?.value || ""),
          numbers: this.csv(this.root.querySelector("[data-managed-numbers]")?.value || ""),
          image: this.root.querySelector("[data-managed-image]")?.value?.trim() || ""
        };

        if (linksValid) body.links = links;

        const newPassword = this.root.querySelector("[data-managed-new-password]")?.value || "";
        if (newPassword) {
          const passwordMethod = this.root.querySelector("[data-managed-password-method]")?.value || "password";
          body.new_password = newPassword;
          body.password_change_requested = true;
          body.password_verification_method = passwordMethod;
          body.target_current_password = this.root.querySelector("[data-managed-current-password]")?.value || "";
          body.target_otp_token = this.managedOtpTokens[String(targetId)] || "";
          body.target_otp_code = this.root.querySelector("[data-managed-password-otp]")?.value?.trim() || "";
          body.approver_username = this.root.querySelector("[data-managed-approver-username]")?.value?.trim() || "";
          body.approver_otp_token = this.managedOtpTokens[`approver:${targetId}`] || "";
          body.approver_otp_code = this.root.querySelector("[data-managed-approver-otp]")?.value?.trim() || "";
          body.password_target_role = target.role || role || "";
        }

        const payload = await this.requestJson(url, {
          method: "PUT",
          body: JSON.stringify(body)
        });

        this.toast("Account updated", payload.message || "Account updated successfully.", "success");
        this.closeStackView();
        await this.loadManageAccounts(this.currentManageRole || role);
      } catch (error) {
        this.setStatus(error.message || "Unable to update account.", "danger");
      }
    },

    async removeAccount(targetId, role) {
      if (!targetId) return;

      const person = this.peopleCache?.[String(targetId)] || {
        id: targetId,
        role,
        name: `${role || "Account"}[${targetId}]`
      };

      this.pendingRemove = {
        targetId,
        role,
        code: this.randomString(16)
      };

      this.openStackView(
        window.ProfileStructure.renderRemoveAccountConfirm(person, this.pendingRemove.code)
      );
    },

    async confirmRemoveAccount(targetId, role) {
      if (!targetId || !this.pendingRemove) return;

      const typedCode = this.root.querySelector("[data-remove-confirm-code]")?.value?.trim() || "";

      if (typedCode !== this.pendingRemove.code) {
        this.setStatus("Confirmation code does not match.", "danger");
        return;
      }

      const body = {
        actor_id: this.currentUser.id
      };

      if (String(role).toUpperCase() === "OWNER") {
        body.otp_token = this.otpTokens.removeOwner;
        body.otp_code = this.root.querySelector("[data-remove-owner-otp]")?.value?.trim() || "";

        if (!body.otp_code) {
          this.setStatus("Owner removal OTP is required.", "danger");
          return;
        }
      }

      try {
        const url = this.route("superuserDelete", targetId);
        const payload = await this.requestJson(url, {
          method: "DELETE",
          body: JSON.stringify(body)
        });

        this.toast("Account removed", payload.message || "Account removed successfully.", "success");
        this.pendingRemove = null;
        this.closeStackView();
        await this.loadManageAccounts(this.currentManageRole || role);
      } catch (error) {
        this.setStatus(error.message || "Unable to remove account.", "danger");
      }
    },

    randomString(length = 16) {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
      let output = "";

      if (window.crypto && crypto.getRandomValues) {
        crypto.getRandomValues(new Uint32Array(length)).forEach((value) => {
          output += chars[value % chars.length];
        });
        return output;
      }

      for (let i = 0; i < length; i += 1) {
        output += chars[Math.floor(Math.random() * chars.length)];
      }
      return output;
    },

    enrichProfileImage(person) {
      if (!person || typeof person !== "object") return person;

      const output = { ...person };

      if (output.image && String(output.image).trim()) {
        return output;
      }

      const role = String(output.role || "").toUpperCase();
      const normalizedName = this.normalizeName(output.name || "");

      if (role === "DEVELOPER" && DEVELOPER_IMAGE_MAP[normalizedName]) {
        output.image = DEVELOPER_IMAGE_MAP[normalizedName];
        return output;
      }

      output.image = DEFAULT_IMAGE;
      return output;
    },

    normalizeName(value) {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ñ/g, "n")
        .replace(/Ñ/g, "n")
        .toLowerCase()
        .replace(/[^a-z0-9. ]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    },

    loadLocalAuth() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.auth);
        this.currentUser = raw ? this.enrichProfileImage(JSON.parse(raw)) : null;
      } catch (_) {
        this.currentUser = null;
      }
    },

    saveLocalAuth(user) {
      try {
        localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(user));
      } catch (_) {}
    },

    syncGlobalAuth() {
      if (this.app && typeof this.app.setCurrentUser === "function") {
        this.app.setCurrentUser(this.currentUser);
      } else {
        window.ElectriCreditApp = window.ElectriCreditApp || {};
        window.ElectriCreditApp.currentUser = this.currentUser;
      }

      window.dispatchEvent(
        new CustomEvent("electricredit:auth-change", {
          detail: {
            user: this.currentUser
          }
        })
      );

      try {
        if (
          window.HeaderController &&
          typeof window.HeaderController.syncAuthState === "function"
        ) {
          window.HeaderController.syncAuthState();
        }
      } catch (error) {
        console.warn("Header auth sync skipped:", error);
      }
    },

    setStatus(message, type = "") {
      if (!this.status) return;

      this.status.textContent = message;
      this.status.classList.remove("is-success", "is-warning", "is-danger");

      if (type === "success") this.status.classList.add("is-success");
      if (type === "warning") this.status.classList.add("is-warning");
      if (type === "danger") this.status.classList.add("is-danger");
    },

    route(name, ...args) {
      if (this.app && typeof this.app.route === "function") {
        return this.app.route(name, ...args);
      }

      if (window.ElectriCreditRoute && typeof window.ElectriCreditRoute === "function") {
        return window.ElectriCreditRoute(name, ...args);
      }

      const target = window.ElectriCreditRoutes?.[name];
      if (typeof target === "function") return target(...args);
      if (typeof target === "string") return target;

      const fallback = {
        authLogin: "/api/auth/login",
        authMe: "/api/auth/me",
        authRequestOtp: "/api/auth/request-otp",
        profileUpdate: "/api/profile/update",
        profileChangePassword: "/api/profile/change-password",
        superusers: "/api/superusers",
        superuserCreate: "/api/superusers",
        superuserDetail: (id) => `/api/superusers/${encodeURIComponent(id)}`,
        superuserUpdate: (id) => `/api/superusers/${encodeURIComponent(id)}`,
        superuserDelete: (id) => `/api/superusers/${encodeURIComponent(id)}`
      };

      const item = fallback[name];
      if (typeof item === "function") return item(...args);
      if (typeof item === "string") return item;

      return name;
    },

    async requestJson(url, options = {}) {
      const config = Object.assign(
        {
          headers: {
            "Content-Type": "application/json"
          },
          cache: "no-store"
        },
        options
      );

      const response = await fetch(url, config);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.status === "error") {
        throw new Error(payload.message || `Request failed (${response.status}).`);
      }

      return payload;
    },

    async get(routeName, params = {}) {
      let url = this.route(routeName);

      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          query.set(key, value);
        }
      });

      if (query.toString()) {
        url += `?${query.toString()}`;
      }

      return this.requestJson(url, {
        method: "GET"
      });
    },

    async post(routeName, body = {}) {
      return this.requestJson(this.route(routeName), {
        method: "POST",
        body: JSON.stringify(body)
      });
    },

    async put(routeName, body = {}) {
      return this.requestJson(this.route(routeName), {
        method: "PUT",
        body: JSON.stringify(body)
      });
    },

    csv(value) {
      return String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    },

    toast(title, message, type = "info") {
      if (this.app && typeof this.app.toast === "function") {
        this.app.toast(title, message, type);
        return;
      }

      console.log(`[${type}] ${title}: ${message}`);
    }
  };

  window.ProfileController = ProfileController;
  window.ElectriCreditProfile = ProfileController;

  document.addEventListener("DOMContentLoaded", () => {
    ProfileController.init({
      app: window.ElectriCredit || null
    });
  });
})();
