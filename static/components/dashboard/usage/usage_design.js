/* =========================================================
   ELECTRICREDIT V2 - USAGE DASHBOARD DESIGN
   File: static/components/dashboard/usage/usage_design.js
   ========================================================= */

(function () {
  "use strict";

  const STYLE_ID = "electricredit-usage-dashboard-design-v3";

  function inject() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .ec-usage-dashboard .ec-dashboard-chart {
        height: clamp(22rem, 54vw, 29rem);
      }

      .ec-usage-dashboard .ec-dashboard-chart-surface::after {
        content: "";
        position: absolute;
        inset: 1rem 1rem auto auto;
        width: 7.5rem;
        height: 7.5rem;
        border-radius: var(--ec-radius-full);
        background: color-mix(in srgb, var(--ec-secondary) 8%, transparent);
        filter: blur(28px);
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  window.UsageDashboardDesign = { inject };
})();
