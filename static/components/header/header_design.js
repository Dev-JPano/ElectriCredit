/* =========================================================
   ELECTRICREDIT V2 - HEADER DESIGN
   File: static/components/header/header_design.js
   Purpose: Inject header-only CSS
   ========================================================= */

(function () {
  "use strict";

  const STYLE_ID = "electricredit-header-design";

  function inject() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      /* =====================================================
         HEADER COMPONENT DESIGN
         ===================================================== */

      #header-root {
        position: sticky;
        top: 0;
        z-index: 90;
      }

      .ec-header {
        position: sticky;
        top: 0;
        z-index: 90;
        min-height: var(--ec-header-height);
        border-bottom: 1px solid var(--ec-border);
        background:
          linear-gradient(
            180deg,
            color-mix(in srgb, var(--ec-bg1) 90%, transparent),
            color-mix(in srgb, var(--ec-bg1) 76%, transparent)
          );
        box-shadow:
          0 18px 52px rgba(0, 0, 0, 0.24),
          inset 0 1px 0 rgba(255, 255, 255, 0.045);
        backdrop-filter: blur(22px);
        -webkit-backdrop-filter: blur(22px);
      }

      .ec-header-inner {
        width: min(100%, var(--ec-page-width));
        min-height: var(--ec-header-height);
        margin: 0 auto;
        padding: 0.72rem 0.82rem;
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 0.7rem;
      }

      .ec-header-brand {
        justify-self: start;
        min-width: 0;
      }

      .ec-header-brand-mark {
        position: relative;
        overflow: hidden;
      }

      .ec-header-brand-mark::after {
        content: "";
        position: absolute;
        inset: -45%;
        background:
          linear-gradient(
            120deg,
            transparent 0%,
            rgba(255, 255, 255, 0.55) 45%,
            transparent 72%
          );
        transform: translateX(-80%) rotate(18deg);
        animation: ecHeaderBrandShine 4s ease-in-out infinite;
      }

      .ec-header-brand-text {
        display: inline-block;
        max-width: 48vw;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ec-header-menu-btn {
        display: inline-grid;
      }

      .ec-header-menu-lines {
        width: 1.1rem;
        display: grid;
        gap: 0.22rem;
      }

      .ec-header-menu-lines i {
        display: block;
        height: 2px;
        border-radius: 999px;
        background: currentColor;
      }

      .ec-header-nav {
        display: none;
        justify-self: center;
        align-items: center;
        gap: 0.18rem;
        padding: 0.22rem;
        border: 1px solid color-mix(in srgb, var(--ec-border) 82%, transparent);
        border-radius: var(--ec-radius-full);
        background:
          linear-gradient(
            145deg,
            color-mix(in srgb, var(--ec-card) 68%, transparent),
            color-mix(in srgb, var(--ec-bg2) 54%, transparent)
          );
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.045),
          0 12px 34px rgba(0, 0, 0, 0.14);
      }

      .ec-header-nav-link {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 2.42rem;
        padding: 0 0.82rem;
        border-radius: var(--ec-radius-full);
        color: var(--ec-txtforbg2);
        font-size: 0.86rem;
        font-weight: 850;
        white-space: nowrap;
        transition:
          color var(--ec-transition),
          background var(--ec-transition),
          box-shadow var(--ec-transition),
          transform var(--ec-transition-fast);
      }

      .ec-header-nav-link::before {
        content: "";
        position: absolute;
        left: 50%;
        bottom: 0.35rem;
        width: 0;
        height: 2px;
        border-radius: 999px;
        background:
          linear-gradient(
            90deg,
            var(--ec-primary),
            var(--ec-secondary)
          );
        transform: translateX(-50%);
        transition: width var(--ec-transition);
      }

      .ec-header-nav-link:hover,
      .ec-header-nav-link.is-active {
        color: var(--ec-txtforbg1);
        background: color-mix(in srgb, var(--ec-primary) 12%, transparent);
      }

      .ec-header-nav-link:hover::before,
      .ec-header-nav-link.is-active::before {
        width: 42%;
      }

      .ec-header-nav-link:active {
        transform: scale(0.97);
      }

      .ec-header-nav-link.is-disabled,
      .ec-header-mobile-link.is-disabled {
        opacity: 0.42;
        pointer-events: auto;
        filter: grayscale(0.3);
      }

      .ec-header-actions {
        justify-self: end;
        display: inline-flex;
        align-items: center;
        gap: 0.38rem;
      }

      .ec-header-action {
        position: relative;
      }

      .ec-header-action::after {
        content: "";
        position: absolute;
        inset: 0.34rem;
        border-radius: inherit;
        background: color-mix(in srgb, var(--ec-primary) 18%, transparent);
        opacity: 0;
        transform: scale(0.72);
        transition:
          opacity var(--ec-transition),
          transform var(--ec-transition);
        z-index: -1;
      }

      .ec-header-action:hover::after {
        opacity: 1;
        transform: scale(1);
      }


      .ec-header-svg-icon {
        width: 1.18rem;
        height: 1.18rem;
        display: block;
      }

      .ec-header-profile-initials {
        display: grid;
        place-items: center;
        width: 100%;
        height: 100%;
        font-size: 0.72rem;
        font-weight: 950;
        letter-spacing: -0.03em;
      }

      .ec-header-profile-btn {
        overflow: hidden;
      }

      .ec-header-profile-btn img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: inherit;
      }

      /* =====================================================
         MOBILE MENU
         ===================================================== */

      .ec-header-mobile-panel {
        position: fixed;
        inset: 0;
        z-index: 130;
        padding: 0.85rem;
        background: rgba(2, 6, 23, 0.72);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        animation: ecHeaderFadeIn 180ms ease both;
      }

      .ec-header-mobile-panel[hidden] {
        display: none;
      }

      .ec-header-mobile-card {
        width: min(100%, 460px);
        max-height: calc(100vh - 1.7rem);
        overflow: auto;
        border: 1px solid var(--ec-border);
        border-radius: var(--ec-radius-2xl);
        background:
          linear-gradient(
            145deg,
            color-mix(in srgb, var(--ec-surface-strong) 96%, transparent),
            color-mix(in srgb, var(--ec-bg2) 92%, transparent)
          );
        box-shadow:
          0 34px 120px rgba(0, 0, 0, 0.58),
          inset 0 1px 0 rgba(255, 255, 255, 0.065);
        animation: ecHeaderMobileIn 240ms ease both;
      }

      .ec-header-mobile-card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem;
        border-bottom: 1px solid var(--ec-border);
      }

      .ec-header-mobile-card-head strong {
        display: block;
        color: var(--ec-txtforbg1);
        font-size: 1.15rem;
        font-weight: 950;
        letter-spacing: -0.04em;
      }

      .ec-header-mobile-card-head p {
        margin: 0.2rem 0 0;
        color: var(--ec-txtforbg2);
        font-size: 0.86rem;
      }

      .ec-header-mobile-nav {
        display: grid;
        gap: 0.6rem;
        padding: 1rem;
      }

      .ec-header-mobile-link {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 3.25rem;
        padding: 0 1rem;
        border: 1px solid var(--ec-border);
        border-radius: var(--ec-radius-lg);
        background:
          linear-gradient(
            145deg,
            color-mix(in srgb, var(--ec-card) 86%, transparent),
            color-mix(in srgb, var(--ec-bg2) 68%, transparent)
          );
        color: var(--ec-txtforbg1);
        font-weight: 900;
        box-shadow:
          0 14px 36px rgba(0, 0, 0, 0.16),
          inset 0 1px 0 rgba(255, 255, 255, 0.045);
        transition:
          transform var(--ec-transition-fast),
          border-color var(--ec-transition),
          background var(--ec-transition);
      }

      .ec-header-mobile-link::after {
        content: "›";
        color: var(--ec-primary);
        font-size: 1.25rem;
      }

      .ec-header-mobile-link:hover,
      .ec-header-mobile-link.is-active {
        border-color: color-mix(in srgb, var(--ec-primary) 58%, var(--ec-border));
        background: color-mix(in srgb, var(--ec-primary) 12%, var(--ec-card));
      }

      .ec-header-mobile-link:active {
        transform: scale(0.98);
      }

      .ec-scroll-progress {
        position: absolute;
        left: 0;
        bottom: -1px;
        width: 100%;
        height: 3px;
        background: transparent;
        overflow: hidden;
      }

      .ec-scroll-progress-bar {
        width: 0%;
        height: 100%;
        background:
          linear-gradient(
            90deg,
            var(--ec-primary),
            var(--ec-secondary),
            var(--ec-warning)
          );
        box-shadow: 0 0 18px color-mix(in srgb, var(--ec-primary) 70%, transparent);
        transition: width 80ms linear;
      }

      @media (min-width: 1024px) {
        .ec-header-inner {
          grid-template-columns: auto 1fr auto;
          padding-inline: 1rem;
        }

        .ec-header-menu-btn {
          display: none;
        }

        .ec-header-nav {
          display: inline-flex;
        }

        .ec-header-brand-text {
          max-width: none;
        }
      }

      @media (max-width: 420px) {
        .ec-header-inner {
          gap: 0.45rem;
          padding-inline: 0.62rem;
        }

        .ec-header-brand-text {
          max-width: 34vw;
        }

        .ec-header-actions {
          gap: 0.25rem;
        }

        .ec-header-action,
        .ec-header-menu-btn {
          width: 2.52rem;
          height: 2.52rem;
        }
      }

      @keyframes ecHeaderFadeIn {
        from {
          opacity: 0;
        }

        to {
          opacity: 1;
        }
      }

      @keyframes ecHeaderMobileIn {
        from {
          opacity: 0;
          transform: translateY(14px) scale(0.98);
        }

        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes ecHeaderBrandShine {
        0%,
        52%,
        100% {
          transform: translateX(-85%) rotate(18deg);
        }

        68% {
          transform: translateX(85%) rotate(18deg);
        }
      }
    `;

    document.head.appendChild(style);
  }

  window.HeaderDesign = {
    inject
  };
})();