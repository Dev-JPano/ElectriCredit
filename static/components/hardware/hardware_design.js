/* =========================================================
   ELECTRICREDIT V2 - HARDWARE DESIGN
   File: static/components/hardware/hardware_design.js
   Purpose:
   - Hardware shell styles
   - Uses ElectriCredit theme variables only
   - Dashboard-like segmented pagination
   - Scrollable device work area
   ========================================================= */

(function () {
  "use strict";

  const STYLE_ID = "electricredit-hardware-design-v3";

  function inject() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .ec-hardware {
        position: relative;
        overflow: hidden;
      }

      .ec-hardware-shell {
        width: min(1180px, 100%);
        margin-inline: auto;
        display: grid;
        gap: 1rem;
      }

      .ec-hardware-head,
      .ec-hardware-console,
      .ec-hardware-stat,
      .ec-hardware-metric,
      .ec-hardware-device {
        border: 1px solid var(--ec-border);
        background:
          linear-gradient(145deg,
            color-mix(in srgb, var(--ec-card) 88%, transparent),
            color-mix(in srgb, var(--ec-bg2) 72%, transparent));
        box-shadow:
          0 22px 70px color-mix(in srgb, var(--ec-shadow) 70%, transparent),
          inset 0 1px 0 color-mix(in srgb, var(--ec-txtforbg1) 7%, transparent);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
      }

      .ec-hardware-head {
        display: grid;
        gap: 1rem;
        align-items: end;
        border-radius: var(--ec-radius-2xl);
        padding: clamp(1rem, 3vw, 1.65rem);
      }

      .ec-hardware-kicker {
        display: inline-flex;
        align-items: center;
        width: fit-content;
        border: 1px solid color-mix(in srgb, var(--ec-primary) 34%, var(--ec-border));
        border-radius: var(--ec-radius-full);
        padding: .36rem .72rem;
        background: color-mix(in srgb, var(--ec-primary) 10%, transparent);
        color: var(--ec-primary);
        font-size: .72rem;
        font-weight: 950;
        letter-spacing: .08em;
        text-transform: uppercase;
      }

      .ec-hardware-head h2 {
        margin: .65rem 0 0;
        color: var(--ec-txtforbg1);
        font-size: clamp(2rem, 7vw, 4.6rem);
        line-height: .92;
        letter-spacing: -.07em;
        font-weight: 1000;
      }

      .ec-hardware-head p {
        max-width: 64ch;
        margin: .75rem 0 0;
        color: var(--ec-txtforbg2);
        line-height: 1.7;
      }

      .ec-hardware-status {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: .65rem;
      }

      .ec-hardware-stat {
        border-radius: 1.2rem;
        padding: .82rem;
      }

      .ec-hardware-stat span,
      .ec-hardware-metric span,
      .ec-hardware-detail span,
      .ec-hardware-form-field span {
        display: block;
        color: var(--ec-txtforbg2);
        font-size: .72rem;
        font-weight: 900;
        letter-spacing: .08em;
        text-transform: uppercase;
      }

      .ec-hardware-stat strong,
      .ec-hardware-metric strong {
        display: block;
        margin-top: .15rem;
        color: var(--ec-txtforbg1);
        font-size: clamp(1.2rem, 4vw, 1.85rem);
        font-weight: 1000;
        letter-spacing: -.05em;
      }

      .ec-hardware-console {
        position: relative;
        overflow: hidden;
        border-radius: var(--ec-radius-2xl);
        padding: clamp(.9rem, 2.4vw, 1.15rem);
      }

      .ec-hardware-console::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle at 12% 0%,
            color-mix(in srgb, var(--ec-primary) 18%, transparent),
            transparent 23rem),
          radial-gradient(circle at 90% 10%,
            color-mix(in srgb, var(--ec-secondary) 14%, transparent),
            transparent 22rem);
        opacity: .82;
      }

      .ec-hardware-console > * {
        position: relative;
      }

      .ec-hardware-console-top {
        display: grid;
        gap: .85rem;
        align-items: center;
        margin-bottom: 1rem;
      }

      .ec-hardware-console-title strong {
        display: block;
        color: var(--ec-txtforbg1);
        font-size: clamp(1rem, 2.8vw, 1.28rem);
        font-weight: 1000;
        letter-spacing: -.04em;
      }

      .ec-hardware-console-title span {
        display: block;
        margin-top: .2rem;
        color: var(--ec-txtforbg2);
        font-size: .86rem;
        line-height: 1.45;
      }

      .ec-hardware-tabs {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: .25rem;
        padding: .3rem;
        border: 1px solid color-mix(in srgb, var(--ec-border) 86%, var(--ec-primary));
        border-radius: var(--ec-radius-full);
        background:
          linear-gradient(145deg,
            color-mix(in srgb, var(--ec-bg1) 78%, transparent),
            color-mix(in srgb, var(--ec-bg2) 84%, transparent));
        box-shadow:
          inset 0 1px 0 color-mix(in srgb, var(--ec-txtforbg1) 8%, transparent),
          inset 0 -14px 30px color-mix(in srgb, var(--ec-shadow) 42%, transparent);
      }

      .ec-hardware-tab {
        min-height: 2.55rem;
        border: 0;
        border-radius: var(--ec-radius-full);
        padding: .45rem .65rem;
        background: transparent;
        color: var(--ec-txtforbg2);
        display: inline-flex;
        justify-content: center;
        align-items: center;
        gap: .45rem;
        text-align: center;
        font-size: .78rem;
        font-weight: 950;
        letter-spacing: .04em;
        text-transform: uppercase;
        transition:
          transform var(--ec-transition-fast),
          background var(--ec-transition),
          color var(--ec-transition),
          box-shadow var(--ec-transition);
      }

      .ec-hardware-tab:hover {
        color: var(--ec-txtforbg1);
        transform: translateY(-1px);
      }

      .ec-hardware-tab.is-active {
        color: var(--ec-txtforprimary);
        background:
          linear-gradient(135deg,
            color-mix(in srgb, var(--ec-primary) 96%, var(--ec-txtforbg1) 4%),
            color-mix(in srgb, var(--ec-secondary) 84%, var(--ec-primary)));
        box-shadow:
          0 12px 34px color-mix(in srgb, var(--ec-primary) 32%, transparent),
          inset 0 1px 0 color-mix(in srgb, var(--ec-txtforbg1) 36%, transparent);
      }

      .ec-hardware-tab-icon {
        font-size: 1rem;
        line-height: 1;
      }

      .ec-hardware-panel:not(.is-active) {
        display: none;
      }

      .ec-hardware-scroll {
        max-height: clamp(30rem, 72vh, 48rem);
        min-height: 18rem;
        overflow-y: auto;
        overflow-x: hidden;
        padding-right: .25rem;
      }

      .ec-hardware-loading,
      .ec-hardware-empty {
        display: grid;
        place-items: center;
        min-height: 16rem;
        padding: 1.3rem;
        color: var(--ec-txtforbg2);
        text-align: center;
        border: 1px dashed var(--ec-border);
        border-radius: 1.35rem;
        background: color-mix(in srgb, var(--ec-bg2) 30%, transparent);
      }

      .ec-hardware-empty strong {
        display: block;
        color: var(--ec-txtforbg1);
        font-size: 1.05rem;
        margin-bottom: .35rem;
      }

      .ec-hardware-metrics {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: .7rem;
        margin-top: 1rem;
      }

      .ec-hardware-metric {
        border-radius: 1.25rem;
        padding: .95rem;
      }

      .ec-hardware-modal-grid {
        display: grid;
        gap: .75rem;
      }

      .ec-hardware-modal-details {
        display: grid;
        grid-template-columns: 1fr;
        gap: .65rem;
      }

      .ec-hardware-form {
        display: grid;
        gap: .85rem;
      }

      .ec-hardware-form-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: .85rem;
      }

      .ec-hardware-form-field input,
      .ec-hardware-form-field textarea {
        width: 100%;
        margin-top: .35rem;
        min-height: 2.75rem;
        border: 1px solid var(--ec-border);
        border-radius: 1rem;
        padding: .72rem .82rem;
        background: color-mix(in srgb, var(--ec-bg1) 42%, transparent);
        color: var(--ec-txtforbg1);
        outline: none;
      }

      .ec-hardware-form-field textarea {
        min-height: 5.4rem;
        resize: vertical;
      }

      .ec-hardware-form-field input:focus,
      .ec-hardware-form-field textarea:focus {
        border-color: color-mix(in srgb, var(--ec-primary) 70%, var(--ec-border));
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--ec-primary) 16%, transparent);
      }

      .ec-hardware-modal-note {
        border: 1px solid color-mix(in srgb, var(--ec-primary) 26%, var(--ec-border));
        border-radius: 1rem;
        padding: .8rem;
        background: color-mix(in srgb, var(--ec-primary) 8%, transparent);
        color: var(--ec-txtforbg2);
        line-height: 1.55;
      }

      @media (min-width: 760px) {
        .ec-hardware-head {
          grid-template-columns: 1fr minmax(280px, 420px);
        }

        .ec-hardware-console-top {
          grid-template-columns: 1fr minmax(320px, 430px);
        }

        .ec-hardware-metrics {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .ec-hardware-modal-details,
        .ec-hardware-form-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `;
    document.head.appendChild(style);
  }

  window.HardwareDesign = { inject };
})();
