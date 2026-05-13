/* SOFTWARE WIFI / CONNECTION DESIGN v2 */
(function () {
  "use strict";

  const ID = "electricredit-software-wifi-design-v2";

  function inject() {
    const old = document.getElementById("electricredit-software-wifi-design-v1");
    if (old) old.remove();
    if (document.getElementById(ID)) return;

    const s = document.createElement("style");
    s.id = ID;
    s.textContent = `
      .ec-software-wifi{width:100%;min-width:0}
      .ec-wifi-compact-status{width:100%;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem}
      .ec-wifi-compact-item{min-width:0;border:1px solid color-mix(in srgb,var(--ec-border) 78%,transparent);border-radius:1rem;padding:.65rem .72rem;background:color-mix(in srgb,var(--ec-bg1) 18%,transparent)}
      .ec-wifi-compact-item span{display:block;color:var(--ec-txtforbg2);font-size:.68rem;font-weight:950;letter-spacing:.08em;text-transform:uppercase}
      .ec-wifi-compact-item strong{display:block;margin-top:.18rem;color:var(--ec-txtforbg1);font-size:.88rem;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ec-wifi-list{display:grid;gap:.55rem}
      .ec-wifi-network{width:100%;border:1px solid color-mix(in srgb,var(--ec-border) 78%,transparent);border-radius:1rem;padding:.75rem;background:color-mix(in srgb,var(--ec-bg1) 20%,transparent);color:var(--ec-txtforbg1);text-align:left;transition:transform var(--ec-transition-fast),border-color var(--ec-transition),background var(--ec-transition)}
      .ec-wifi-network:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--ec-primary) 50%,var(--ec-border));background:color-mix(in srgb,var(--ec-primary) 10%,var(--ec-card))}
      .ec-wifi-network strong{display:block;font-weight:1000;overflow-wrap:anywhere}
      .ec-wifi-network span{display:block;margin-top:.18rem;color:var(--ec-txtforbg2);font-size:.82rem}
      .ec-wifi-mode-grid{display:grid;grid-template-columns:1fr;gap:.65rem}
      .ec-wifi-mode{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.7rem;align-items:start;border:1px solid color-mix(in srgb,var(--ec-border) 78%,transparent);border-radius:1rem;padding:.75rem;background:color-mix(in srgb,var(--ec-bg1) 18%,transparent);cursor:pointer;transition:transform var(--ec-transition-fast),border-color var(--ec-transition),background var(--ec-transition)}
      .ec-wifi-mode:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--ec-primary) 45%,var(--ec-border))}
      .ec-wifi-mode.is-active{border-color:color-mix(in srgb,var(--ec-primary) 62%,var(--ec-border));background:color-mix(in srgb,var(--ec-primary) 11%,var(--ec-card))}
      .ec-wifi-mode input{margin-top:.2rem;accent-color:var(--ec-primary)}
      .ec-wifi-mode strong{display:block;color:var(--ec-txtforbg1);font-size:.95rem;font-weight:1000}
      .ec-wifi-mode small{display:block;margin-top:.22rem;color:var(--ec-txtforbg2);line-height:1.45}
      @media (min-width:760px){.ec-wifi-compact-status{grid-template-columns:repeat(4,minmax(0,1fr))}.ec-wifi-mode-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
    `;
    document.head.appendChild(s);
  }

  window.SoftwareWifiDesign = { inject };
})();
