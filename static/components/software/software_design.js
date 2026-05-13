/* ELECTRICREDIT V2 - SOFTWARE DESIGN v3 */
(function () {
  "use strict";

  const ID = "electricredit-software-design-v3";

  function inject() {
    ["electricredit-software-design-v1", "electricredit-software-design-v2"].forEach((oldId) => {
      const old = document.getElementById(oldId);
      if (old) old.remove();
    });

    if (document.getElementById(ID)) return;

    const style = document.createElement("style");
    style.id = ID;
    style.textContent = `
      .ec-software,.ec-software *{box-sizing:border-box}
      .ec-software{position:relative;overflow:hidden;text-align:left}
      .ec-software-shell{width:min(1180px,100%);margin-inline:auto;display:grid;gap:1rem}
      .ec-software-head,.ec-software-console,.ec-software-stat,.ec-software-card,.ec-software-field,.ec-software-recipient-card,.ec-software-log-row,.ec-software-user-group,.ec-software-bonus-card{border:1px solid var(--ec-border);background:linear-gradient(145deg,color-mix(in srgb,var(--ec-card) 88%,transparent),color-mix(in srgb,var(--ec-bg2) 72%,transparent));box-shadow:0 22px 70px color-mix(in srgb,var(--ec-shadow) 70%,transparent),inset 0 1px 0 color-mix(in srgb,var(--ec-txtforbg1) 7%,transparent);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
      .ec-software-head{display:grid;gap:1rem;align-items:end;border-radius:var(--ec-radius-2xl);padding:clamp(1rem,3vw,1.65rem)}
      .ec-software-kicker{display:inline-flex;align-items:center;width:fit-content;border:1px solid color-mix(in srgb,var(--ec-primary) 34%,var(--ec-border));border-radius:var(--ec-radius-full);padding:.36rem .72rem;background:color-mix(in srgb,var(--ec-primary) 10%,transparent);color:var(--ec-primary);font-size:.72rem;font-weight:950;letter-spacing:.08em;text-transform:uppercase}
      .ec-software-head h2{margin:.65rem 0 0;color:var(--ec-txtforbg1);font-size:clamp(2rem,7vw,4.6rem);line-height:.92;letter-spacing:-.07em;font-weight:1000}
      .ec-software-head p{max-width:66ch;margin:.75rem 0 0;color:var(--ec-txtforbg2);line-height:1.7}
      .ec-software-status{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem}
      .ec-software-stat{border-radius:1.2rem;padding:.82rem}
      .ec-software-stat span,.ec-software-field span,.ec-software-mini-stat span,.ec-software-list-label{display:block;color:var(--ec-txtforbg2);font-size:.72rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
      .ec-software-stat strong,.ec-software-mini-stat strong{display:block;margin-top:.15rem;color:var(--ec-txtforbg1);font-size:clamp(1.16rem,4vw,1.75rem);font-weight:1000;letter-spacing:-.05em}
      .ec-software-console{border-radius:var(--ec-radius-2xl);padding:clamp(.9rem,2.4vw,1.15rem);overflow:hidden}
      .ec-software-console-top{display:grid;gap:.85rem;align-items:center;margin-bottom:1rem}
      .ec-software-console-title strong{display:block;color:var(--ec-txtforbg1);font-size:clamp(1rem,2.8vw,1.28rem);font-weight:1000;letter-spacing:-.04em}
      .ec-software-console-title span{display:block;margin-top:.2rem;color:var(--ec-txtforbg2);font-size:.86rem;line-height:1.45}

      .ec-software-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.38rem;padding:.48rem;border:1px solid color-mix(in srgb,var(--ec-border) 86%,var(--ec-primary));border-radius:1.65rem;background:linear-gradient(145deg,color-mix(in srgb,var(--ec-bg1) 78%,transparent),color-mix(in srgb,var(--ec-bg2) 84%,transparent));box-shadow:inset 0 1px 0 color-mix(in srgb,var(--ec-txtforbg1) 8%,transparent),inset 0 -14px 30px color-mix(in srgb,var(--ec-shadow) 42%,transparent);overflow:hidden}
      .ec-software-tab{min-height:3.35rem;border:0;border-radius:1.18rem;padding:.62rem .75rem;background:transparent;color:var(--ec-txtforbg2);display:grid;justify-items:center;align-items:center;gap:.12rem;text-align:center;transition:transform var(--ec-transition-fast),background var(--ec-transition),color var(--ec-transition),box-shadow var(--ec-transition)}
      .ec-software-tab strong{color:inherit;font-size:.72rem;font-weight:950;letter-spacing:.04em;text-transform:uppercase;line-height:1.05}
      .ec-software-tab span{color:inherit;opacity:.72;font-size:.62rem;line-height:1.05;white-space:nowrap}
      .ec-software-tab:hover:not(.is-locked){color:var(--ec-txtforbg1);transform:translateY(-1px)}
      .ec-software-tab.is-active{color:var(--ec-txtforprimary);background:linear-gradient(135deg,color-mix(in srgb,var(--ec-primary) 96%,var(--ec-txtforbg1) 4%),color-mix(in srgb,var(--ec-secondary) 84%,var(--ec-primary)));box-shadow:0 10px 24px color-mix(in srgb,var(--ec-primary) 28%,transparent),inset 0 1px 0 color-mix(in srgb,var(--ec-txtforbg1) 36%,transparent)}
      .ec-software-tab.is-locked{opacity:.48;cursor:not-allowed}
      .ec-software-panel:not(.is-active){display:none}
      .ec-software-module{display:grid;gap:1rem;width:100%}
      .ec-software-toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.75rem;padding:.8rem;border:1px solid color-mix(in srgb,var(--ec-border) 84%,transparent);border-radius:1.25rem;background:color-mix(in srgb,var(--ec-bg1) 24%,transparent)}
      .ec-software-toolbar strong{display:block;color:var(--ec-txtforbg1);font-size:1rem;font-weight:1000}
      .ec-software-toolbar span{display:block;margin-top:.18rem;color:var(--ec-txtforbg2);font-size:.82rem;line-height:1.4}
      .ec-software-actions,.ec-software-inline-actions,.ec-software-card-actions{display:flex;flex-wrap:wrap;gap:.5rem}
      .ec-software-btn{min-height:2.35rem;border:1px solid color-mix(in srgb,var(--ec-border) 82%,var(--ec-primary));border-radius:var(--ec-radius-full);padding:.5rem .82rem;background:linear-gradient(145deg,color-mix(in srgb,var(--ec-card) 76%,transparent),color-mix(in srgb,var(--ec-bg2) 76%,transparent));color:var(--ec-txtforbg1);font-size:.76rem;font-weight:900;transition:transform var(--ec-transition-fast),border-color var(--ec-transition),background var(--ec-transition),box-shadow var(--ec-transition)}
      .ec-software-btn:hover:not(:disabled){transform:translateY(-1px);border-color:color-mix(in srgb,var(--ec-primary) 62%,var(--ec-border));background:color-mix(in srgb,var(--ec-primary) 13%,var(--ec-card));box-shadow:0 14px 34px color-mix(in srgb,var(--ec-shadow) 65%,transparent)}
      .ec-software-btn:disabled{opacity:.48;cursor:not-allowed}
      .ec-software-btn-primary{border-color:color-mix(in srgb,var(--ec-primary) 58%,var(--ec-border));background:color-mix(in srgb,var(--ec-primary) 15%,var(--ec-card))}
      .ec-software-btn-danger{border-color:color-mix(in srgb,var(--ec-danger) 62%,var(--ec-border));color:color-mix(in srgb,var(--ec-danger) 82%,var(--ec-txtforbg1))}
      .ec-software-btn-warning{border-color:color-mix(in srgb,var(--ec-warning) 62%,var(--ec-border));color:color-mix(in srgb,var(--ec-warning) 86%,var(--ec-txtforbg1))}
      .ec-software-card{border-radius:1.35rem;padding:clamp(.85rem,2vw,1rem);display:grid;gap:.85rem;width:100%;min-width:0}
      .ec-software-grid{display:grid;grid-template-columns:1fr;gap:.85rem;width:100%}
      .ec-software-grid-2{display:grid;grid-template-columns:1fr;gap:.85rem;width:100%;align-items:start}
      .ec-software-field{border-radius:1rem;padding:.72rem;min-width:0}
      .ec-software-field input,.ec-software-field select,.ec-software-field textarea{width:100%;min-height:2.75rem;margin-top:.38rem;border:1px solid var(--ec-border);border-radius:1rem;padding:.72rem .82rem;background:color-mix(in srgb,var(--ec-bg1) 42%,transparent);color:var(--ec-txtforbg1);outline:none}
      .ec-software-field textarea{min-height:12rem;resize:vertical;line-height:1.55;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}
      .ec-software-field input[readonly]{opacity:.75;cursor:not-allowed}
      .ec-software-field input:focus,.ec-software-field textarea:focus,.ec-software-field select:focus{border-color:color-mix(in srgb,var(--ec-primary) 65%,var(--ec-border));box-shadow:0 0 0 3px color-mix(in srgb,var(--ec-primary) 14%,transparent)}
      .ec-software-note{border:1px solid color-mix(in srgb,var(--ec-primary) 26%,var(--ec-border));border-radius:1rem;padding:.8rem;background:color-mix(in srgb,var(--ec-primary) 8%,transparent);color:var(--ec-txtforbg2);line-height:1.55}
      .ec-software-loading,.ec-software-locked,.ec-software-empty{display:grid;place-items:center;min-height:16rem;padding:1.3rem;color:var(--ec-txtforbg2);text-align:center;border:1px dashed var(--ec-border);border-radius:1.35rem;background:color-mix(in srgb,var(--ec-bg2) 30%,transparent)}
      .ec-software-locked strong,.ec-software-empty strong{display:block;color:var(--ec-txtforbg1);font-size:1.05rem;margin-bottom:.35rem}
      .ec-software-mini-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem}
      .ec-software-mini-stat{border:1px solid color-mix(in srgb,var(--ec-border) 82%,transparent);border-radius:1rem;padding:.72rem;background:color-mix(in srgb,var(--ec-bg1) 22%,transparent)}
      .ec-software-switch{display:inline-grid;grid-template-columns:auto 1fr;align-items:center;gap:.5rem;color:var(--ec-txtforbg2);font-size:.82rem;font-weight:900}
      .ec-software-switch input{width:1rem;height:1rem;accent-color:var(--ec-primary)}
      .ec-software-scroll{max-height:clamp(24rem,68vh,42rem);overflow:auto;padding-right:.25rem}
      .ec-software-recipient-card,.ec-software-user-group,.ec-software-bonus-card{border-radius:1rem;padding:.75rem;display:grid;gap:.6rem}
      .ec-software-recipient-head,.ec-software-user-head{display:flex;align-items:center;justify-content:space-between;gap:.75rem}
      .ec-software-recipient-head strong,.ec-software-user-head strong{color:var(--ec-txtforbg1)}
      .ec-software-check-list{display:grid;gap:.45rem}
      .ec-software-check-item{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.55rem;align-items:start;border:1px solid color-mix(in srgb,var(--ec-border) 75%,transparent);border-radius:.85rem;padding:.6rem;background:color-mix(in srgb,var(--ec-bg1) 16%,transparent)}
      .ec-software-check-item input{margin-top:.15rem;accent-color:var(--ec-primary)}
      .ec-software-check-item strong{color:var(--ec-txtforbg1);display:block;overflow-wrap:anywhere}
      .ec-software-check-item span{color:var(--ec-txtforbg2);display:block;font-size:.78rem;overflow-wrap:anywhere}
      .ec-software-pill{display:inline-flex;align-items:center;justify-content:center;min-height:1.55rem;border:1px solid var(--ec-border);border-radius:var(--ec-radius-full);padding:.25rem .55rem;background:color-mix(in srgb,var(--ec-bg1) 34%,transparent);color:var(--ec-txtforbg2);font-size:.68rem;font-weight:950;text-transform:uppercase;letter-spacing:.055em}
      .ec-software-toast-stream{display:grid;gap:.45rem;max-height:16rem;overflow:auto}
      .ec-software-toast-line{border:1px solid color-mix(in srgb,var(--ec-success) 32%,var(--ec-border));border-radius:.9rem;padding:.55rem .65rem;color:var(--ec-txtforbg1);background:color-mix(in srgb,var(--ec-success) 8%,transparent);font-size:.82rem}
      .ec-software-modal-body{display:grid;gap:.85rem}
      .ec-software-modal-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:.5rem}
      .ec-software-nocopy input{user-select:none;-webkit-user-select:none;letter-spacing:.12em;font-weight:1000;text-align:center}
      @media (min-width:760px){
        .ec-software-head{grid-template-columns:1fr minmax(280px,420px)}
        .ec-software-console-top{grid-template-columns:1fr minmax(520px,680px)}
        .ec-software-tabs{grid-template-columns:repeat(4,minmax(0,1fr));border-radius:1.55rem}
        .ec-software-tab{border-radius:1.08rem}
        .ec-software-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        .ec-software-grid-2{grid-template-columns:repeat(2,minmax(0,1fr))}
        .ec-software-mini-stats{grid-template-columns:repeat(4,minmax(0,1fr))}
      }
      @media (max-width:640px){
        .ec-software-tabs{grid-template-columns:1fr;border-radius:1.2rem}
        .ec-software-tab{border-radius:1rem}
      }
    `;

    document.head.appendChild(style);
  }

  window.SoftwareDesign = { inject };
})();
