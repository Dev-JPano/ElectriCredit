/* =========================================================
   ELECTRICREDIT V2 - HUB DASHBOARD DESIGN
   File: static/components/dashboard/hub/hub_design.js
   ========================================================= */

(function () {
  "use strict";

  const STYLE_ID = "electricredit-hub-dashboard-design-v3";

  function inject() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .ec-hub-dashboard .ec-dashboard-chart-surface::after {
        content: "";
        position: absolute;
        inset: 1rem auto auto 1rem;
        width: 7rem;
        height: 7rem;
        border-radius: var(--ec-radius-full);
        background: color-mix(in srgb, var(--ec-secondary) 9%, transparent);
        filter: blur(26px);
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  window.HubDashboardDesign = { inject };
})();
