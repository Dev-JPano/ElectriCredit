/* ELECTRICREDIT V2 - FOOTER DESIGN v2 */
(function () {
  "use strict";

  const ID = "electricredit-footer-design-v2";

  function inject() {
    const old = document.getElementById("electricredit-footer-design-v1");
    if (old) old.remove();

    if (document.getElementById(ID)) return;

    const style = document.createElement("style");
    style.id = ID;
    style.textContent = `
      #footer-root{
        width:100%;
        margin-top:clamp(1.5rem,5vw,3rem);
        margin-bottom:0;
        padding-bottom:0;
      }

      .ec-footer,
      .ec-footer *{
        box-sizing:border-box;
      }

      .ec-footer{
        width:100%;
        position:relative;
        z-index:1;
        padding:clamp(.85rem,2.5vw,1.1rem) clamp(1rem,3vw,1.35rem) 0;
        margin:0;
        color:var(--ec-txtforbg1);
      }

      .ec-footer-shell{
        width:100%;
        margin:0;
        display:grid;
        grid-template-columns:auto minmax(0,1fr) auto;
        align-items:center;
        gap:clamp(.8rem,3vw,1.4rem);
        border:1px solid color-mix(in srgb,var(--ec-border) 84%,transparent);
        border-bottom:0;
        border-radius:var(--ec-radius-2xl) var(--ec-radius-2xl) 0 0;
        padding:clamp(.85rem,2.4vw,1.15rem) clamp(1rem,3vw,1.6rem);
        background:
          radial-gradient(circle at 8% 50%,color-mix(in srgb,var(--ec-primary) 12%,transparent),transparent 28%),
          radial-gradient(circle at 92% 50%,color-mix(in srgb,var(--ec-secondary) 10%,transparent),transparent 30%),
          linear-gradient(145deg,color-mix(in srgb,var(--ec-card) 90%,transparent),color-mix(in srgb,var(--ec-bg2) 76%,transparent));
        box-shadow:
          0 -14px 55px color-mix(in srgb,var(--ec-shadow) 50%,transparent),
          inset 0 1px 0 color-mix(in srgb,var(--ec-txtforbg1) 8%,transparent);
        backdrop-filter:blur(18px);
        -webkit-backdrop-filter:blur(18px);
        overflow:hidden;
      }

      .ec-footer-shell::before{
        content:"";
        position:absolute;
        inset:0 12% auto 12%;
        height:1px;
        background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--ec-primary) 68%,transparent),transparent);
        opacity:.78;
      }

      .ec-footer-logo{
        width:clamp(3.8rem,9vw,5.5rem);
        height:clamp(3.8rem,9vw,5.5rem);
        display:grid;
        place-items:center;
        border:0;
        border-radius:1.2rem;
        background:
          radial-gradient(circle at center,color-mix(in srgb,var(--ec-primary) 13%,transparent),transparent 64%);
        overflow:visible;
        text-decoration:none;
        cursor:pointer;
        will-change:transform,filter;
        transition:transform var(--ec-transition-fast),filter var(--ec-transition),opacity var(--ec-transition);
      }

      .ec-footer-logo-left{
        animation:ec-footer-breathe-left 5.8s ease-in-out infinite;
      }

      .ec-footer-logo-right{
        animation:ec-footer-breathe-right 7.2s ease-in-out infinite;
      }

      .ec-footer-logo:hover{
        transform:translateY(-3px) scale(1.045);
        filter:brightness(1.08);
      }

      .ec-footer-logo img{
        width:86%;
        height:86%;
        object-fit:contain;
        display:block;
        border-radius:1rem;
        filter:
          drop-shadow(0 0 10px color-mix(in srgb,var(--ec-primary) 52%,transparent))
          drop-shadow(0 12px 22px color-mix(in srgb,var(--ec-shadow) 55%,transparent));
      }

      .ec-footer-logo-right img{
        filter:
          drop-shadow(0 0 10px color-mix(in srgb,var(--ec-secondary) 48%,transparent))
          drop-shadow(0 12px 22px color-mix(in srgb,var(--ec-shadow) 55%,transparent));
      }

      .ec-footer-copy{
        display:grid;
        justify-items:center;
        text-align:center;
        gap:.16rem;
        min-width:0;
      }

      .ec-footer-copy strong{
        color:var(--ec-txtforbg1);
        font-size:clamp(.92rem,2.4vw,1.12rem);
        font-weight:1000;
        letter-spacing:.055em;
        line-height:1.2;
      }

      .ec-footer-copy span{
        color:var(--ec-primary);
        font-size:clamp(.82rem,2vw,.96rem);
        font-weight:950;
        line-height:1.25;
      }

      .ec-footer-copy small{
        color:var(--ec-txtforbg2);
        font-size:clamp(.72rem,1.8vw,.84rem);
        font-weight:850;
        line-height:1.25;
      }

      @keyframes ec-footer-breathe-left{
        0%,100%{
          transform:translateY(0) rotate(-1deg) scale(1);
          filter:brightness(1);
        }
        45%{
          transform:translateY(-5px) rotate(1.4deg) scale(1.035);
          filter:brightness(1.08);
        }
        68%{
          transform:translateY(-2px) rotate(-.6deg) scale(1.015);
        }
      }

      @keyframes ec-footer-breathe-right{
        0%,100%{
          transform:translateY(-1px) rotate(1deg) scale(1);
          filter:brightness(1.02);
        }
        36%{
          transform:translateY(3px) rotate(-1.3deg) scale(1.025);
        }
        76%{
          transform:translateY(-5px) rotate(.8deg) scale(1.04);
          filter:brightness(1.1);
        }
      }

      @media (max-width:640px){
        .ec-footer{
          padding:clamp(.75rem,3vw,1rem) 0 0;
        }

        .ec-footer-shell{
          grid-template-columns:1fr 1fr;
          justify-items:stretch;
          gap:.65rem;
          border-radius:1.35rem 1.35rem 0 0;
          padding:.85rem;
        }

        .ec-footer-copy{
          grid-column:1 / -1;
          grid-row:2;
          padding-top:.35rem;
        }

        .ec-footer-logo{
          width:100%;
          height:clamp(4.5rem,18vw,5.8rem);
          border-radius:1.1rem;
        }

        .ec-footer-logo-left,
        .ec-footer-logo-right{
          justify-self:stretch;
        }

        .ec-footer-logo img{
          width:min(82%,5.1rem);
          height:min(82%,5.1rem);
        }

        .ec-footer-copy strong{
          letter-spacing:.035em;
        }
      }

      @media (prefers-reduced-motion:reduce){
        .ec-footer-logo-left,
        .ec-footer-logo-right{
          animation:none;
        }

        .ec-footer-logo,
        .ec-footer-logo:hover{
          transform:none;
        }
      }
    `;

    document.head.appendChild(style);
  }

  window.FooterDesign = {
    inject
  };
})();
