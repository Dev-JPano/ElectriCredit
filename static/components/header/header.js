/* =========================================================
   ELECTRICREDIT V2 - HEADER CONTROLLER
   File: static/components/header/header.js
   Purpose:
   - Inject header design
   - Render header structure
   - Bind desktop/mobile navigation
   - Bind CTA hooks
   - Respect Software disabled state
   ========================================================= */

(function () {
  "use strict";

  const HeaderController = {
    root: null,
    app: null,
    isMobileOpen: false,

    async init(context = {}) {
      this.root = context.root || document.getElementById("header-root");
      this.app = context.app || window.ElectriCredit;

      if (!this.root) {
        console.warn("Header root not found.");
        return;
      }

      if (!window.HeaderStructure || !window.HeaderDesign) {
        console.warn("HeaderStructure or HeaderDesign is missing.");
        return;
      }

      window.HeaderDesign.inject();

      this.root.innerHTML = window.HeaderStructure.render();

      this.bindEvents();
      this.syncAuthState();
      this.syncActiveByHash();
    },

    bindEvents() {
      this.root.addEventListener("click", (event) => {
        const navLink = event.target.closest("[data-header-nav-link]");
        if (navLink) {
          this.handleNavClick(event, navLink);
          return;
        }

        const openMobile = event.target.closest("[data-header-mobile-open]");
        if (openMobile) {
          this.openMobileMenu();
          return;
        }

        const closeMobile = event.target.closest("[data-header-mobile-close]");
        if (closeMobile) {
          this.closeMobileMenu();
          return;
        }

        const chatbotBtn = event.target.closest("[data-chatbot-open]");
        if (chatbotBtn) {
          this.openChatbot();
          return;
        }

        const themeBtn = event.target.closest("[data-theme-open]");
        if (themeBtn) {
          this.openTheme();
          return;
        }

        const profileBtn = event.target.closest("[data-profile-open]");
        if (profileBtn) {
          this.openProfile();
        }
      });

      document.addEventListener("click", (event) => {
        const panel = document.querySelector("[data-header-mobile-panel]");
        if (!panel || panel.hidden) return;

        const clickedInsidePanel = event.target.closest(".ec-header-mobile-card");
        const clickedOpenButton = event.target.closest("[data-header-mobile-open]");

        if (!clickedInsidePanel && !clickedOpenButton) {
          this.closeMobileMenu();
        }
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          this.closeMobileMenu();
        }
      });

      window.addEventListener("hashchange", () => {
        this.syncActiveByHash();
      });

      window.addEventListener("storage", () => {
        this.syncAuthState();
      });

      window.addEventListener("electricredit:auth-change", () => {
        this.syncAuthState();
      });
    },

    handleNavClick(event, navLink) {
      event.preventDefault();

      const sectionId = navLink.dataset.sectionTarget;

      if (sectionId === "software" && !this.isLoggedIn()) {
        this.notify(
          "Login required",
          "Software tools are available after an authorized superuser logs in.",
          "warning"
        );
        return;
      }

      this.closeMobileMenu();

      if (this.app && typeof this.app.scrollToSection === "function") {
        this.app.scrollToSection(sectionId);
      } else {
        const target = document.getElementById(`${sectionId}-section`);
        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
          history.replaceState(null, "", `#${sectionId}`);
        }
      }

      this.setActive(sectionId);
    },

    openMobileMenu() {
      const panel = document.querySelector("[data-header-mobile-panel]");
      const openBtn = this.root.querySelector("[data-header-mobile-open]");

      if (!panel) return;

      panel.hidden = false;
      this.isMobileOpen = true;

      if (openBtn) {
        openBtn.setAttribute("aria-expanded", "true");
      }

      document.body.classList.add("ec-modal-open");
      this.syncAuthState();
    },

    closeMobileMenu() {
      const panel = document.querySelector("[data-header-mobile-panel]");
      const openBtn = this.root.querySelector("[data-header-mobile-open]");

      if (!panel) return;

      panel.hidden = true;
      this.isMobileOpen = false;

      if (openBtn) {
        openBtn.setAttribute("aria-expanded", "false");
      }

      document.body.classList.remove("ec-modal-open");
    },

    openChatbot() {
      const event = new CustomEvent("electricredit:chatbot-open");
      window.dispatchEvent(event);

      if (!event.defaultPrevented) {
        this.fallbackModal(
          "ElectriCredit Chatbot",
          `
            <div class="grid gap-4">
              <p class="ec-muted leading-relaxed">
                Chatbot component is not mounted yet. Later, this will open a Messenger-style chat panel.
              </p>
              <div class="ec-panel">
                <strong>Local-first rule</strong>
                <p class="ec-muted mt-2">
                  Conversations should be stored only on the user device/browser, not in the server database.
                </p>
              </div>
            </div>
          `
        );
      }
    },

    openTheme() {
      const event = new CustomEvent("electricredit:theme-open");
      window.dispatchEvent(event);

      if (!event.defaultPrevented) {
        this.fallbackModal(
          "Theme",
          `
            <div class="grid gap-4">
              <p class="ec-muted leading-relaxed">
                Theme component is not mounted yet. Later, this will open the theme selector modal.
              </p>
              <button class="ec-btn ec-btn-primary" type="button" data-header-apply-default-theme>
                Use Electric Default
              </button>
            </div>
          `
        );

        document
          .querySelector("[data-header-apply-default-theme]")
          ?.addEventListener("click", () => {
            if (this.app && typeof this.app.applyTheme === "function") {
              this.app.applyTheme({
                id: 1,
                name: "Electric Default",
                primary: "#38bdf8",
                secondary: "#22c55e",
                warning: "#f59e0b",
                danger: "#ef4444",
                bg1: "#020617",
                bg2: "#0f172a",
                txtforbg1: "#f8fafc",
                txtforbg2: "#cbd5e1",
                txtforprimary: "#021018",
                txtforsecondary: "#02140a"
              });

              this.notify("Theme applied", "Electric Default is active.", "success");
            }
          });
      }
    },

    openProfile() {
      const event = new CustomEvent("electricredit:profile-open");
      window.dispatchEvent(event);

      if (!event.defaultPrevented) {
        const user = this.getCurrentUser();

        if (user) {
          this.fallbackModal(
            "Profile",
            `
              <div class="grid gap-4">
                <div class="ec-panel">
                  <strong>${this.escape(user.name || "Current User")}</strong>
                  <p class="ec-muted mt-1">${this.escape(user.role || "VISITOR")}</p>
                </div>

                <p class="ec-muted">
                  Full profile component will be mounted later.
                </p>
              </div>
            `
          );
        } else {
          this.fallbackModal(
            "Profile Login",
            `
              <div class="grid gap-4">
                <p class="ec-muted leading-relaxed">
                  Login component is not mounted yet. Later, this will support username/password and OTP.
                </p>

                <div class="ec-panel">
                  <strong>Software access</strong>
                  <p class="ec-muted mt-2">
                    Software is disabled until an Administrator, Owner, or Developer logs in.
                  </p>
                </div>
              </div>
            `
          );
        }
      }
    },

    fallbackModal(title, body) {
      if (this.app && typeof this.app.openModal === "function") {
        this.app.openModal({
          title,
          body
        });
        return;
      }

      alert(title);
    },

    syncAuthState() {
      const loggedIn = this.isLoggedIn();

      this.root
        .querySelectorAll("[data-software-link]")
        .forEach((link) => {
          link.classList.toggle("is-disabled", !loggedIn);
          link.setAttribute("aria-disabled", String(!loggedIn));

          if (!loggedIn) {
            link.setAttribute("tabindex", "-1");
          } else {
            link.removeAttribute("tabindex");
          }
        });

      const profileButtons = this.root.querySelectorAll("[data-profile-button], [data-profile-open]");
      const user = this.getCurrentUser();

      profileButtons.forEach((button) => {
        button.classList.toggle("is-logged-in", Boolean(user));

        if (user && user.image) {
          button.innerHTML = `
            <img src="${this.escape(user.image)}" alt="Profile" />
          `;
        } else if (user && user.name) {
          const initials = String(user.name)
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((word) => word[0]?.toUpperCase() || "")
            .join("");

          button.innerHTML = `
            <span class="ec-header-profile-initials">${this.escape(initials || String(user.role || "U")[0])}</span>
          `;
        } else if (user && user.role) {
          button.innerHTML = `
            <span class="ec-header-profile-initials">${this.escape(String(user.role)[0])}</span>
          `;
        } else {
          button.innerHTML = `
            <svg class="ec-header-svg-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 21a8 8 0 0 0-16 0" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
              <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.9"/>
            </svg>
          `;
        }
      });
    },

    syncActiveByHash() {
      const hash = window.location.hash.replace("#", "").trim();

      if (hash) {
        this.setActive(hash);
        return;
      }

      this.setActive("home");
    },

    setActive(sectionId) {
      this.root.querySelectorAll("[data-header-nav-link]").forEach((link) => {
        link.classList.toggle("is-active", link.dataset.sectionTarget === sectionId);
      });
    },

    isLoggedIn() {
      if (this.app && typeof this.app.isLoggedIn === "function") {
        return this.app.isLoggedIn();
      }

      return Boolean(this.getCurrentUser());
    },

    getCurrentUser() {
      if (window.ElectriCreditApp && window.ElectriCreditApp.currentUser) {
        return window.ElectriCreditApp.currentUser;
      }

      try {
        const raw = localStorage.getItem("electricredit.auth");
        return raw ? JSON.parse(raw) : null;
      } catch (_) {
        return null;
      }
    },

    notify(title, message, type = "info") {
      if (this.app && typeof this.app.toast === "function") {
        this.app.toast(title, message, type);
        return;
      }

      console.log(`[${type}] ${title}: ${message}`);
    },

    escape(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }
  };

  window.HeaderController = HeaderController;
  window.ElectriCreditHeader = HeaderController;
})();