/* ELECTRICREDIT V2 - PEOPLEWARE DESIGN v12 */
(function () {
  "use strict";

  const ID = "electricredit-peopleware-design-v12";

  function inject() {
    [
      "electricredit-peopleware-design-v5",
      "electricredit-peopleware-design-v6",
      "electricredit-peopleware-design-v7",
      "electricredit-peopleware-design-v8",
      "electricredit-peopleware-design-v9",
      "electricredit-peopleware-design-v10",
      "electricredit-peopleware-design-v11",
      "electricredit-peopleware-expanded-width-hotfix-v12",
      ID
    ].forEach(function (id) {
      const old = document.getElementById(id);
      if (old) old.remove();
    });

    const style = document.createElement("style");
    style.id = ID;
    style.textContent = `
      .ec-peopleware{position:relative;overflow:hidden;text-align:left}
      .ec-peopleware,.ec-peopleware *{box-sizing:border-box}
      .ec-peopleware-shell{width:min(1180px,100%);margin-inline:auto;display:grid;gap:1rem}

      .ec-peopleware-head,
      .ec-peopleware-console,
      .ec-peopleware-stat,
      .ec-peopleware-metric,
      .ec-peopleware-person,
      .ec-peopleware-card-item,
      .ec-pw-controlbar,
      .ec-pw-block,
      .ec-pw-row{
        border:1px solid var(--ec-border);
        background:linear-gradient(145deg,color-mix(in srgb,var(--ec-card) 88%,transparent),color-mix(in srgb,var(--ec-bg2) 72%,transparent));
        box-shadow:0 22px 70px color-mix(in srgb,var(--ec-shadow) 70%,transparent),inset 0 1px 0 color-mix(in srgb,var(--ec-txtforbg1) 7%,transparent);
        backdrop-filter:blur(18px);
        -webkit-backdrop-filter:blur(18px);
      }

      .ec-peopleware-head{
        display:grid;
        gap:1rem;
        align-items:end;
        border-radius:var(--ec-radius-2xl);
        padding:clamp(1rem,3vw,1.65rem);
      }

      .ec-peopleware-kicker{
        display:inline-flex;
        align-items:center;
        width:fit-content;
        border:1px solid color-mix(in srgb,var(--ec-primary) 34%,var(--ec-border));
        border-radius:var(--ec-radius-full);
        padding:.36rem .72rem;
        background:color-mix(in srgb,var(--ec-primary) 10%,transparent);
        color:var(--ec-primary);
        font-size:.72rem;
        font-weight:950;
        letter-spacing:.08em;
        text-transform:uppercase;
      }

      .ec-peopleware-head h2{
        margin:.65rem 0 0;
        color:var(--ec-txtforbg1);
        font-size:clamp(2rem,7vw,4.6rem);
        line-height:.92;
        letter-spacing:-.07em;
        font-weight:1000;
        text-align:left;
      }

      .ec-peopleware-head p{
        max-width:64ch;
        margin:.75rem 0 0;
        color:var(--ec-txtforbg2);
        line-height:1.7;
        text-align:left;
      }

      .ec-peopleware-status{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:.65rem;
      }

      .ec-peopleware-stat,
      .ec-peopleware-metric{
        border-radius:1.2rem;
        padding:.82rem;
        text-align:left;
      }

      .ec-peopleware-stat span,
      .ec-peopleware-metric span,
      .ec-peopleware-detail span,
      .ec-peopleware-form-field span{
        display:block;
        color:var(--ec-txtforbg2);
        font-size:.72rem;
        font-weight:900;
        letter-spacing:.08em;
        text-transform:uppercase;
      }

      .ec-peopleware-stat strong,
      .ec-peopleware-metric strong{
        display:block;
        margin-top:.15rem;
        color:var(--ec-txtforbg1);
        font-size:clamp(1.2rem,4vw,1.85rem);
        font-weight:1000;
        letter-spacing:-.05em;
      }

      .ec-peopleware-console{
        border-radius:var(--ec-radius-2xl);
        padding:clamp(.9rem,2.4vw,1.15rem);
      }

      .ec-peopleware-console-top{
        display:grid;
        gap:.85rem;
        align-items:center;
        margin-bottom:1rem;
      }

      .ec-peopleware-console-title strong{
        display:block;
        color:var(--ec-txtforbg1);
        font-size:clamp(1rem,2.8vw,1.28rem);
        font-weight:1000;
        letter-spacing:-.04em;
      }

      .ec-peopleware-console-title span{
        display:block;
        margin-top:.2rem;
        color:var(--ec-txtforbg2);
        font-size:.86rem;
        line-height:1.45;
      }

      .ec-peopleware-tabs{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:.25rem;
        padding:.3rem;
        border:1px solid color-mix(in srgb,var(--ec-border) 86%,var(--ec-primary));
        border-radius:var(--ec-radius-full);
        background:linear-gradient(145deg,color-mix(in srgb,var(--ec-bg1) 78%,transparent),color-mix(in srgb,var(--ec-bg2) 84%,transparent));
        box-shadow:inset 0 1px 0 color-mix(in srgb,var(--ec-txtforbg1) 8%,transparent),inset 0 -14px 30px color-mix(in srgb,var(--ec-shadow) 42%,transparent);
      }

      .ec-peopleware-tab{
        min-height:2.85rem;
        border:0;
        border-radius:var(--ec-radius-full);
        padding:.44rem .5rem;
        background:transparent;
        color:var(--ec-txtforbg2);
        display:grid;
        justify-items:center;
        align-items:center;
        gap:.08rem;
        text-align:center;
        transition:transform var(--ec-transition-fast),background var(--ec-transition),color var(--ec-transition),box-shadow var(--ec-transition);
      }

      .ec-peopleware-tab strong{
        color:inherit;
        font-size:.74rem;
        font-weight:950;
        letter-spacing:.04em;
        text-transform:uppercase;
        line-height:1.05;
      }

      .ec-peopleware-tab span{
        color:inherit;
        opacity:.72;
        font-size:.64rem;
        line-height:1.05;
        white-space:nowrap;
      }

      .ec-peopleware-tab:hover{
        color:var(--ec-txtforbg1);
        transform:translateY(-1px);
      }

      .ec-peopleware-tab.is-active{
        color:var(--ec-txtforprimary);
        background:linear-gradient(135deg,color-mix(in srgb,var(--ec-primary) 96%,var(--ec-txtforbg1) 4%),color-mix(in srgb,var(--ec-secondary) 84%,var(--ec-primary)));
        box-shadow:0 12px 34px color-mix(in srgb,var(--ec-primary) 32%,transparent),inset 0 1px 0 color-mix(in srgb,var(--ec-txtforbg1) 36%,transparent);
      }

      .ec-peopleware-panel:not(.is-active){display:none}
      .ec-peopleware-module{display:grid;gap:1rem;text-align:left;width:100%}

      .ec-peopleware-toolbar{
        display:flex;
        flex-wrap:wrap;
        align-items:center;
        justify-content:space-between;
        gap:.75rem;
        padding:.8rem;
        border:1px solid color-mix(in srgb,var(--ec-border) 84%,transparent);
        border-radius:1.25rem;
        background:color-mix(in srgb,var(--ec-bg1) 24%,transparent);
      }

      .ec-peopleware-toolbar strong{
        display:block;
        color:var(--ec-txtforbg1);
        font-size:1rem;
        font-weight:1000;
      }

      .ec-peopleware-toolbar span{
        display:block;
        margin-top:.18rem;
        color:var(--ec-txtforbg2);
        font-size:.82rem;
      }

      .ec-pw-controlbar{
        display:grid;
        grid-template-columns:1fr;
        gap:.65rem;
        border-radius:1.2rem;
        padding:.75rem;
      }

      .ec-pw-search,
      .ec-pw-select{
        width:100%;
        min-height:2.65rem;
        border:1px solid var(--ec-border);
        border-radius:1rem;
        padding:.65rem .8rem;
        background:color-mix(in srgb,var(--ec-bg1) 42%,transparent);
        color:var(--ec-txtforbg1);
        outline:none;
      }

      .ec-pw-search:focus,
      .ec-pw-select:focus{
        border-color:color-mix(in srgb,var(--ec-primary) 65%,var(--ec-border));
        box-shadow:0 0 0 3px color-mix(in srgb,var(--ec-primary) 14%,transparent);
      }

      .ec-pw-filter-row{
        display:grid;
        grid-template-columns:1fr;
        gap:.55rem;
      }

      .ec-peopleware-actions,
      .ec-peopleware-person-actions,
      .ec-peopleware-card-actions,
      .ec-peopleware-pay-tabs{
        display:flex;
        flex-wrap:wrap;
        gap:.48rem;
      }

      .ec-peopleware-btn{
        min-height:2.25rem;
        border:1px solid color-mix(in srgb,var(--ec-border) 82%,var(--ec-primary));
        border-radius:var(--ec-radius-full);
        padding:.45rem .76rem;
        background:linear-gradient(145deg,color-mix(in srgb,var(--ec-card) 76%,transparent),color-mix(in srgb,var(--ec-bg2) 76%,transparent));
        color:var(--ec-txtforbg1);
        font-size:.76rem;
        font-weight:900;
        transition:transform var(--ec-transition-fast),border-color var(--ec-transition),background var(--ec-transition),box-shadow var(--ec-transition);
      }

      .ec-peopleware-btn:hover:not(:disabled){
        transform:translateY(-1px);
        border-color:color-mix(in srgb,var(--ec-primary) 62%,var(--ec-border));
        background:color-mix(in srgb,var(--ec-primary) 13%,var(--ec-card));
        box-shadow:0 14px 34px color-mix(in srgb,var(--ec-shadow) 65%,transparent);
      }

      .ec-peopleware-btn:disabled{opacity:.48;cursor:not-allowed}
      .ec-peopleware-btn-primary{border-color:color-mix(in srgb,var(--ec-primary) 58%,var(--ec-border));background:color-mix(in srgb,var(--ec-primary) 15%,var(--ec-card))}
      .ec-peopleware-btn-danger{border-color:color-mix(in srgb,var(--ec-danger) 62%,var(--ec-border));color:color-mix(in srgb,var(--ec-danger) 78%,var(--ec-txtforbg1))}
      .ec-peopleware-btn-warning{border-color:color-mix(in srgb,var(--ec-warning) 62%,var(--ec-border));color:color-mix(in srgb,var(--ec-warning) 86%,var(--ec-txtforbg1))}

      .ec-peopleware-scroll{
        max-height:clamp(30rem,72vh,48rem);
        min-height:18rem;
        overflow-y:auto;
        overflow-x:hidden;
        padding-right:.25rem;
      }

      .ec-peopleware-card-scroll{
        max-height:clamp(18rem,52vh,34rem);
        overflow-y:auto;
        overflow-x:hidden;
        padding-right:.25rem;
      }

      .ec-peopleware-grid{
        display:grid;
        grid-template-columns:1fr;
        gap:.85rem;
        width:100%;
      }

      .ec-peopleware-person{
        position:relative;
        overflow:hidden;
        min-height:8.8rem;
        display:grid;
        grid-template-columns:auto minmax(0,1fr);
        gap:.9rem;
        align-items:start;
        border-radius:1.35rem;
        padding:.95rem;
        text-align:left;
        transition:transform var(--ec-transition-fast),border-color var(--ec-transition),box-shadow var(--ec-transition);
      }

      .ec-peopleware-person::before{
        content:"";
        position:absolute;
        inset:0 auto 0 0;
        width:.25rem;
        background:var(--person-accent,var(--ec-primary));
      }

      .ec-peopleware-person.is-using::before{width:.42rem;background:linear-gradient(180deg,var(--ec-success),var(--ec-primary))}
      .ec-peopleware-person.is-debt::before{background:linear-gradient(180deg,var(--ec-warning),var(--ec-danger))}
      .ec-peopleware-person.is-cutoff::before{width:.42rem;background:var(--ec-danger)}

      .ec-peopleware-person:hover{
        transform:translateY(-2px);
        border-color:color-mix(in srgb,var(--person-accent,var(--ec-primary)) 48%,var(--ec-border));
        box-shadow:0 28px 80px color-mix(in srgb,var(--ec-shadow) 74%,transparent),inset 0 1px 0 color-mix(in srgb,var(--ec-txtforbg1) 10%,transparent);
      }

      .ec-peopleware-avatar{
        position:relative;
        z-index:1;
        width:clamp(4.8rem,12vw,5.8rem);
        height:clamp(4.8rem,12vw,5.8rem);
        object-fit:cover;
        border-radius:1.25rem;
        border:1px solid color-mix(in srgb,var(--person-accent,var(--ec-primary)) 38%,var(--ec-border));
        background:linear-gradient(145deg,color-mix(in srgb,var(--person-accent,var(--ec-primary)) 12%,var(--ec-card)),color-mix(in srgb,var(--ec-bg2) 86%,transparent));
        box-shadow:0 14px 34px color-mix(in srgb,var(--ec-shadow) 62%,transparent),inset 0 1px 0 color-mix(in srgb,var(--ec-txtforbg1) 10%,transparent);
        cursor:pointer;
      }

      .ec-peopleware-avatar:hover{filter:brightness(1.07)}

      .ec-peopleware-person-body{
        position:relative;
        z-index:1;
        display:grid;
        gap:.38rem;
        min-width:0;
        text-align:left;
        justify-items:start;
      }

      .ec-peopleware-name-row{
        width:100%;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:.65rem;
        min-width:0;
      }

      .ec-peopleware-name{
        color:var(--ec-txtforbg1);
        font-size:clamp(1rem,2.6vw,1.16rem);
        font-weight:1000;
        letter-spacing:-.04em;
        line-height:1.15;
        min-width:0;
        overflow-wrap:anywhere;
      }

      .ec-peopleware-id{
        flex:0 0 auto;
        color:var(--ec-txtforbg2);
        font-size:.82rem;
        font-weight:950;
      }

      .ec-peopleware-line{
        display:flex;
        align-items:center;
        gap:.44rem;
        color:var(--ec-txtforbg2);
        font-size:.86rem;
        line-height:1.35;
        min-width:0;
        max-width:100%;
        overflow-wrap:anywhere;
        text-align:left;
      }

      .ec-peopleware-line strong{color:var(--ec-primary);font-weight:950}

      .ec-peopleware-mini-icon{
        display:inline-grid;
        place-items:center;
        flex:0 0 auto;
        width:1.05rem;
        height:1.05rem;
        color:color-mix(in srgb,var(--person-accent,var(--ec-primary)) 82%,var(--ec-txtforbg1));
      }

      .ec-peopleware-chip{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        width:fit-content;
        min-height:1.45rem;
        border:1px solid var(--ec-border);
        border-radius:var(--ec-radius-full);
        padding:.24rem .52rem;
        background:color-mix(in srgb,var(--ec-bg1) 34%,transparent);
        color:var(--ec-txtforbg2);
        font-size:.66rem;
        font-weight:950;
        text-transform:uppercase;
        letter-spacing:.055em;
        line-height:1;
      }

      .ec-chip-row{display:flex;flex-wrap:wrap;gap:.35rem}
      .ec-chip-user,.ec-chip-administrator{color:var(--ec-primary);border-color:color-mix(in srgb,var(--ec-primary) 44%,var(--ec-border))}
      .ec-chip-developer,.ec-chip-active,.ec-chip-applied,.ec-chip-enabled,.ec-chip-using,.ec-chip-balance{color:var(--ec-success);border-color:color-mix(in srgb,var(--ec-success) 44%,var(--ec-border))}
      .ec-chip-owner,.ec-chip-pending,.ec-chip-hold,.ec-chip-busy,.ec-chip-debt{color:var(--ec-warning);border-color:color-mix(in srgb,var(--ec-warning) 44%,var(--ec-border))}
      .ec-chip-banned,.ec-chip-disabled,.ec-chip-failed,.ec-chip-cancelled,.ec-chip-cutoff{color:var(--ec-danger);border-color:color-mix(in srgb,var(--ec-danger) 44%,var(--ec-border))}

      .ec-peopleware-person-actions{margin-top:.35rem}
      .ec-peopleware-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem}

      .ec-peopleware-loading,
      .ec-peopleware-empty{
        display:grid;
        place-items:center;
        min-height:16rem;
        padding:1.3rem;
        color:var(--ec-txtforbg2);
        text-align:center;
        border:1px dashed var(--ec-border);
        border-radius:1.35rem;
        background:color-mix(in srgb,var(--ec-bg2) 30%,transparent);
      }

      .ec-peopleware-empty strong{
        display:block;
        color:var(--ec-txtforbg1);
        font-size:1.05rem;
        margin-bottom:.35rem;
      }

      .ec-pw-expanded{display:grid;gap:.85rem}

      .ec-pw-top{
        display:grid;
        grid-template-columns:1fr;
        gap:.85rem;
      }

      .ec-pw-image-card{
        display:grid!important;
        grid-template-columns:minmax(14rem,1fr) minmax(0,1fr)!important;
        align-items:stretch!important;
        gap:.9rem!important;
        border:1px solid color-mix(in srgb,var(--ec-border) 80%,transparent);
        border-radius:1.1rem;
        padding:.75rem;
        background:color-mix(in srgb,var(--ec-bg1) 18%,transparent);
      }

      .ec-pw-image-card .ec-peopleware-avatar{
        width:100%!important;
        height:100%!important;
        min-height:15rem!important;
        object-fit:cover!important;
        border-radius:1.15rem!important;
      }

      .ec-pw-field-stack{
        display:grid!important;
        grid-template-rows:repeat(4,minmax(0,1fr))!important;
        gap:.55rem!important;
      }

      .ec-pw-pair-grid{
        display:grid;
        grid-template-columns:1fr;
        gap:.85rem;
      }

      .ec-pw-row,
      .ec-pw-block{
        border-radius:1rem;
        padding:.7rem;
        text-align:left;
      }

      .ec-pw-row{
        min-height:3.3rem;
        display:grid;
        align-content:center;
      }

      .ec-pw-row span,
      .ec-pw-block>span{
        display:block;
        color:var(--ec-txtforbg2);
        font-size:.72rem;
        font-weight:950;
        text-transform:uppercase;
        letter-spacing:.07em;
      }

      .ec-pw-row strong{
        display:block;
        margin-top:.18rem;
        color:var(--ec-txtforbg1);
        font-size:.93rem;
        font-weight:950;
        overflow-wrap:anywhere;
      }

      .ec-pw-simple-list{
        margin:.45rem 0 0;
        padding-left:1.2rem;
        color:var(--ec-txtforbg1);
      }

      .ec-pw-simple-list li{
        margin:.22rem 0;
        overflow-wrap:anywhere;
      }

      .ec-pw-simple-list a{
        color:var(--ec-txtforbg1);
        text-decoration:none;
      }

      .ec-pw-simple-list a:hover{text-decoration:underline}

      .ec-peopleware-detail-grid,
      .ec-peopleware-modal-details,
      .ec-peopleware-form-grid,
      .ec-peopleware-card-grid{
        display:grid;
        grid-template-columns:1fr;
        gap:.6rem;
      }

      .ec-peopleware-detail{
        border:1px solid color-mix(in srgb,var(--ec-border) 80%,transparent);
        border-radius:1rem;
        padding:.68rem;
        background:color-mix(in srgb,var(--ec-bg1) 20%,transparent);
        text-align:left;
      }

      .ec-peopleware-detail strong{
        display:block;
        margin-top:.18rem;
        color:var(--ec-txtforbg1);
        font-size:.9rem;
        font-weight:950;
        overflow-wrap:anywhere;
      }

      .ec-peopleware-list{
        display:grid;
        gap:.42rem;
        margin:.35rem 0 0;
        padding:0;
        list-style:none;
      }

      .ec-peopleware-list li{
        display:grid;
        grid-template-columns:minmax(6rem,10rem) minmax(0,1fr) auto;
        gap:.55rem;
        align-items:center;
        border:1px solid color-mix(in srgb,var(--ec-border) 75%,transparent);
        border-radius:.8rem;
        padding:.55rem;
        background:color-mix(in srgb,var(--ec-bg1) 16%,transparent);
      }

      .ec-peopleware-list-label{
        color:var(--ec-txtforbg2);
        font-size:.74rem;
        font-weight:950;
        text-transform:uppercase;
        letter-spacing:.04em;
      }

      .ec-peopleware-list a,
      .ec-peopleware-list-value{
        color:var(--ec-txtforbg1);
        font-weight:850;
        overflow-wrap:anywhere;
        text-decoration:none;
      }

      .ec-peopleware-list a:hover{text-decoration:underline}

      .ec-copy-btn{
        min-height:1.8rem;
        border:1px solid var(--ec-border);
        border-radius:999px;
        padding:.25rem .55rem;
        background:color-mix(in srgb,var(--ec-card) 70%,transparent);
        color:var(--ec-txtforbg2);
        font-size:.68rem;
        font-weight:950;
      }

      .ec-copy-btn:hover{
        color:var(--ec-txtforbg1);
        border-color:color-mix(in srgb,var(--ec-primary) 50%,var(--ec-border));
      }

      .ec-peopleware-bullets{
        margin:.35rem 0 0;
        padding-left:1.1rem;
        color:var(--ec-txtforbg1);
      }

      .ec-peopleware-bullets li{
        margin:.18rem 0;
        overflow-wrap:anywhere;
      }

      .ec-peopleware-card-item{
        position:relative;
        overflow:hidden;
        display:grid;
        gap:.68rem;
        border-radius:1.2rem;
        padding:.85rem;
        text-align:left;
        transition:transform var(--ec-transition-fast),border-color var(--ec-transition),box-shadow var(--ec-transition);
      }

      .ec-peopleware-card-item:hover{
        transform:translateY(-1px);
        border-color:color-mix(in srgb,var(--ec-primary) 42%,var(--ec-border));
      }

      .ec-peopleware-card-head{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:.65rem;
      }

      .ec-peopleware-card-head strong{
        color:var(--ec-txtforbg1);
        font-size:1rem;
        font-weight:1000;
        letter-spacing:-.04em;
      }

      .ec-peopleware-card-head span{
        display:block;
        margin-top:.18rem;
        color:var(--ec-txtforbg2);
        font-size:.78rem;
        overflow-wrap:anywhere;
      }

      .ec-peopleware-pay-tabs{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:.5rem;
        margin-bottom:.85rem;
      }

      .ec-peopleware-pay-option{
        border:1px solid var(--ec-border);
        border-radius:1rem;
        padding:.78rem;
        background:color-mix(in srgb,var(--ec-bg1) 28%,transparent);
        color:var(--ec-txtforbg1);
        text-align:left;
      }

      .ec-peopleware-pay-option:disabled{opacity:.48;cursor:not-allowed}

      .ec-peopleware-pay-option.is-active{
        border-color:color-mix(in srgb,var(--ec-primary) 60%,var(--ec-border));
        background:color-mix(in srgb,var(--ec-primary) 12%,var(--ec-card));
      }

      .ec-peopleware-pay-option strong,
      .ec-peopleware-pay-option span{display:block}

      .ec-peopleware-pay-option span{
        margin-top:.2rem;
        color:var(--ec-txtforbg2);
        font-size:.78rem;
      }

      .ec-peopleware-form{display:grid;gap:.85rem}

      .ec-peopleware-form-field input,
      .ec-peopleware-form-field select,
      .ec-peopleware-form-field textarea{
        width:100%;
        margin-top:.35rem;
        min-height:2.75rem;
        border:1px solid var(--ec-border);
        border-radius:1rem;
        padding:.72rem .82rem;
        background:color-mix(in srgb,var(--ec-bg1) 42%,transparent);
        color:var(--ec-txtforbg1);
        outline:none;
      }

      .ec-peopleware-form-field textarea{
        min-height:7rem;
        resize:vertical;
      }

      .ec-peopleware-form-field input[readonly]{
        opacity:.68;
        cursor:not-allowed;
      }

      .ec-peopleware-note{
        border:1px solid color-mix(in srgb,var(--ec-primary) 26%,var(--ec-border));
        border-radius:1rem;
        padding:.8rem;
        background:color-mix(in srgb,var(--ec-primary) 8%,transparent);
        color:var(--ec-txtforbg2);
        line-height:1.55;
        text-align:left;
      }

      .ec-image-picker{display:grid;gap:.55rem}

      .ec-image-picker-preview{
        display:flex;
        align-items:center;
        gap:.75rem;
        border:1px solid color-mix(in srgb,var(--ec-border) 80%,transparent);
        border-radius:1rem;
        padding:.65rem;
        background:color-mix(in srgb,var(--ec-bg1) 18%,transparent);
      }

      .ec-image-picker-preview img{
        width:4.25rem;
        height:4.25rem;
        border-radius:.9rem;
        object-fit:cover;
        border:1px solid var(--ec-border);
      }

      .ec-image-picker-actions{
        display:flex;
        flex-wrap:wrap;
        gap:.45rem;
      }

      .ec-image-preview-large{
        width:min(76vw,520px);
        max-height:70vh;
        object-fit:contain;
        border-radius:1rem;
        border:1px solid var(--ec-border);
        background:color-mix(in srgb,var(--ec-bg1) 60%,transparent);
      }

      .ec-modal-backdrop[data-peopleware-modal][hidden]{display:none!important}

      @media (min-width:760px){
        .ec-peopleware-head{grid-template-columns:1fr minmax(280px,420px)}
        .ec-peopleware-console-top{grid-template-columns:1fr minmax(420px,540px)}
        .ec-pw-controlbar{grid-template-columns:minmax(260px,1fr) minmax(240px,.72fr)}
        .ec-pw-filter-row{grid-template-columns:repeat(2,minmax(0,1fr))}
        .ec-peopleware-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        .ec-peopleware-metrics{grid-template-columns:repeat(4,minmax(0,1fr))}
        .ec-peopleware-detail-grid,
        .ec-peopleware-modal-details,
        .ec-peopleware-form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        .ec-pw-pair-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        .ec-pw-block.ec-pw-span-2{grid-column:1 / -1}
      }

      @media (max-width:640px){
        .ec-peopleware-tabs{grid-template-columns:1fr;border-radius:1.2rem}
        .ec-peopleware-tab{border-radius:1rem}
        .ec-peopleware-person{grid-template-columns:auto minmax(0,1fr);gap:.72rem}
        .ec-peopleware-avatar{width:4.35rem;height:4.35rem;border-radius:1rem}
        .ec-peopleware-name-row{align-items:flex-start}
        .ec-peopleware-list li{grid-template-columns:1fr;gap:.35rem}
        .ec-pw-image-card{grid-template-columns:1fr!important}
        .ec-pw-image-card .ec-peopleware-avatar{
          min-height:14rem!important;
          height:14rem!important;
        }
        .ec-peopleware-pay-tabs{grid-template-columns:1fr}
      }
    `;

    document.head.appendChild(style);
  }

  window.PeoplewareDesign = { inject: inject };
})();
