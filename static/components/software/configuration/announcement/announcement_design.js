/* SOFTWARE ANNOUNCEMENT DESIGN v2 */
(function () {
  "use strict";

  const ID = "electricredit-software-announcement-design-v2";

  function inject() {
    const old = document.getElementById("electricredit-software-announcement-design-v1");
    if (old) old.remove();
    if (document.getElementById(ID)) return;

    const s = document.createElement("style");
    s.id = ID;
    s.textContent = `
      .ec-software-announcement{
        width:100%;
        min-width:0;
      }

      .ec-ann-grid{
        width:100%;
        display:grid;
        grid-template-columns:1fr;
        gap:.85rem;
        align-items:start;
      }

      .ec-ann-panel,
      .ec-ann-preview-panel{
        width:100%;
        min-width:0;
        align-self:stretch;
      }

      .ec-ann-grid.is-previewing{
        grid-template-columns:1fr;
      }

      .ec-ann-grid.is-previewing [data-ann-sms-panel]{
        display:none;
      }

      .ec-ann-email-shell{
        display:grid;
        gap:.7rem;
        border:1px solid color-mix(in srgb,var(--ec-border) 80%,transparent);
        border-radius:1rem;
        padding:.75rem;
        background:color-mix(in srgb,var(--ec-bg1) 24%,transparent);
      }

      .ec-ann-email-subject{
        min-height:2.5rem;
        border:1px solid color-mix(in srgb,var(--ec-primary) 28%,var(--ec-border));
        border-radius:.85rem;
        padding:.65rem .75rem;
        color:var(--ec-txtforbg1);
        background:color-mix(in srgb,var(--ec-primary) 8%,transparent);
        font-weight:1000;
      }

      .ec-ann-email-preview{
        width:100%;
        min-height:28rem;
        border:1px solid color-mix(in srgb,var(--ec-border) 80%,transparent);
        border-radius:1rem;
        background:white;
      }

      @media (min-width:860px){
        .ec-ann-grid{
          grid-template-columns:repeat(2,minmax(0,1fr));
        }

        .ec-ann-grid.is-previewing{
          grid-template-columns:repeat(2,minmax(0,1fr));
        }
      }
    `;
    document.head.appendChild(s);
  }

  window.SoftwareAnnouncementDesign = { inject };
})();
