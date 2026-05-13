/* =========================================================
   ELECTRICREDIT V2 - HARDWARE REGISTRY DESIGN
   File: static/components/hardware/registry/registry_design.js
   Purpose: Registry-specific small accents only
   ========================================================= */

(function () {
  "use strict";

  const STYLE_ID = "electricredit-hardware-registry-design-v3";

  function inject() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .ec-registry-hardware {
        display: grid;
        gap: 1rem;
      }

      .ec-registry-hardware .ec-hardware-device::after {
        content: "";
        position: absolute;
        inset: auto 1rem 1rem auto;
        width: 4.2rem;
        height: 4.2rem;
        border-radius: var(--ec-radius-full);
        background: color-mix(in srgb, var(--ec-secondary) 8%, transparent);
        filter: blur(2px);
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  window.HardwareRegistryDesign = { inject };
})();
