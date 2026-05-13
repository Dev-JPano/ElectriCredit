/* ELECTRICREDIT V2 - ABOUT DESIGN v2 */
(function () {
  "use strict";

  const ID = "electricredit-about-design-v2";

  function inject() {
    const old = document.getElementById("electricredit-about-design-v1");
    if (old) old.remove();

    if (document.getElementById(ID)) return;

    const style = document.createElement("style");
    style.id = ID;
    style.textContent = `
      .ec-about,
      .ec-about *{
        box-sizing:border-box;
      }

      .ec-about{
        position:relative;
        overflow:hidden;
        text-align:left;
      }

      .ec-about-shell{
        width:min(1180px,100%);
        margin-inline:auto;
        display:grid;
        gap:1rem;
      }

      .ec-about-hero,
      .ec-about-section,
      .ec-about-system-card,
      .ec-about-feature,
      .ec-about-compare article,
      .ec-about-hardware-card,
      .ec-about-flow-step,
      .ec-about-context-card,
      .ec-about-dev-card,
      .ec-about-ack-card{
        border:1px solid var(--ec-border);
        background:linear-gradient(145deg,color-mix(in srgb,var(--ec-card) 88%,transparent),color-mix(in srgb,var(--ec-bg2) 72%,transparent));
        box-shadow:0 22px 70px color-mix(in srgb,var(--ec-shadow) 70%,transparent),inset 0 1px 0 color-mix(in srgb,var(--ec-txtforbg1) 7%,transparent);
        backdrop-filter:blur(18px);
        -webkit-backdrop-filter:blur(18px);
      }

      .ec-about-hero{
        display:grid;
        gap:1rem;
        align-items:stretch;
        border-radius:var(--ec-radius-2xl);
        padding:clamp(1rem,3vw,1.65rem);
        overflow:hidden;
      }

      .ec-about-hero-copy{
        display:grid;
        align-content:center;
      }

      .ec-about-kicker{
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

      .ec-about-hero h2{
        margin:.7rem 0 0;
        color:var(--ec-txtforbg1);
        font-size:clamp(2rem,7vw,4.4rem);
        line-height:.92;
        letter-spacing:-.07em;
        font-weight:1000;
      }

      .ec-about-hero p{
        max-width:64ch;
        margin:.85rem 0 0;
        color:var(--ec-txtforbg2);
        line-height:1.7;
      }

      .ec-about-hero-actions{
        display:flex;
        flex-wrap:wrap;
        gap:.55rem;
        margin-top:1rem;
      }

      .ec-about-btn{
        min-height:2.4rem;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        border:1px solid color-mix(in srgb,var(--ec-border) 82%,var(--ec-primary));
        border-radius:var(--ec-radius-full);
        padding:.55rem .9rem;
        background:linear-gradient(145deg,color-mix(in srgb,var(--ec-card) 76%,transparent),color-mix(in srgb,var(--ec-bg2) 76%,transparent));
        color:var(--ec-txtforbg1);
        text-decoration:none;
        font-size:.78rem;
        font-weight:950;
        transition:transform var(--ec-transition-fast),border-color var(--ec-transition),background var(--ec-transition),box-shadow var(--ec-transition);
      }

      .ec-about-btn:hover{
        transform:translateY(-1px);
        border-color:color-mix(in srgb,var(--ec-primary) 62%,var(--ec-border));
        background:color-mix(in srgb,var(--ec-primary) 13%,var(--ec-card));
        box-shadow:0 14px 34px color-mix(in srgb,var(--ec-shadow) 65%,transparent);
      }

      .ec-about-btn-primary{
        color:var(--ec-txtforprimary);
        background:linear-gradient(135deg,color-mix(in srgb,var(--ec-primary) 96%,var(--ec-txtforbg1) 4%),color-mix(in srgb,var(--ec-secondary) 84%,var(--ec-primary)));
        border-color:color-mix(in srgb,var(--ec-primary) 62%,var(--ec-border));
      }

      .ec-about-system-card{
        position:relative;
        min-height:22rem;
        display:grid;
        grid-template-rows:1fr auto;
        gap:1rem;
        border-radius:1.6rem;
        padding:1rem;
        overflow:hidden;
        isolation:isolate;
      }

      .ec-about-system-visual{
        position:relative;
        min-height:12rem;
        border:1px solid color-mix(in srgb,var(--ec-border) 70%,transparent);
        border-radius:1.25rem;
        background:
          radial-gradient(circle at 50% 50%,color-mix(in srgb,var(--ec-primary) 20%,transparent),transparent 38%),
          color-mix(in srgb,var(--ec-bg1) 20%,transparent);
        overflow:hidden;
      }

      .ec-about-system-visual::before{
        content:"";
        position:absolute;
        inset:18%;
        border:1px dashed color-mix(in srgb,var(--ec-primary) 35%,transparent);
        border-radius:50%;
      }

      .ec-about-system-visual .node{
        position:absolute;
        display:grid;
        place-items:center;
        min-width:3.1rem;
        height:3.1rem;
        border-radius:1rem;
        border:1px solid color-mix(in srgb,var(--ec-primary) 42%,var(--ec-border));
        background:color-mix(in srgb,var(--ec-card) 86%,var(--ec-primary));
        color:var(--ec-txtforbg1);
        font-weight:1000;
        box-shadow:0 16px 38px color-mix(in srgb,var(--ec-shadow) 68%,transparent);
      }

      .node-pi{
        left:50%;
        top:50%;
        transform:translate(-50%,-50%);
        color:var(--ec-primary) !important;
      }

      .node-hub{
        left:12%;
        top:18%;
      }

      .node-reg{
        right:12%;
        top:20%;
      }

      .node-db{
        left:50%;
        bottom:10%;
        transform:translateX(-50%);
      }

      .ec-about-system-content{
        position:relative;
        z-index:1;
        display:grid;
        gap:.75rem;
      }

      .ec-about-system-content > strong{
        color:var(--ec-txtforbg1);
        font-size:1.45rem;
        font-weight:1000;
        letter-spacing:-.05em;
      }

      .ec-about-system-content > p{
        margin:0;
        color:var(--ec-txtforbg2);
        line-height:1.5;
      }

      .ec-about-system-grid{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:.55rem;
      }

      .ec-about-system-grid article{
        border:1px solid color-mix(in srgb,var(--ec-border) 78%,transparent);
        border-radius:1rem;
        padding:.65rem;
        background:color-mix(in srgb,var(--ec-bg1) 22%,transparent);
        min-width:0;
      }

      .ec-about-system-grid span{
        display:block;
        color:var(--ec-txtforbg2);
        font-size:.66rem;
        font-weight:900;
        letter-spacing:.08em;
        text-transform:uppercase;
      }

      .ec-about-system-grid strong{
        display:block;
        margin-top:.12rem;
        color:var(--ec-txtforbg1);
        font-size:.82rem;
        font-weight:950;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }

      .ec-about-section{
        border-radius:var(--ec-radius-2xl);
        padding:clamp(1rem,3vw,1.35rem);
        display:grid;
        gap:1rem;
      }

      .ec-about-section-head{
        display:grid;
        grid-template-columns:auto minmax(0,1fr);
        gap:.85rem;
        align-items:start;
      }

      .ec-about-section-head > span{
        width:2.35rem;
        height:2.35rem;
        display:grid;
        place-items:center;
        border:1px solid color-mix(in srgb,var(--ec-primary) 40%,var(--ec-border));
        border-radius:.9rem;
        background:color-mix(in srgb,var(--ec-primary) 12%,transparent);
        color:var(--ec-primary);
        font-weight:1000;
      }

      .ec-about-section h3{
        margin:0;
        color:var(--ec-txtforbg1);
        font-size:clamp(1.35rem,4vw,2.15rem);
        line-height:1;
        letter-spacing:-.055em;
        font-weight:1000;
      }

      .ec-about-section-head p{
        margin:.45rem 0 0;
        color:var(--ec-txtforbg2);
        line-height:1.7;
      }

      .ec-about-feature-grid,
      .ec-about-hardware-grid,
      .ec-about-context-grid,
      .ec-about-dev-grid{
        display:grid;
        grid-template-columns:1fr;
        gap:.75rem;
      }

      .ec-about-feature{
        display:grid;
        grid-template-columns:auto minmax(0,1fr);
        gap:.65rem;
        align-items:start;
        border-radius:1rem;
        padding:.75rem;
      }

      .ec-about-feature span{
        width:1.65rem;
        height:1.65rem;
        display:grid;
        place-items:center;
        border-radius:50%;
        background:color-mix(in srgb,var(--ec-success) 15%,transparent);
        color:color-mix(in srgb,var(--ec-success) 84%,var(--ec-txtforbg1));
        font-weight:1000;
      }

      .ec-about-feature strong{
        color:var(--ec-txtforbg1);
        line-height:1.45;
      }

      .ec-about-compare{
        display:grid;
        grid-template-columns:1fr;
        gap:.75rem;
      }

      .ec-about-compare article,
      .ec-about-hardware-card,
      .ec-about-context-card{
        border-radius:1.2rem;
        padding:1rem;
      }

      .ec-about-tag{
        display:inline-flex;
        width:fit-content;
        min-height:1.55rem;
        align-items:center;
        justify-content:center;
        border:1px solid var(--ec-border);
        border-radius:var(--ec-radius-full);
        padding:.25rem .55rem;
        font-size:.68rem;
        font-weight:950;
        text-transform:uppercase;
        letter-spacing:.055em;
      }

      .ec-about-tag.is-danger{
        color:color-mix(in srgb,var(--ec-danger) 84%,var(--ec-txtforbg1));
        border-color:color-mix(in srgb,var(--ec-danger) 44%,var(--ec-border));
        background:color-mix(in srgb,var(--ec-danger) 8%,transparent);
      }

      .ec-about-tag.is-success{
        color:color-mix(in srgb,var(--ec-success) 84%,var(--ec-txtforbg1));
        border-color:color-mix(in srgb,var(--ec-success) 44%,var(--ec-border));
        background:color-mix(in srgb,var(--ec-success) 8%,transparent);
      }

      .ec-about-compare h4,
      .ec-about-hardware-card h4,
      .ec-about-context-card strong,
      .ec-about-dev-card h4{
        margin:.65rem 0 .35rem;
        color:var(--ec-txtforbg1);
        font-size:1.08rem;
        font-weight:1000;
        letter-spacing:-.04em;
      }

      .ec-about-compare p,
      .ec-about-hardware-card p,
      .ec-about-context-card p{
        margin:0;
        color:var(--ec-txtforbg2);
        line-height:1.65;
      }

      .ec-about-hardware-card{
        position:relative;
        overflow:hidden;
      }

      .ec-about-hardware-icon{
        width:3rem;
        height:3rem;
        display:grid;
        place-items:center;
        border-radius:1rem;
        background:color-mix(in srgb,var(--ec-primary) 13%,transparent);
        color:var(--ec-primary);
        border:1px solid color-mix(in srgb,var(--ec-primary) 34%,var(--ec-border));
        font-weight:1000;
        font-size:1.05rem;
      }

      .ec-about-flow{
        display:grid;
        gap:.65rem;
      }

      .ec-about-flow-step{
        display:grid;
        grid-template-columns:auto minmax(0,1fr);
        gap:.75rem;
        align-items:start;
        border-radius:1rem;
        padding:.85rem;
      }

      .ec-about-flow-step > span{
        width:2rem;
        height:2rem;
        display:grid;
        place-items:center;
        border-radius:.8rem;
        background:color-mix(in srgb,var(--ec-primary) 12%,transparent);
        color:var(--ec-primary);
        font-weight:1000;
      }

      .ec-about-flow-step strong{
        display:block;
        color:var(--ec-txtforbg1);
        font-weight:1000;
      }

      .ec-about-flow-step p{
        margin:.18rem 0 0;
        color:var(--ec-txtforbg2);
        line-height:1.55;
      }

      .ec-about-note{
        border:1px solid color-mix(in srgb,var(--ec-primary) 26%,var(--ec-border));
        border-radius:1rem;
        padding:.85rem;
        background:color-mix(in srgb,var(--ec-primary) 8%,transparent);
        color:var(--ec-txtforbg2);
        line-height:1.6;
      }

      .ec-about-dev-card{
        display:grid;
        grid-template-columns:1fr;
        gap:.85rem;
        border-radius:1.25rem;
        padding:.85rem;
        min-width:0;
        transition:transform var(--ec-transition-fast),border-color var(--ec-transition),box-shadow var(--ec-transition);
      }

      .ec-about-dev-card:hover{
        transform:translateY(-2px);
        border-color:color-mix(in srgb,var(--ec-primary) 46%,var(--ec-border));
        box-shadow:0 28px 80px color-mix(in srgb,var(--ec-shadow) 74%,transparent),inset 0 1px 0 color-mix(in srgb,var(--ec-txtforbg1) 10%,transparent);
      }

      .ec-about-dev-image-btn{
        width:100%;
        border:0;
        padding:0;
        background:transparent;
        border-radius:1rem;
        overflow:hidden;
        cursor:pointer;
      }

      .ec-about-dev-image-btn img{
        width:100%;
        aspect-ratio:16/11;
        object-fit:cover;
        display:block;
        border-radius:1rem;
        border:1px solid color-mix(in srgb,var(--ec-primary) 35%,var(--ec-border));
        background:color-mix(in srgb,var(--ec-bg1) 35%,transparent);
      }

      .ec-about-dev-body{
        display:grid;
        gap:.75rem;
        min-width:0;
      }

      .ec-about-dev-top{
        display:flex;
        justify-content:space-between;
        gap:.75rem;
        align-items:flex-start;
      }

      .ec-about-dev-card h4{
        margin:0;
        overflow-wrap:anywhere;
      }

      .ec-about-dev-user{
        display:block;
        margin:.18rem 0 0;
        color:var(--ec-primary);
        font-size:.82rem;
        font-weight:900;
      }

      .ec-about-dev-chip{
        flex:0 0 auto;
        display:inline-flex;
        align-items:center;
        min-height:1.5rem;
        border:1px solid color-mix(in srgb,var(--ec-success) 44%,var(--ec-border));
        border-radius:var(--ec-radius-full);
        padding:.22rem .55rem;
        background:color-mix(in srgb,var(--ec-success) 8%,transparent);
        color:color-mix(in srgb,var(--ec-success) 84%,var(--ec-txtforbg1));
        font-size:.64rem;
        font-weight:950;
        text-transform:uppercase;
      }

      .ec-about-dev-roles{
        margin:0;
        padding-left:1.1rem;
        color:var(--ec-txtforbg2);
        line-height:1.45;
      }

      .ec-about-dev-contact{
        display:grid;
        grid-template-columns:1fr;
        gap:.5rem;
      }

      .ec-about-dev-contact-row{
        display:grid;
        grid-template-columns:5.25rem minmax(0,1fr);
        gap:.5rem;
        align-items:center;
        border:1px solid color-mix(in srgb,var(--ec-border) 75%,transparent);
        border-radius:.85rem;
        padding:.55rem;
        background:color-mix(in srgb,var(--ec-bg1) 18%,transparent);
        min-width:0;
      }

      .ec-about-dev-contact-row span{
        color:var(--ec-txtforbg2);
        font-size:.7rem;
        font-weight:950;
        text-transform:uppercase;
        letter-spacing:.06em;
      }

      .ec-about-dev-contact-row strong,
      .ec-about-dev-contact-row a{
        color:var(--ec-txtforbg1);
        font-size:.82rem;
        font-weight:850;
        overflow-wrap:anywhere;
        text-decoration:none;
      }

      .ec-about-dev-contact-row a:hover{
        color:var(--ec-primary);
        text-decoration:underline;
      }

      .ec-about-dev-links{
        display:grid;
        grid-template-columns:1fr;
        gap:.5rem;
      }

      .ec-about-link-pill{
        display:grid;
        grid-template-columns:5.25rem minmax(0,1fr);
        gap:.5rem;
        align-items:center;
        border:1px solid color-mix(in srgb,var(--ec-primary) 30%,var(--ec-border));
        border-radius:.85rem;
        padding:.55rem;
        background:color-mix(in srgb,var(--ec-primary) 7%,transparent);
        text-decoration:none;
      }

      .ec-about-link-pill span{
        color:var(--ec-primary);
        font-size:.7rem;
        font-weight:950;
        text-transform:uppercase;
        letter-spacing:.06em;
      }

      .ec-about-link-pill strong{
        color:var(--ec-txtforbg1);
        font-size:.82rem;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      }

      .ec-about-link-pill:hover{
        border-color:color-mix(in srgb,var(--ec-primary) 58%,var(--ec-border));
        background:color-mix(in srgb,var(--ec-primary) 12%,var(--ec-card));
      }

      .ec-about-muted{
        color:var(--ec-txtforbg2);
        font-size:.82rem;
      }

      .ec-about-ack-card{
        border-radius:1.25rem;
        padding:1rem;
      }

      .ec-about-ack-card strong{
        color:var(--ec-txtforbg1);
        line-height:1.65;
      }

      @media (min-width:760px){
        .ec-about-hero{
          grid-template-columns:minmax(0,1.08fr) minmax(320px,.92fr);
        }

        .ec-about-feature-grid{
          grid-template-columns:repeat(2,minmax(0,1fr));
        }

        .ec-about-compare,
        .ec-about-context-grid{
          grid-template-columns:repeat(2,minmax(0,1fr));
        }

        .ec-about-hardware-grid{
          grid-template-columns:repeat(3,minmax(0,1fr));
        }

        .ec-about-dev-grid{
          grid-template-columns:repeat(2,minmax(0,1fr));
        }
      }

      @media (min-width:1040px){
        .ec-about-feature-grid{
          grid-template-columns:repeat(3,minmax(0,1fr));
        }
      }

      @media (max-width:520px){
        .ec-about-section-head{
          grid-template-columns:1fr;
        }

        .ec-about-dev-contact-row,
        .ec-about-link-pill{
          grid-template-columns:1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  window.AboutDesign = { inject };
})();
