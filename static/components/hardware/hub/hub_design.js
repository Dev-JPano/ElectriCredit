/* =========================================================
   ELECTRICREDIT V2 - HARDWARE HUB DESIGN
   File: static/components/hardware/hub/hub_design.js
   Purpose: Hub/Registry shared device card styles
   ========================================================= */

(function () {
  "use strict";

  const STYLE_ID = "electricredit-hardware-device-design-v3";

  function inject() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .ec-hub-hardware,
      .ec-registry-hardware {
        display: grid;
        gap: 1rem;
      }

      .ec-hardware-toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: .75rem;
        padding: .8rem;
        border: 1px solid color-mix(in srgb, var(--ec-border) 84%, transparent);
        border-radius: 1.25rem;
        background: color-mix(in srgb, var(--ec-bg1) 24%, transparent);
      }

      .ec-hardware-toolbar strong {
        display: block;
        color: var(--ec-txtforbg1);
        font-size: 1rem;
        font-weight: 1000;
      }

      .ec-hardware-toolbar span {
        display: block;
        margin-top: .18rem;
        color: var(--ec-txtforbg2);
        font-size: .82rem;
      }

      .ec-hardware-actions,
      .ec-hardware-device-actions {
        display: flex;
        flex-wrap: wrap;
        gap: .48rem;
      }

      .ec-hardware-btn {
        min-height: 2.25rem;
        border: 1px solid color-mix(in srgb, var(--ec-border) 82%, var(--ec-primary));
        border-radius: var(--ec-radius-full);
        padding: .45rem .76rem;
        background:
          linear-gradient(145deg,
            color-mix(in srgb, var(--ec-card) 76%, transparent),
            color-mix(in srgb, var(--ec-bg2) 76%, transparent));
        color: var(--ec-txtforbg1);
        font-size: .76rem;
        font-weight: 900;
        transition:
          transform var(--ec-transition-fast),
          border-color var(--ec-transition),
          background var(--ec-transition),
          color var(--ec-transition);
      }

      .ec-hardware-btn:hover:not(:disabled) {
        transform: translateY(-1px);
        border-color: color-mix(in srgb, var(--ec-primary) 62%, var(--ec-border));
        background: color-mix(in srgb, var(--ec-primary) 13%, var(--ec-card));
      }

      .ec-hardware-btn-primary {
        border-color: color-mix(in srgb, var(--ec-primary) 58%, var(--ec-border));
        background: color-mix(in srgb, var(--ec-primary) 15%, var(--ec-card));
      }

      .ec-hardware-btn-danger {
        border-color: color-mix(in srgb, var(--ec-danger) 62%, var(--ec-border));
        color: color-mix(in srgb, var(--ec-danger) 78%, var(--ec-txtforbg1));
      }

      .ec-hardware-btn-warning {
        border-color: color-mix(in srgb, var(--ec-warning) 62%, var(--ec-border));
        color: color-mix(in srgb, var(--ec-warning) 82%, var(--ec-txtforbg1));
      }

      .ec-hardware-device-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: .85rem;
      }

      .ec-hardware-device {
        position: relative;
        overflow: hidden;
        border-radius: 1.35rem;
        padding: 1rem;
      }

      .ec-hardware-device::before {
        content: "";
        position: absolute;
        inset: 0 auto 0 0;
        width: .25rem;
        background: var(--device-accent, var(--ec-primary));
        opacity: .96;
      }

      .ec-hardware-device-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: .7rem;
        margin-bottom: .85rem;
      }

      .ec-hardware-device-title {
        display: grid;
        gap: .22rem;
      }

      .ec-hardware-device-title strong {
        color: var(--ec-txtforbg1);
        font-size: 1.1rem;
        font-weight: 1000;
        letter-spacing: -.04em;
      }

      .ec-hardware-device-title span {
        color: var(--ec-txtforbg2);
        font-size: .84rem;
        line-height: 1.4;
      }

      .ec-hardware-chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: .42rem;
        margin: .75rem 0;
      }

      .ec-hardware-chip {
        display: inline-flex;
        align-items: center;
        gap: .32rem;
        width: fit-content;
        border: 1px solid var(--ec-border);
        border-radius: var(--ec-radius-full);
        padding: .32rem .58rem;
        background: color-mix(in srgb, var(--ec-bg1) 34%, transparent);
        color: var(--ec-txtforbg2);
        font-size: .7rem;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: .055em;
      }

      .ec-hardware-chip::before {
        content: "";
        width: .46rem;
        height: .46rem;
        border-radius: var(--ec-radius-full);
        background: currentColor;
        box-shadow: 0 0 14px currentColor;
      }

      .ec-chip-online,
      .ec-chip-enabled,
      .ec-chip-available {
        color: var(--ec-success);
        border-color: color-mix(in srgb, var(--ec-success) 44%, var(--ec-border));
      }

      .ec-chip-offline,
      .ec-chip-disabled,
      .ec-chip-busy {
        color: var(--ec-warning);
        border-color: color-mix(in srgb, var(--ec-warning) 44%, var(--ec-border));
      }

      .ec-hardware-detail-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: .55rem;
        margin-top: .85rem;
      }

      .ec-hardware-detail {
        border: 1px solid color-mix(in srgb, var(--ec-border) 80%, transparent);
        border-radius: 1rem;
        padding: .68rem;
        background: color-mix(in srgb, var(--ec-bg1) 20%, transparent);
      }

      .ec-hardware-detail strong {
        display: block;
        margin-top: .18rem;
        color: var(--ec-txtforbg1);
        font-size: .9rem;
        font-weight: 950;
        word-break: break-word;
      }

      .ec-hardware-device-actions {
        margin-top: .9rem;
      }

      @media (min-width: 760px) {
        .ec-hardware-device-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .ec-hardware-detail-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (min-width: 1080px) {
        .ec-hardware-device-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
    `;
    document.head.appendChild(style);
  }

  window.HardwareHubDesign = { inject };
})();
