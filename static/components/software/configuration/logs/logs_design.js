/* SOFTWARE LOGS DESIGN v2 */
(function () {
  "use strict";

  const ID = "electricredit-software-logs-design-v2";

  function inject() {
    const old = document.getElementById("electricredit-software-logs-design-v1");
    if (old) old.remove();
    if (document.getElementById(ID)) return;

    const s = document.createElement("style");
    s.id = ID;
    s.textContent = `
      .ec-software-logs,
      .ec-software-logs-card{
        width:100%;
        min-width:0;
      }

      .ec-software-log-terminal{
        width:100%;
        overflow:auto;
        border:1px solid color-mix(in srgb,var(--ec-primary) 26%,var(--ec-border));
        border-radius:1.1rem;
        background:
          radial-gradient(circle at top left,color-mix(in srgb,var(--ec-primary) 10%,transparent),transparent 34%),
          color-mix(in srgb,var(--ec-bg1) 58%,var(--ec-card));
        box-shadow:inset 0 1px 0 color-mix(in srgb,var(--ec-txtforbg1) 7%,transparent);
      }

      .ec-software-log-head,
      .ec-software-log-row2{
        display:grid;
        grid-template-columns:10fr 15fr 60fr 15fr;
        gap:.6rem;
        min-width:860px;
        align-items:start;
      }

      .ec-software-log-head{
        position:sticky;
        top:0;
        z-index:2;
        padding:.7rem .85rem;
        background:color-mix(in srgb,var(--ec-bg2) 92%,var(--ec-card));
        border-bottom:1px solid var(--ec-border);
      }

      .ec-software-log-head span{
        color:var(--ec-primary);
        font-size:.68rem;
        font-weight:1000;
        letter-spacing:.12em;
      }

      .ec-software-log-row2{
        padding:.75rem .85rem;
        border-bottom:1px solid color-mix(in srgb,var(--ec-border) 66%,transparent);
        font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;
      }

      .ec-software-log-row2:last-child{
        border-bottom:0;
      }

      .ec-software-log-row2:hover{
        background:color-mix(in srgb,var(--ec-primary) 7%,transparent);
      }

      .ec-log-time{
        color:color-mix(in srgb,var(--ec-warning) 85%,var(--ec-txtforbg1));
        font-weight:900;
        white-space:nowrap;
      }

      .ec-log-date{
        color:color-mix(in srgb,var(--ec-primary) 84%,var(--ec-txtforbg1));
        font-weight:850;
      }

      .ec-log-action{
        color:var(--ec-txtforbg1);
        font-weight:850;
        line-height:1.55;
        overflow-wrap:anywhere;
        word-break:break-word;
        text-align:left;
      }

      .ec-log-author{
        color:color-mix(in srgb,var(--ec-success) 86%,var(--ec-txtforbg1));
        font-weight:1000;
        overflow-wrap:anywhere;
      }

      .ec-software-log-row2.is-danger{
        background:color-mix(in srgb,var(--ec-danger) 5%,transparent);
      }

      .ec-software-log-row2.is-danger .ec-log-action{
        color:color-mix(in srgb,var(--ec-danger) 78%,var(--ec-txtforbg1));
      }

      .ec-software-log-row2.is-warning .ec-log-action{
        color:color-mix(in srgb,var(--ec-warning) 82%,var(--ec-txtforbg1));
      }

      .ec-software-log-row2.is-success .ec-log-action{
        color:color-mix(in srgb,var(--ec-success) 80%,var(--ec-txtforbg1));
      }

      .ec-log-token,
      .ec-log-word,
      .ec-log-money{
        display:inline-block;
        border-radius:.45rem;
        padding:.04rem .28rem;
        color:var(--ec-txtforbg1);
        background:color-mix(in srgb,var(--ec-primary) 15%,transparent);
        border:1px solid color-mix(in srgb,var(--ec-primary) 24%,transparent);
        font-weight:1000;
      }

      .ec-log-word{
        color:color-mix(in srgb,var(--ec-warning) 88%,var(--ec-txtforbg1));
        background:color-mix(in srgb,var(--ec-warning) 11%,transparent);
        border-color:color-mix(in srgb,var(--ec-warning) 24%,transparent);
      }

      .ec-log-money{
        color:color-mix(in srgb,var(--ec-success) 88%,var(--ec-txtforbg1));
        background:color-mix(in srgb,var(--ec-success) 11%,transparent);
        border-color:color-mix(in srgb,var(--ec-success) 24%,transparent);
      }

      @media (max-width:760px){
        .ec-software-log-terminal{
          overflow-x:auto;
          -webkit-overflow-scrolling:touch;
        }
      }
    `;
    document.head.appendChild(s);
  }

  window.SoftwareLogsDesign = { inject };
})();
