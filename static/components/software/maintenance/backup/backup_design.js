/* SOFTWARE BACKUP MAINTENANCE DESIGN v1 */
(function () {
  "use strict";

  const ID = "electricredit-software-backup-design-v1";

  function inject() {
    if (document.getElementById(ID)) return;
    const style = document.createElement("style");
    style.id = ID;
    style.textContent = `
      .ec-software-backup-row{
        display:grid;
        grid-template-columns:auto minmax(0,1fr);
        gap:.7rem;
        align-items:start;
        border:1px solid color-mix(in srgb,var(--ec-border) 75%,transparent);
        border-radius:1rem;
        padding:.75rem;
        background:color-mix(in srgb,var(--ec-bg1) 18%,transparent);
        margin-bottom:.55rem;
      }

      .ec-software-backup-row input{
        margin-top:.2rem;
        accent-color:var(--ec-primary);
      }

      .ec-software-backup-row strong{
        display:block;
        color:var(--ec-txtforbg1);
        overflow-wrap:anywhere;
      }

      .ec-software-backup-row span span{
        display:block;
        margin-top:.18rem;
        color:var(--ec-txtforbg2);
        font-size:.82rem;
        overflow-wrap:anywhere;
      }
    `;
    document.head.appendChild(style);
  }

  window.SoftwareBackupDesign = { inject };
})();
