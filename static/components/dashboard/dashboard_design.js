/* =========================================================
   ELECTRICREDIT V2 - DASHBOARD DESIGN
   File: static/components/dashboard/dashboard_design.js
   Purpose:
   - Main dashboard shell CSS
   - Theme-variable based only, no hardcoded color fallbacks
   ========================================================= */

(function () {
  "use strict";

  const STYLE_ID = "electricredit-dashboard-design-v4";

  function inject() {
    [
      "electricredit-dashboard-design-v1",
      "electricredit-dashboard-design-v2",
      "electricredit-dashboard-design-v3",
      STYLE_ID
    ].forEach((id) => {
      const old = document.getElementById(id);
      if (old) old.remove();
    });

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #dashboard-section.ec-section {
        padding-top: clamp(1rem, 3vw, 2rem);
      }

      .ec-dashboard,
      .ec-dashboard * {
        box-sizing: border-box;
      }

      .ec-dashboard {
        position: relative;
        isolation: isolate;
      }

      .ec-dashboard-shell {
        width: min(1180px, calc(100% - 1rem));
        margin-inline: auto;
        display: grid;
        gap: 1rem;
      }

      .ec-dashboard-hero,
      .ec-dashboard-monitor,
      .ec-dashboard-chart-surface,
      .ec-dashboard-metric,
      .ec-dashboard-live-item {
        border: 1px solid var(--ec-border);
        background:
          linear-gradient(145deg,
            color-mix(in srgb, var(--ec-card) 88%, transparent),
            color-mix(in srgb, var(--ec-bg2) 72%, transparent));
        box-shadow:
          0 22px 70px color-mix(in srgb, var(--ec-shadow) 58%, transparent),
          inset 0 1px 0 color-mix(in srgb, var(--ec-txtforbg1) 7%, transparent);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
      }

      .ec-dashboard-hero {
        display: grid;
        gap: 1rem;
        align-items: end;
        border-radius: var(--ec-radius-2xl);
        padding: clamp(1rem, 3vw, 1.65rem);
        overflow: hidden;
        position: relative;
      }

      .ec-dashboard-hero::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle at top left,
            color-mix(in srgb, var(--ec-primary) 16%, transparent),
            transparent 24rem),
          radial-gradient(circle at bottom right,
            color-mix(in srgb, var(--ec-secondary) 12%, transparent),
            transparent 22rem);
      }

      .ec-dashboard-hero > * {
        position: relative;
      }

      .ec-dashboard-kicker {
        display: inline-flex;
        width: fit-content;
        border: 1px solid color-mix(in srgb, var(--ec-primary) 42%, var(--ec-border));
        border-radius: var(--ec-radius-full);
        padding: .36rem .72rem;
        background: color-mix(in srgb, var(--ec-primary) 10%, transparent);
        color: var(--ec-primary);
        font-size: .72rem;
        font-weight: 950;
        letter-spacing: .08em;
        text-transform: uppercase;
      }

      .ec-dashboard-hero h2 {
        margin: .65rem 0 0;
        color: var(--ec-txtforbg1);
        font-size: clamp(2rem, 7vw, 4.6rem);
        line-height: .92;
        letter-spacing: -.07em;
        font-weight: 1000;
      }

      .ec-dashboard-hero p {
        max-width: 62ch;
        margin: .75rem 0 0;
        color: var(--ec-txtforbg2);
        line-height: 1.7;
      }

      .ec-dashboard-live {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: .65rem;
      }

      .ec-dashboard-live-item {
        border-radius: 1.2rem;
        padding: .82rem;
      }

      .ec-dashboard-live-item span,
      .ec-dashboard-metric span,
      .ec-dashboard-chart-label {
        display: block;
        color: var(--ec-txtforbg2);
        font-size: .72rem;
        font-weight: 900;
        letter-spacing: .08em;
        text-transform: uppercase;
      }

      .ec-dashboard-live-item strong,
      .ec-dashboard-metric strong {
        display: block;
        margin-top: .15rem;
        color: var(--ec-txtforbg1);
        font-size: clamp(1.2rem, 4vw, 1.85rem);
        font-weight: 1000;
        letter-spacing: -.05em;
      }

      .ec-dashboard-monitor {
        position: relative;
        overflow: hidden;
        border-radius: var(--ec-radius-2xl);
        padding: clamp(.9rem, 2.4vw, 1.15rem);
      }

      .ec-dashboard-monitor::before {
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
      }

      .ec-dashboard-monitor > * {
        position: relative;
      }

      .ec-dashboard-monitor-top {
        display: grid;
        gap: .85rem;
        align-items: center;
        margin-bottom: 1rem;
      }

      .ec-dashboard-monitor-top strong {
        display: block;
        color: var(--ec-txtforbg1);
        font-size: clamp(1rem, 2.8vw, 1.28rem);
        font-weight: 1000;
        letter-spacing: -.04em;
      }

      .ec-dashboard-tabs {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: .38rem;
        padding: .48rem;
        border: 1px solid color-mix(in srgb, var(--ec-border) 86%, var(--ec-primary));
        border-radius: 1.65rem;
        background:
          linear-gradient(145deg,
            color-mix(in srgb, var(--ec-bg1) 78%, transparent),
            color-mix(in srgb, var(--ec-bg2) 84%, transparent));
        box-shadow:
          inset 0 1px 0 color-mix(in srgb, var(--ec-txtforbg1) 8%, transparent),
          inset 0 -14px 30px color-mix(in srgb, var(--ec-shadow) 42%, transparent);
        overflow: hidden;
      }

      .ec-dashboard-tab {
        min-height: 3.35rem;
        border: 0;
        border-radius: 1.18rem;
        padding: .62rem .75rem;
        background: transparent;
        color: var(--ec-txtforbg2);
        display: grid;
        justify-items: center;
        align-items: center;
        gap: .12rem;
        text-align: center;
        transition:
          transform var(--ec-transition-fast),
          background var(--ec-transition),
          color var(--ec-transition),
          box-shadow var(--ec-transition);
      }

      .ec-dashboard-tab strong {
        color: inherit;
        font-size: .72rem;
        font-weight: 950;
        letter-spacing: .04em;
        text-transform: uppercase;
        line-height: 1.05;
      }

      .ec-dashboard-tab span {
        color: inherit;
        opacity: .72;
        font-size: .62rem;
        line-height: 1.05;
        white-space: nowrap;
      }

      .ec-dashboard-tab:hover {
        color: var(--ec-txtforbg1);
        transform: translateY(-1px);
      }

      .ec-dashboard-tab.is-active {
        color: var(--ec-txtforprimary);
        background:
          linear-gradient(135deg,
            color-mix(in srgb, var(--ec-primary) 96%, var(--ec-txtforbg1) 4%),
            color-mix(in srgb, var(--ec-secondary) 84%, var(--ec-primary)));
        box-shadow:
          0 10px 24px color-mix(in srgb, var(--ec-primary) 28%, transparent),
          inset 0 1px 0 color-mix(in srgb, var(--ec-txtforbg1) 36%, transparent);
      }

      .ec-dashboard-panel:not(.is-active) {
        display: none;
      }

      .ec-dashboard-grid {
        display: grid;
        gap: 1rem;
      }

      .ec-dashboard-chart-surface {
        position: relative;
        overflow: hidden;
        min-height: 26rem;
        border-radius: 1.35rem;
        padding: .9rem;
      }

      .ec-dashboard-toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: .75rem;
        margin-bottom: .85rem;
      }

      .ec-dashboard-toolbar strong {
        display: block;
        margin-top: .18rem;
        color: var(--ec-txtforbg1);
        font-size: .98rem;
        font-weight: 1000;
        letter-spacing: -.035em;
      }

      .ec-dashboard-tools {
        display: flex;
        flex-wrap: wrap;
        gap: .45rem;
      }

      .ec-dashboard-select {
        min-height: 2.35rem;
        border: 1px solid color-mix(in srgb, var(--ec-border) 90%, transparent);
        border-radius: var(--ec-radius-full);
        padding: .45rem .75rem;
        background: color-mix(in srgb, var(--ec-bg2) 88%, transparent);
        color: var(--ec-txtforbg1);
        font-size: .78rem;
        font-weight: 850;
        outline: none;
      }

      .ec-dashboard-select:focus {
        border-color: color-mix(in srgb, var(--ec-primary) 70%, var(--ec-border));
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--ec-primary) 16%, transparent);
      }

      .ec-dashboard-chart {
        position: relative;
        z-index: 1;
        width: 100%;
        height: clamp(21rem, 52vw, 28rem);
        min-height: 20rem;
      }

      .ec-dashboard-state {
        min-height: 18rem;
        display: grid;
        place-items: center;
        color: var(--ec-txtforbg2);
        text-align: center;
        border: 1px dashed var(--ec-border);
        border-radius: 1.2rem;
        background: color-mix(in srgb, var(--ec-bg2) 30%, transparent);
      }

      .ec-dashboard-metrics {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: .7rem;
      }

      .ec-dashboard-metric {
        border-radius: 1.25rem;
        padding: .95rem;
      }

      @media (min-width: 760px) {
        .ec-dashboard-hero {
          grid-template-columns: 1fr minmax(280px, 420px);
        }

        .ec-dashboard-monitor-top {
          grid-template-columns: 1fr minmax(440px, 560px);
        }

        .ec-dashboard-metrics {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }

      @media (max-width: 640px) {
        .ec-dashboard-tabs {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          border-radius: 1.35rem;
          padding: .42rem;
        }

        .ec-dashboard-tab {
          min-height: 3.15rem;
          border-radius: 1rem;
          padding: .56rem .45rem;
        }

        .ec-dashboard-tab span {
          white-space: normal;
        }
      }
    `;

    document.head.appendChild(style);
  }

  window.DashboardDesign = { inject };
})();
