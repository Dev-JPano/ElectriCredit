/* =========================================================
   ELECTRICREDIT V2 - THEME DESIGN
   File: static/components/header/theme/theme_design.js
   Purpose: Inject theme selector CSS
   ========================================================= */

(function () {
    "use strict";

    const STYLE_ID = "electricredit-theme-design";

    function inject() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement("style");
        style.id = STYLE_ID;

        style.textContent = `
      /* =====================================================
         THEME COMPONENT DESIGN
         ===================================================== */

      .ec-theme-root {
        position: fixed;
        inset: 0;
        z-index: 160;
        pointer-events: none;
      }

      .ec-theme-panel {
        position: fixed;
        inset: 0;
        z-index: 160;
        display: grid;
        place-items: center;
        padding: 1rem;
        pointer-events: auto;
      }

      .ec-theme-panel[hidden] {
        display: none;
      }

      .ec-theme-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(2, 6, 23, 0.72);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        animation: ecThemeFadeIn 180ms ease both;
      }

      .ec-theme-modal {
        position: relative;
        z-index: 1;
        width: min(100%, 780px);
        max-height: min(88vh, 760px);
        display: grid;
        grid-template-rows: auto 1fr;
        overflow: hidden;
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
          inset 0 1px 0 rgba(255, 255, 255, 0.07);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        animation: ecThemeModalIn 240ms ease both;
      }

      .ec-theme-head {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: start;
        gap: 1rem;
        padding: 1.1rem;
        border-bottom: 1px solid var(--ec-border);
        background:
          linear-gradient(
            135deg,
            color-mix(in srgb, var(--ec-primary) 12%, transparent),
            color-mix(in srgb, var(--ec-secondary) 7%, transparent)
          );
      }

      .ec-theme-kicker {
        display: inline-flex;
        width: fit-content;
        padding: 0.32rem 0.62rem;
        border: 1px solid color-mix(in srgb, var(--ec-primary) 32%, var(--ec-border));
        border-radius: 999px;
        background: color-mix(in srgb, var(--ec-primary) 12%, transparent);
        color: var(--ec-primary);
        font-size: 0.68rem;
        font-weight: 950;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .ec-theme-head h2 {
        margin: 0.65rem 0 0;
        color: var(--ec-txtforbg1);
        font-size: clamp(1.45rem, 5vw, 2.2rem);
        font-weight: 950;
        letter-spacing: -0.055em;
      }

      .ec-theme-head p {
        margin: 0.35rem 0 0;
        color: var(--ec-txtforbg2);
        font-size: 0.92rem;
        line-height: 1.5;
      }

      .ec-theme-close {
        width: 2.6rem;
        height: 2.6rem;
        display: grid;
        place-items: center;
        border: 1px solid var(--ec-border);
        border-radius: 999px;
        background: color-mix(in srgb, var(--ec-card) 82%, transparent);
        color: var(--ec-txtforbg1);
        box-shadow:
          0 12px 32px rgba(0, 0, 0, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.055);
        transition:
          transform var(--ec-transition-fast),
          border-color var(--ec-transition),
          background var(--ec-transition);
      }

      .ec-theme-close:hover {
        transform: translateY(-2px);
        border-color: var(--ec-danger);
        background: color-mix(in srgb, var(--ec-danger) 16%, var(--ec-card));
      }

      .ec-theme-close:active {
        transform: scale(0.95);
      }

      .ec-theme-body {
        min-height: 0;
        overflow: auto;
        padding: 1rem;
        display: grid;
        gap: 1rem;
      }

      .ec-theme-current {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.9rem;
        border: 1px solid var(--ec-border);
        border-radius: var(--ec-radius-xl);
        background:
          linear-gradient(
            145deg,
            color-mix(in srgb, var(--ec-card) 80%, transparent),
            color-mix(in srgb, var(--ec-bg2) 62%, transparent)
          );
        box-shadow:
          0 16px 44px rgba(0, 0, 0, 0.18),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);
      }

      .ec-theme-current small {
        display: block;
        color: var(--ec-txtforbg2);
        font-size: 0.72rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .ec-theme-current strong {
        display: block;
        margin-top: 0.22rem;
        color: var(--ec-txtforbg1);
        font-size: 1.05rem;
        font-weight: 950;
      }

      .ec-theme-reset {
        flex: 0 0 auto;
        min-height: 2.35rem;
        padding: 0 0.88rem;
        border: 1px solid color-mix(in srgb, var(--ec-warning) 36%, var(--ec-border));
        border-radius: 999px;
        background: color-mix(in srgb, var(--ec-warning) 10%, var(--ec-card));
        color: color-mix(in srgb, var(--ec-warning) 74%, white);
        font-size: 0.82rem;
        font-weight: 900;
        transition:
          transform var(--ec-transition-fast),
          border-color var(--ec-transition),
          background var(--ec-transition);
      }

      .ec-theme-reset:hover {
        transform: translateY(-2px);
        border-color: var(--ec-warning);
        background: color-mix(in srgb, var(--ec-warning) 16%, var(--ec-card));
      }

      .ec-theme-status {
        min-height: 2.35rem;
        display: flex;
        align-items: center;
        padding: 0.68rem 0.86rem;
        border: 1px solid var(--ec-border);
        border-radius: var(--ec-radius-lg);
        background: color-mix(in srgb, var(--ec-bg1) 42%, transparent);
        color: var(--ec-txtforbg2);
        font-size: 0.86rem;
        line-height: 1.4;
      }

      .ec-theme-status.is-success {
        border-color: color-mix(in srgb, var(--ec-success) 42%, var(--ec-border));
        color: color-mix(in srgb, var(--ec-success) 72%, white);
      }

      .ec-theme-status.is-warning {
        border-color: color-mix(in srgb, var(--ec-warning) 42%, var(--ec-border));
        color: color-mix(in srgb, var(--ec-warning) 72%, white);
      }

      .ec-theme-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.85rem;
      }

      .ec-theme-card {
        position: relative;
        width: 100%;
        display: grid;
        grid-template-columns: 6.2rem 1fr auto;
        align-items: center;
        gap: 0.85rem;
        padding: 0.82rem;
        border: 1px solid var(--ec-border);
        border-radius: var(--ec-radius-xl);
        background:
          linear-gradient(
            145deg,
            color-mix(in srgb, var(--ec-card) 84%, transparent),
            color-mix(in srgb, var(--ec-bg2) 66%, transparent)
          );
        color: var(--ec-txtforbg1);
        text-align: left;
        box-shadow:
          0 18px 52px rgba(0, 0, 0, 0.18),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);
        overflow: hidden;
        transition:
          transform var(--ec-transition-fast),
          border-color var(--ec-transition),
          background var(--ec-transition),
          box-shadow var(--ec-transition);
      }

      .ec-theme-card:hover {
        transform: translateY(-3px);
        border-color: color-mix(in srgb, var(--ec-primary) 52%, var(--ec-border));
        box-shadow:
          0 24px 68px color-mix(in srgb, var(--ec-shadow) 78%, var(--ec-primary) 22%),
          inset 0 1px 0 rgba(255, 255, 255, 0.07);
      }

      .ec-theme-card:active {
        transform: translateY(-1px) scale(0.992);
      }

      .ec-theme-card.is-active {
        border-color: color-mix(in srgb, var(--ec-primary) 76%, var(--ec-border));
        background:
          linear-gradient(
            145deg,
            color-mix(in srgb, var(--ec-primary) 14%, var(--ec-card)),
            color-mix(in srgb, var(--ec-secondary) 8%, var(--ec-bg2))
          );
      }

      .ec-theme-card-preview {
        position: relative;
        height: 4.4rem;
        border-radius: 1.05rem;
        background:
          radial-gradient(circle at 24% 20%, var(--preview-primary), transparent 2rem),
          radial-gradient(circle at 82% 18%, var(--preview-secondary), transparent 2rem),
          linear-gradient(135deg, var(--preview-bg), var(--preview-surface));
        border: 1px solid rgba(255, 255, 255, 0.16);
        overflow: hidden;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.08),
          0 14px 34px rgba(0, 0, 0, 0.18);
      }

      .ec-theme-card-preview span {
        position: absolute;
        left: 0.65rem;
        top: 0.65rem;
        width: 2.25rem;
        height: 0.45rem;
        border-radius: 999px;
        background: var(--preview-text);
        opacity: 0.88;
      }

      .ec-theme-card-preview i {
        position: absolute;
        left: 0.65rem;
        bottom: 0.72rem;
        width: 3.8rem;
        height: 1.25rem;
        border-radius: 999px;
        background: var(--preview-primary);
      }

      .ec-theme-card-preview b {
        position: absolute;
        right: 0.7rem;
        bottom: 0.7rem;
        width: 1.35rem;
        height: 1.35rem;
        border-radius: 999px;
        background: var(--preview-secondary);
      }

      .ec-theme-card-info {
        min-width: 0;
      }

      .ec-theme-card-info strong {
        display: block;
        color: var(--ec-txtforbg1);
        font-size: 1rem;
        font-weight: 950;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .ec-theme-card-info small {
        display: block;
        margin-top: 0.18rem;
        color: var(--ec-txtforbg2);
        font-size: 0.76rem;
        font-weight: 800;
      }

      .ec-theme-swatches {
        display: none;
        align-items: center;
        gap: 0.32rem;
      }

      .ec-theme-swatches span {
        width: 1.1rem;
        height: 1.1rem;
        border: 1px solid rgba(255, 255, 255, 0.22);
        border-radius: 999px;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.22);
      }

      .ec-theme-active-label {
        position: absolute;
        right: 0.75rem;
        top: 0.72rem;
        padding: 0.22rem 0.5rem;
        border-radius: 999px;
        background: color-mix(in srgb, var(--ec-primary) 12%, var(--ec-card));
        color: var(--ec-primary);
        font-size: 0.66rem;
        font-style: normal;
        font-weight: 950;
        letter-spacing: 0.07em;
        text-transform: uppercase;
      }

      .ec-theme-card.is-active .ec-theme-active-label {
        background: var(--ec-primary);
        color: var(--ec-txtforprimary);
      }

      .ec-theme-card.is-loading {
        pointer-events: none;
        opacity: 0.72;
      }

      .ec-theme-card.is-loading .ec-theme-card-preview,
      .ec-theme-card.is-loading strong,
      .ec-theme-card.is-loading small {
        position: relative;
        overflow: hidden;
        background: color-mix(in srgb, var(--ec-card) 76%, white 4%);
      }

      .ec-theme-card.is-loading strong,
      .ec-theme-card.is-loading small {
        display: block;
        width: 100%;
        height: 0.8rem;
        border-radius: 999px;
      }

      .ec-theme-card.is-loading small {
        width: 50%;
        margin-top: 0.45rem;
      }

      .ec-theme-empty {
        padding: 1.2rem;
        border: 1px dashed var(--ec-border);
        border-radius: var(--ec-radius-xl);
        background: color-mix(in srgb, var(--ec-bg1) 44%, transparent);
        text-align: center;
      }

      .ec-theme-empty strong {
        display: block;
        color: var(--ec-txtforbg1);
        font-weight: 950;
      }

      .ec-theme-empty p {
        margin: 0.35rem 0 0;
        color: var(--ec-txtforbg2);
      }

      @media (min-width: 720px) {
        .ec-theme-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .ec-theme-card {
          grid-template-columns: 1fr;
        }

        .ec-theme-swatches {
          display: inline-flex;
        }
      }

      @media (max-width: 640px) {
        .ec-theme-panel {
          align-items: end;
          padding: 0;
        }

        .ec-theme-modal {
          width: 100%;
          max-height: 92vh;
          border-radius: 1.6rem 1.6rem 0 0;
        }

        .ec-theme-head {
          padding: 1rem;
        }

        .ec-theme-card {
          grid-template-columns: 5.4rem 1fr;
        }

        .ec-theme-swatches {
          display: none;
        }

        .ec-theme-active-label {
          position: static;
          justify-self: start;
          grid-column: 2;
        }
      }
    
      /* =====================================================
        THEME SWITCH TRANSITION
        ===================================================== */

        .ec-theme-transition-overlay {
            position: fixed;
            inset: 0;
            z-index: 999;
            pointer-events: none;
            background:
                radial-gradient(
                circle at var(--theme-x, 50%) var(--theme-y, 50%),
                color-mix(in srgb, var(--ec-primary) 24%, transparent),
                transparent 34%
                ),
                linear-gradient(
                135deg,
                color-mix(in srgb, var(--ec-bg1) 94%, transparent),
                color-mix(in srgb, var(--ec-bg2) 94%, transparent)
                );
            opacity: 0;
            transform: scale(1.04);
            transition:
                opacity 260ms ease,
                transform 420ms ease;
        }

        .ec-theme-transition-overlay.is-active {
            opacity: 1;
            transform: scale(1);
        }

        .ec-theme-transition-overlay.is-leaving {
            opacity: 0;
            transform: scale(1.08);
        }

        html.ec-theme-switching,
        html.ec-theme-switching * {
        transition:
            background-color 420ms ease,
            background 420ms ease,
            color 420ms ease,
            border-color 420ms ease,
            box-shadow 420ms ease,
            fill 420ms ease,
            stroke 420ms ease !important;
        }

        @keyframes ecThemeApplyPulse {
            0% {
                transform: scale(1);
                filter: brightness(1);
            }

            45% {
                transform: scale(1.012);
                filter: brightness(1.12);
            }

            100% {
                transform: scale(1);
                filter: brightness(1);
            }
        }

      @keyframes ecThemeFadeIn {
        from {
          opacity: 0;
        }

        to {
          opacity: 1;
        }
      }

      @keyframes ecThemeModalIn {
        from {
          opacity: 0;
          transform: translateY(18px) scale(0.975);
        }

        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
    `;

        document.head.appendChild(style);
    }

    window.ThemeDesign = {
        inject
    };
})();