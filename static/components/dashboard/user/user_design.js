/* =========================================================
   ELECTRICREDIT V2 - USER DASHBOARD DESIGN
   File: static/components/dashboard/user/user_design.js
   ========================================================= */

(function () {
  "use strict";

  const STYLE_ID = "electricredit-user-dashboard-design-v3";

  function inject() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .ec-user-dashboard .ec-dashboard-chart {
        height: clamp(21rem, 52vw, 28rem);
      }

      .ec-user-dashboard .ec-dashboard-chart-surface::after {
        content: "";
        position: absolute;
        inset: auto auto 1rem 1rem;
        width: 7rem;
        height: 7rem;
        border-radius: var(--ec-radius-full);
        background: color-mix(in srgb, var(--ec-primary) 8%, transparent);
        filter: blur(26px);
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  window.UserDashboardDesign = { inject };
})();
