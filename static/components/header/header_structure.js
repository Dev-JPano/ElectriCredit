/* =========================================================
   ELECTRICREDIT V2 - HEADER STRUCTURE
   File: static/components/header/header_structure.js
   Purpose: Header HTML structure/template
   ========================================================= */

(function () {
  "use strict";

  const NAV_ITEMS = [
    {
      id: "home",
      label: "Home",
      public: true
    },
    {
      id: "dashboard",
      label: "Dashboard",
      public: true
    },
    {
      id: "hardware",
      label: "Hardware",
      public: true
    },
    {
      id: "peopleware",
      label: "Peopleware",
      public: true
    },
    {
      id: "software",
      label: "Software",
      public: false,
      disabledWhenLoggedOut: true
    },
    {
      id: "about",
      label: "About",
      public: true
    }
  ];

  function renderNavLink(item, options = {}) {
    const isMobile = Boolean(options.mobile);
    const extraClass = isMobile ? "ec-header-mobile-link" : "ec-header-nav-link";
    const softwareAttr = item.id === "software" ? "data-software-link" : "";

    return `
      <a
        href="#${item.id}"
        class="${extraClass}"
        data-header-nav-link
        data-nav-link
        data-section-target="${item.id}"
        ${softwareAttr}
      >
        <span>${item.label}</span>
      </a>
    `;
  }

  function renderDesktopNav() {
    return `
      <nav class="ec-header-nav" aria-label="Main navigation">
        ${NAV_ITEMS.map((item) => renderNavLink(item)).join("")}
      </nav>
    `;
  }

  function renderMobileNav() {
    return `
      <div
        id="ec-header-mobile-panel"
        class="ec-header-mobile-panel"
        data-header-mobile-panel
        hidden
      >
        <div class="ec-header-mobile-card">
          <div class="ec-header-mobile-card-head">
            <div>
              <strong>ElectriCredit</strong>
              <p>Navigate system sections</p>
            </div>

            <button
              class="ec-icon-btn"
              type="button"
              data-header-mobile-close
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          <nav class="ec-header-mobile-nav" aria-label="Mobile navigation">
            ${NAV_ITEMS.map((item) => renderNavLink(item, { mobile: true })).join("")}
          </nav>
        </div>
      </div>
    `;
  }

  function render() {
    return `
      <div class="ec-header" data-header>
        <div class="ec-header-inner">
          <button
            class="ec-icon-btn ec-header-menu-btn"
            type="button"
            data-header-mobile-open
            aria-label="Open navigation menu"
            aria-expanded="false"
          >
            <span class="ec-header-menu-lines" aria-hidden="true">
              <i></i>
              <i></i>
              <i></i>
            </span>
          </button>

          <a href="#home" class="ec-brand ec-header-brand" data-header-brand aria-label="ElectriCredit Home">
            <span class="ec-brand-mark ec-header-brand-mark" aria-hidden="true">
              ⚡
            </span>

            <span class="ec-header-brand-text">
              ElectriCredit
            </span>
          </a>

          ${renderDesktopNav()}

          <div class="ec-header-actions" aria-label="Header actions">
            <button
              class="ec-icon-btn ec-header-action"
              type="button"
              data-theme-open
              aria-label="Open theme selector"
              title="Theme"
            >
              <svg class="ec-header-svg-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3a9 9 0 0 0 0 18h.9a1.6 1.6 0 0 0 .8-3 1.8 1.8 0 0 1 .9-3.4H16a5 5 0 0 0 0-10H12Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="7.5" cy="10" r="1" fill="currentColor"/>
                <circle cx="10" cy="7.5" r="1" fill="currentColor"/>
                <circle cx="14" cy="7.8" r="1" fill="currentColor"/>
                <circle cx="6.8" cy="14" r="1" fill="currentColor"/>
              </svg>
            </button>

            <button
              class="ec-icon-btn ec-header-action ec-header-profile-btn"
              type="button"
              data-profile-button
              data-profile-open
              aria-label="Open profile"
              title="Profile"
            >
              <svg class="ec-header-svg-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 21a8 8 0 0 0-16 0" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
                <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.9"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="ec-scroll-progress" aria-hidden="true">
          <div class="ec-scroll-progress-bar" data-scroll-progress></div>
        </div>
      </div>

      ${renderMobileNav()}
    `;
  }

  window.HeaderStructure = {
    NAV_ITEMS,
    render
  };
})();