/* =========================================================
   ELECTRICREDIT V2 - HOME DESIGN
   File: static/components/home/home_design.js
   Purpose: Clean home CSS + continuous interactive stage
   ========================================================= */

(function () {
  "use strict";

  const STYLE_ID = "electricredit-home-design";

  function inject() {
    const existing = document.getElementById(STYLE_ID);
    if (existing) existing.remove();

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      /* IMPORTANT:
         The global header is sticky, so it already takes layout height.
         This override removes the extra first-section header-height padding. */
      #home-section.ec-home-host {
        min-height: auto !important;
        padding-top: clamp(0.45rem, 1.2vw, 0.9rem) !important;
        padding-bottom: clamp(1rem, 3vw, 2rem) !important;
      }

      .ec-home-section {
        position: relative;
        overflow: hidden;
        padding: 0 0 clamp(0.75rem, 2vw, 1.25rem);
      }

      .ec-home-section::before {
        content: "";
        position: absolute;
        top: 0.5rem;
        left: -8rem;
        width: 18rem;
        height: 18rem;
        border-radius: 999px;
        pointer-events: none;
        background: radial-gradient(circle, color-mix(in srgb, var(--ec-primary) 30%, transparent), transparent 68%);
        filter: blur(12px);
        opacity: 0.38;
      }

      .ec-home-shell {
        position: relative;
        z-index: 1;
        width: min(1180px, 100%);
        margin-inline: auto;
      }

      .ec-home-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.9rem;
        align-items: stretch;
      }

      .ec-home-panel {
        border: 1px solid var(--ec-border);
        border-radius: var(--ec-radius-2xl, 1.5rem);
        background:
          linear-gradient(
            145deg,
            color-mix(in srgb, var(--ec-card) 86%, transparent),
            color-mix(in srgb, var(--ec-bg2) 68%, transparent)
          );
        box-shadow:
          0 20px 70px color-mix(in srgb, var(--ec-shadow) 68%, transparent),
          inset 0 1px 0 rgba(255, 255, 255, 0.055);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
      }

      .ec-home-intro {
        min-height: 100%;
        padding: clamp(1rem, 3vw, 1.55rem);
        display: grid;
        align-content: start;
        gap: 0.85rem;
      }

      .ec-home-kicker {
        width: fit-content;
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        border: 1px solid color-mix(in srgb, var(--ec-primary) 35%, var(--ec-border));
        border-radius: 999px;
        padding: 0.36rem 0.7rem;
        background: color-mix(in srgb, var(--ec-primary) 10%, transparent);
        color: var(--ec-primary);
        font-size: 0.74rem;
        font-weight: 950;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .ec-home-kicker i {
        width: 0.52rem;
        height: 0.52rem;
        border-radius: 999px;
        background: var(--ec-success);
        box-shadow: 0 0 0 0 color-mix(in srgb, var(--ec-success) 50%, transparent);
        animation: ecHomePing 1.7s ease-out infinite;
      }

      .ec-home-intro h1 {
        margin: 0;
        color: var(--ec-txtforbg1);
        font-size: clamp(2.4rem, 10vw, 5.4rem);
        line-height: 0.9;
        letter-spacing: -0.08em;
        font-weight: 1000;
      }

      .ec-home-subtitle {
        max-width: 54ch;
        margin: 0;
        color: var(--ec-txtforbg2);
        font-size: clamp(0.94rem, 1.9vw, 1.05rem);
        line-height: 1.6;
      }

      .ec-home-rates {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.7rem;
      }

      .ec-home-rate {
        border: 1px solid var(--ec-border);
        border-radius: 1.2rem;
        padding: 0.86rem;
        background:
          linear-gradient(
            145deg,
            color-mix(in srgb, var(--ec-card) 76%, transparent),
            color-mix(in srgb, var(--ec-bg1) 48%, transparent)
          );
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045);
        transition: transform var(--ec-transition-fast), border-color var(--ec-transition), filter var(--ec-transition);
      }

      .ec-home-rate:hover {
        transform: translateY(-2px);
        border-color: color-mix(in srgb, var(--ec-primary) 50%, var(--ec-border));
        filter: brightness(1.04);
      }

      .ec-home-rate span,
      .ec-home-mini-stats span,
      .ec-home-play-head span {
        display: block;
        color: var(--ec-txtforbg2);
        font-size: 0.71rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .ec-home-rate strong {
        display: block;
        margin-top: 0.16rem;
        color: var(--ec-txtforbg1);
        font-size: clamp(1.55rem, 5vw, 2.3rem);
        font-weight: 1000;
        letter-spacing: -0.06em;
      }

      .ec-home-rate small {
        color: var(--ec-primary);
        font-weight: 900;
      }

      .ec-home-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
      }

      .ec-home-actions a {
        min-height: 2.65rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        padding: 0 1rem;
        border: 1px solid color-mix(in srgb, var(--ec-primary) 42%, var(--ec-border));
        background: color-mix(in srgb, var(--ec-primary) 9%, var(--ec-card));
        color: var(--ec-primary);
        font-weight: 950;
        transition: transform var(--ec-transition-fast), filter var(--ec-transition), background var(--ec-transition);
      }

      .ec-home-actions a:first-child {
        background: linear-gradient(135deg, var(--ec-primary), color-mix(in srgb, var(--ec-secondary) 72%, var(--ec-primary)));
        color: var(--ec-txtforprimary);
      }

      .ec-home-actions a:hover {
        transform: translateY(-2px);
        filter: brightness(1.06);
      }

      .ec-home-play-card {
        position: relative;
        min-height: 26rem;
        padding: clamp(0.9rem, 2.5vw, 1.25rem);
        display: grid;
        grid-template-rows: auto auto 1fr;
        gap: 0.75rem;
        overflow: hidden;
      }

      .ec-home-play-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }

      .ec-home-play-head strong {
        display: block;
        margin-top: 0.12rem;
        color: var(--ec-txtforbg1);
        font-size: 1.1rem;
        font-weight: 950;
      }

      .ec-home-play-head b {
        width: 0.76rem;
        height: 0.76rem;
        border-radius: 999px;
      }

      .is-online {
        background: var(--ec-success);
        box-shadow: 0 0 0 6px color-mix(in srgb, var(--ec-success) 14%, transparent);
      }

      .is-warn {
        background: var(--ec-warning);
        box-shadow: 0 0 0 6px color-mix(in srgb, var(--ec-warning) 12%, transparent);
      }

      .ec-home-mini-stats {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.55rem;
      }

      .ec-home-mini-stats article {
        border: 1px solid var(--ec-border);
        border-radius: 1rem;
        padding: 0.72rem;
        background: color-mix(in srgb, var(--ec-bg1) 36%, transparent);
      }

      .ec-home-mini-stats strong {
        display: block;
        margin-top: 0.15rem;
        color: var(--ec-txtforbg1);
        font-size: 1rem;
        font-weight: 950;
      }

      .ec-home-stage {
        position: relative;
        min-height: clamp(15rem, 40vw, 22rem);
        overflow: hidden;
        border: 1px solid color-mix(in srgb, var(--ec-primary) 20%, var(--ec-border));
        border-radius: 1.35rem;
        background:
          radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--ec-primary) 11%, transparent), transparent 11rem),
          radial-gradient(circle at 18% 24%, color-mix(in srgb, var(--ec-secondary) 9%, transparent), transparent 7rem),
          linear-gradient(90deg, color-mix(in srgb, var(--ec-primary) 10%, transparent) 1px, transparent 1px),
          linear-gradient(0deg, color-mix(in srgb, var(--ec-primary) 10%, transparent) 1px, transparent 1px),
          color-mix(in srgb, var(--ec-bg1) 72%, black 8%);
        background-size: auto, auto, 32px 32px, 32px 32px, auto;
      }

      .ec-home-stage-grid {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(90deg, transparent 0 34.8%, color-mix(in srgb, var(--ec-primary) 20%, transparent) 35% 65%, transparent 65.2%),
          radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--ec-secondary) 10%, transparent), transparent 7rem);
        opacity: 0.55;
      }

      .ec-home-trigger-zone {
        position: absolute;
        top: 0.8rem;
        bottom: 0.8rem;
        left: 32%;
        right: 32%;
        border-left: 1px dashed color-mix(in srgb, var(--ec-primary) 26%, transparent);
        border-right: 1px dashed color-mix(in srgb, var(--ec-primary) 26%, transparent);
        pointer-events: none;
        opacity: 0.42;
      }

      .ec-home-dev {
        position: absolute;
        left: 0;
        top: 0;
        width: var(--dev-size, 64px);
        height: var(--dev-size, 64px);
        padding: 0;
        border: 0;
        border-radius: var(--dev-radius, 999px);
        background: transparent;
        transform:
          translate3d(var(--dev-x, 0px), var(--dev-y, 0px), 0)
          rotate(var(--dev-rot, 0deg))
          scale(var(--dev-scale, 1));
        transform-origin: center;
        transition: filter 180ms ease;
        will-change: transform;
        z-index: 3;
      }

      .ec-home-dev img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: inherit;
        border: 2px solid color-mix(in srgb, var(--ec-primary) 42%, white 0%);
        box-shadow:
          0 12px 28px rgba(0, 0, 0, 0.34),
          0 0 0 5px color-mix(in srgb, var(--ec-primary) 9%, transparent);
        background: var(--ec-card);
        pointer-events: none;
      }

      .ec-home-dev.is-speaking {
        filter: brightness(1.08) saturate(1.08);
        animation: ecHomeBreathe 1.1s ease-in-out infinite;
      }

      .ec-home-dev.is-pop img {
        animation: ecHomePop 520ms ease both;
      }

      .ec-home-dev.is-twirl img {
        animation: ecHomeTwirl 620ms ease both;
      }

      .ec-home-bubble {
        position: absolute;
        left: 50%;
        bottom: calc(100% + 0.65rem);
        transform: translateX(-50%);
        width: max-content;
        max-width: min(15rem, 42vw);
        padding: 0.58rem 0.72rem;
        border: 1px solid color-mix(in srgb, var(--ec-primary) 34%, var(--ec-border));
        border-radius: 1rem;
        background: color-mix(in srgb, var(--ec-surface-strong) 92%, black 0%);
        color: var(--ec-txtforbg1);
        box-shadow: 0 16px 38px rgba(0, 0, 0, 0.32);
        font-size: clamp(0.73rem, 2.5vw, 0.86rem);
        font-weight: 850;
        line-height: 1.35;
        opacity: 0;
        pointer-events: none;
        animation: ecHomeBubbleIn 180ms ease both;
      }

      .ec-home-bubble::after {
        content: "";
        position: absolute;
        left: 50%;
        bottom: -0.38rem;
        width: 0.75rem;
        height: 0.75rem;
        transform: translateX(-50%) rotate(45deg);
        border-right: 1px solid color-mix(in srgb, var(--ec-primary) 34%, var(--ec-border));
        border-bottom: 1px solid color-mix(in srgb, var(--ec-primary) 34%, var(--ec-border));
        background: color-mix(in srgb, var(--ec-surface-strong) 92%, black 0%);
      }

      .ec-home-spark {
        position: absolute;
        width: 0.42rem;
        height: 0.42rem;
        border-radius: 999px;
        background: var(--ec-primary);
        pointer-events: none;
        z-index: 2;
        animation: ecHomeSpark 650ms ease-out forwards;
      }

      @media (min-width: 760px) {
        .ec-home-grid {
          grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
        }

        .ec-home-rates {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .ec-home-play-card {
          min-height: 31rem;
        }
      }

      @media (min-width: 1180px) {
        .ec-home-stage {
          min-height: 24rem;
        }
      }

      @media (max-width: 520px) {
        #home-section.ec-home-host {
          padding-top: 0.35rem !important;
        }

        .ec-home-intro,
        .ec-home-play-card {
          border-radius: 1.25rem;
        }

        .ec-home-stage {
          min-height: 16rem;
        }
      }

      @keyframes ecHomePing {
        0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--ec-success) 42%, transparent); }
        80%, 100% { box-shadow: 0 0 0 0.55rem transparent; }
      }

      @keyframes ecHomeBreathe {
        0%, 100% { --dev-scale: 1; }
        50% { --dev-scale: 1.08; }
      }

      @keyframes ecHomeBubbleIn {
        from { opacity: 0; transform: translateX(-50%) translateY(5px) scale(0.96); }
        to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
      }

      @keyframes ecHomePop {
        0% { transform: scale(1) rotate(0deg); opacity: 1; }
        45% { transform: scale(1.35) rotate(12deg); opacity: 0.9; }
        100% { transform: scale(1) rotate(0deg); opacity: 1; }
      }

      @keyframes ecHomeTwirl {
        from { transform: rotate(0deg) scale(1); }
        55% { transform: rotate(260deg) scale(1.18); }
        to { transform: rotate(520deg) scale(1); }
      }

      @keyframes ecHomeSpark {
        from {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1);
        }
        to {
          opacity: 0;
          transform: translate3d(var(--spark-x), var(--spark-y), 0) scale(0.15);
        }
      }
    `;

    document.head.appendChild(style);
  }

  window.HomeDesign = { inject };
})();
