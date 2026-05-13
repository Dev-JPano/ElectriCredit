/* =========================================================
   ELECTRICREDIT V2 - POWER DASHBOARD DESIGN
   File: static/components/dashboard/power/power_design.js
   ========================================================= */

(function () {
  "use strict";

  const STYLE_ID = "electricredit-power-dashboard-design-v3";

  function inject() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .ec-power-dashboard .ec-dashboard-chart-surface::after {
        content: "";
        position: absolute;
        inset: auto 1rem 1rem auto;
        width: 8rem;
        height: 8rem;
        border-radius: var(--ec-radius-full);
        background: color-mix(in srgb, var(--ec-primary) 9%, transparent);
        filter: blur(28px);
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  window.PowerDashboardDesign = { inject };
})();
