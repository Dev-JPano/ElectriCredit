/* =========================================================
   ELECTRICREDIT V2 - CHATBOT DESIGN
   File: static/components/header/chatbot/chatbot_design.js
   Purpose: Inject chatbot-only CSS
   ========================================================= */

(function () {
  "use strict";

  const STYLE_ID = "electricredit-chatbot-design";

  function inject() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      .ec-chatbot-root {
        position: fixed;
        right: 1rem;
        bottom: 1rem;
        z-index: 150;
        pointer-events: none;
      }

      .ec-chatbot-launcher {
        pointer-events: auto;
        position: fixed;
        right: 1rem;
        bottom: 1rem;
        z-index: 149;
        width: 3.35rem;
        height: 3.35rem;
        display: grid;
        place-items: center;
        border: 1px solid color-mix(in srgb, var(--ec-primary) 55%, var(--ec-border));
        border-radius: 999px;
        background:
          linear-gradient(
            135deg,
            var(--ec-primary),
            color-mix(in srgb, var(--ec-secondary) 82%, var(--ec-primary))
          );
        color: var(--ec-txtforprimary);
        box-shadow:
          0 18px 48px color-mix(in srgb, var(--ec-primary) 28%, transparent),
          inset 0 1px 0 rgba(255, 255, 255, 0.28);
        overflow: hidden;
        transition:
          transform var(--ec-transition-fast),
          filter var(--ec-transition-fast),
          box-shadow var(--ec-transition);
      }

      .ec-chatbot-launcher.is-hidden {
        display: none;
      }

      .ec-chatbot-launcher:hover {
        transform: translateY(-3px);
        filter: brightness(1.08);
      }

      .ec-chatbot-launcher:active {
        transform: translateY(0) scale(0.96);
      }

      .ec-chatbot-launcher-glow {
        position: absolute;
        inset: -40%;
        background:
          radial-gradient(circle, rgba(255, 255, 255, 0.48), transparent 45%);
        animation: ecChatbotLauncherGlow 2.8s ease-in-out infinite;
      }

      .ec-chatbot-launcher-icon {
        position: relative;
        z-index: 1;
        font-size: 1.35rem;
      }

      .ec-chatbot-launcher-svg {
        position: relative;
        z-index: 1;
        width: 1.55rem;
        height: 1.55rem;
        display: block;
      }

      .ec-chatbot-unread {
        position: absolute;
        top: 0.18rem;
        right: 0.12rem;
        z-index: 2;
        width: 1.1rem;
        height: 1.1rem;
        display: grid;
        place-items: center;
        border: 2px solid var(--ec-bg1);
        border-radius: 999px;
        background: var(--ec-danger);
        color: #fff;
        font-size: 0.72rem;
        font-weight: 950;
        line-height: 1;
        animation: ecChatbotUnreadPulse 1.4s ease-in-out infinite;
      }

      .ec-chatbot-unread[hidden] {
        display: none !important;
      }

      .ec-chatbot-panel {
        pointer-events: auto;
        position: fixed;
        right: 1rem;
        bottom: 1rem;
        z-index: 150;
        width: min(100vw - 2rem, 430px);
        height: min(80vh, 700px);
        display: grid;
        grid-template-rows: auto auto 1fr auto auto;
        overflow: hidden;
        border: 1px solid var(--ec-border);
        border-radius: 1.65rem;
        background:
          linear-gradient(
            145deg,
            color-mix(in srgb, var(--ec-surface-strong) 96%, transparent),
            color-mix(in srgb, var(--ec-bg2) 92%, transparent)
          );
        box-shadow:
          0 30px 110px rgba(0, 0, 0, 0.56),
          inset 0 1px 0 rgba(255, 255, 255, 0.065);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        animation: ecChatbotPanelIn 240ms ease both;
      }

      .ec-chatbot-panel[hidden] {
        display: none;
      }

      .ec-chatbot-head {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 0.75rem;
        padding: 0.9rem;
        border-bottom: 1px solid var(--ec-border);
        background:
          linear-gradient(
            135deg,
            color-mix(in srgb, var(--ec-primary) 12%, transparent),
            color-mix(in srgb, var(--ec-secondary) 8%, transparent)
          );
      }

      .ec-chatbot-avatar {
        width: 2.65rem;
        height: 2.65rem;
        display: grid;
        place-items: center;
        border-radius: 1rem;
        background:
          linear-gradient(
            135deg,
            var(--ec-primary),
            color-mix(in srgb, var(--ec-secondary) 78%, var(--ec-primary))
          );
        color: var(--ec-txtforprimary);
        font-size: 1.25rem;
        box-shadow:
          0 14px 34px color-mix(in srgb, var(--ec-primary) 24%, transparent),
          inset 0 1px 0 rgba(255, 255, 255, 0.28);
      }

      .ec-chatbot-title-wrap {
        min-width: 0;
      }

      .ec-chatbot-title {
        display: block;
        color: var(--ec-txtforbg1);
        font-weight: 950;
        letter-spacing: -0.035em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .ec-chatbot-status {
        display: block;
        margin-top: 0.12rem;
        color: var(--ec-txtforbg2);
        font-size: 0.78rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .ec-chatbot-head-actions {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
      }

      .ec-chatbot-head-btn {
        width: 2.25rem;
        height: 2.25rem;
        display: grid;
        place-items: center;
        border: 1px solid var(--ec-border);
        border-radius: 999px;
        background: color-mix(in srgb, var(--ec-card) 78%, transparent);
        color: var(--ec-txtforbg1);
        transition:
          transform var(--ec-transition-fast),
          border-color var(--ec-transition),
          background var(--ec-transition);
      }

      .ec-chatbot-head-btn:hover {
        transform: translateY(-2px);
        border-color: var(--ec-primary);
        background: color-mix(in srgb, var(--ec-primary) 14%, var(--ec-card));
      }

      .ec-chatbot-belt {
        overflow: hidden;
        border-bottom: 1px solid var(--ec-border);
        background: color-mix(in srgb, var(--ec-bg1) 52%, transparent);
      }

      .ec-chatbot-belt-track {
        display: flex;
        gap: 0.5rem;
        width: max-content;
        padding: 0.55rem 0.75rem;
        animation: ecChatbotBeltMove 24s linear infinite;
      }

      .ec-chatbot-belt:hover .ec-chatbot-belt-track {
        animation-play-state: paused;
      }

      .ec-chatbot-command {
        flex: 0 0 auto;
        border: 1px solid var(--ec-border);
        border-radius: 999px;
        padding: 0.38rem 0.68rem;
        background: color-mix(in srgb, var(--ec-card) 74%, transparent);
        color: var(--ec-txtforbg2);
        font-size: 0.75rem;
        font-weight: 850;
        transition:
          transform var(--ec-transition-fast),
          color var(--ec-transition),
          border-color var(--ec-transition),
          background var(--ec-transition);
      }

      .ec-chatbot-command:hover {
        transform: translateY(-2px);
        color: var(--ec-txtforbg1);
        border-color: var(--ec-primary);
        background: color-mix(in srgb, var(--ec-primary) 12%, var(--ec-card));
      }

      .ec-chatbot-messages {
        min-height: 0;
        overflow-y: auto;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.78rem;
        scroll-behavior: smooth;
      }

      .ec-chatbot-message {
        display: flex;
      }

      .ec-chatbot-message.is-user {
        justify-content: flex-end;
      }

      .ec-chatbot-message.is-bot {
        justify-content: flex-start;
      }

      .ec-chatbot-message-bubble {
        max-width: min(88%, 360px);
        border: 1px solid var(--ec-border);
        border-radius: 1.25rem;
        padding: 0.72rem 0.82rem;
        box-shadow:
          0 14px 34px rgba(0, 0, 0, 0.18),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);
        animation: ecChatbotBubbleIn 180ms ease both;
      }

      .ec-chatbot-message.is-bot .ec-chatbot-message-bubble {
        border-top-left-radius: 0.35rem;
        background:
          linear-gradient(
            145deg,
            color-mix(in srgb, var(--ec-card) 86%, transparent),
            color-mix(in srgb, var(--ec-bg2) 72%, transparent)
          );
        color: var(--ec-txtforbg1);
      }

      .ec-chatbot-message.is-user .ec-chatbot-message-bubble {
        border-top-right-radius: 0.35rem;
        border-color: color-mix(in srgb, var(--ec-primary) 52%, var(--ec-border));
        background:
          linear-gradient(
            135deg,
            color-mix(in srgb, var(--ec-primary) 92%, transparent),
            color-mix(in srgb, var(--ec-secondary) 72%, var(--ec-primary))
          );
        color: var(--ec-txtforprimary);
      }

      .ec-chatbot-message-label {
        display: block;
        margin-bottom: 0.25rem;
        font-size: 0.68rem;
        font-weight: 950;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        opacity: 0.72;
      }

      .ec-chatbot-message-bubble p {
        margin: 0;
        font-size: 0.91rem;
        line-height: 1.55;
        white-space: pre-wrap;
      }

      .ec-chatbot-message-intent {
        display: inline-flex;
        margin-top: 0.45rem;
        padding: 0.2rem 0.45rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.12);
        font-size: 0.68rem;
        font-weight: 800;
      }

      .ec-chatbot-card-grid {
        display: grid;
        gap: 0.65rem;
        margin-top: 0.75rem;
      }

      .ec-chatbot-person-card,
      .ec-chatbot-data-card {
        border: 1px solid color-mix(in srgb, var(--ec-primary) 26%, var(--ec-border));
        border-radius: 1rem;
        padding: 0.75rem;
        background:
          linear-gradient(
            145deg,
            color-mix(in srgb, var(--ec-bg1) 44%, transparent),
            color-mix(in srgb, var(--ec-card) 76%, transparent)
          );
        box-shadow:
          0 14px 34px rgba(0, 0, 0, 0.14),
          inset 0 1px 0 rgba(255, 255, 255, 0.045);
      }

      .ec-chatbot-person-top {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.65rem;
        align-items: center;
      }

      .ec-chatbot-person-avatar {
        width: 2.85rem;
        height: 2.85rem;
        display: grid;
        place-items: center;
        overflow: hidden;
        border-radius: 0.9rem;
        background:
          linear-gradient(
            135deg,
            var(--ec-primary),
            color-mix(in srgb, var(--ec-secondary) 78%, var(--ec-primary))
          );
        color: var(--ec-txtforprimary);
        font-size: 0.8rem;
        font-weight: 950;
      }

      .ec-chatbot-person-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .ec-chatbot-person-top strong {
        display: block;
        color: var(--ec-txtforbg1);
        font-size: 0.9rem;
        font-weight: 950;
      }

      .ec-chatbot-person-top small {
        display: block;
        margin-top: 0.12rem;
        color: var(--ec-primary);
        font-size: 0.7rem;
        font-weight: 900;
      }

      .ec-chatbot-person-meta {
        margin-top: 0.55rem;
        display: grid;
        gap: 0.18rem;
      }

      .ec-chatbot-person-meta p {
        margin: 0;
        color: var(--ec-txtforbg2);
        font-size: 0.76rem;
        overflow-wrap: anywhere;
      }

      .ec-chatbot-person-links {
        margin-top: 0.55rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
      }

      .ec-chatbot-person-links a {
        border: 1px solid color-mix(in srgb, var(--ec-primary) 34%, var(--ec-border));
        border-radius: 999px;
        padding: 0.28rem 0.48rem;
        background: color-mix(in srgb, var(--ec-primary) 9%, transparent);
        color: var(--ec-primary);
        font-size: 0.7rem;
        font-weight: 850;
      }

      .ec-chatbot-typing {
        display: inline-flex;
        align-items: center;
        gap: 0.26rem;
        min-width: 3rem;
        min-height: 1.2rem;
      }

      .ec-chatbot-typing i {
        width: 0.42rem;
        height: 0.42rem;
        border-radius: 999px;
        background: var(--ec-primary);
        animation: ecChatbotTyping 900ms ease-in-out infinite;
      }

      .ec-chatbot-typing i:nth-child(2) {
        animation-delay: 120ms;
      }

      .ec-chatbot-typing i:nth-child(3) {
        animation-delay: 240ms;
      }

      .ec-chatbot-suggestions {
        display: flex;
        gap: 0.5rem;
        overflow-x: auto;
        padding: 0.72rem 0.85rem;
        border-top: 1px solid var(--ec-border);
        background: color-mix(in srgb, var(--ec-bg1) 34%, transparent);
      }

      .ec-chatbot-suggestion {
        flex: 0 0 auto;
        max-width: 15rem;
        border: 1px solid color-mix(in srgb, var(--ec-primary) 28%, var(--ec-border));
        border-radius: 999px;
        padding: 0.52rem 0.75rem;
        background: color-mix(in srgb, var(--ec-primary) 8%, var(--ec-card));
        color: var(--ec-txtforbg1);
        font-size: 0.78rem;
        font-weight: 850;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition:
          transform var(--ec-transition-fast),
          border-color var(--ec-transition),
          background var(--ec-transition);
      }

      .ec-chatbot-suggestion:hover {
        transform: translateY(-2px);
        border-color: var(--ec-primary);
        background: color-mix(in srgb, var(--ec-primary) 16%, var(--ec-card));
      }

      .ec-chatbot-form {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 0.55rem;
        padding: 0.85rem;
        border-top: 1px solid var(--ec-border);
        background:
          linear-gradient(
            180deg,
            color-mix(in srgb, var(--ec-bg2) 70%, transparent),
            color-mix(in srgb, var(--ec-bg1) 82%, transparent)
          );
      }

      .ec-chatbot-input {
        min-width: 0;
        height: 2.85rem;
        border: 1px solid var(--ec-border);
        border-radius: 999px;
        padding: 0 0.98rem;
        outline: none;
        background: color-mix(in srgb, var(--ec-bg2) 82%, transparent);
        color: var(--ec-txtforbg1);
        transition:
          border-color var(--ec-transition),
          box-shadow var(--ec-transition),
          background var(--ec-transition);
      }

      .ec-chatbot-input::placeholder {
        color: color-mix(in srgb, var(--ec-txtforbg2) 68%, transparent);
      }

      .ec-chatbot-input:focus {
        border-color: var(--ec-primary);
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--ec-primary) 16%, transparent);
      }

      .ec-chatbot-send {
        width: 2.85rem;
        height: 2.85rem;
        display: grid;
        place-items: center;
        border: 1px solid color-mix(in srgb, var(--ec-primary) 62%, var(--ec-border));
        border-radius: 999px;
        background:
          linear-gradient(
            135deg,
            var(--ec-primary),
            color-mix(in srgb, var(--ec-secondary) 76%, var(--ec-primary))
          );
        color: var(--ec-txtforprimary);
        font-weight: 950;
        box-shadow:
          0 12px 32px color-mix(in srgb, var(--ec-primary) 24%, transparent),
          inset 0 1px 0 rgba(255, 255, 255, 0.24);
        transition:
          transform var(--ec-transition-fast),
          filter var(--ec-transition);
      }

      .ec-chatbot-send:hover {
        transform: translateY(-2px);
        filter: brightness(1.08);
      }

      .ec-chatbot-send:active {
        transform: translateY(0) scale(0.95);
      }

      @media (max-width: 640px) {
        .ec-chatbot-root {
          inset: 0;
          right: auto;
          bottom: auto;
        }

        .ec-chatbot-panel {
          inset: 0;
          width: 100%;
          height: 100%;
          border-radius: 0;
        }

        .ec-chatbot-launcher {
          right: 0.85rem;
          bottom: 0.85rem;
        }

        .ec-chatbot-message-bubble {
          max-width: 92%;
        }
      }

      @keyframes ecChatbotPanelIn {
        from {
          opacity: 0;
          transform: translateY(18px) scale(0.975);
        }

        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes ecChatbotBubbleIn {
        from {
          opacity: 0;
          transform: translateY(8px) scale(0.985);
        }

        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes ecChatbotTyping {
        0%,
        100% {
          transform: translateY(0);
          opacity: 0.45;
        }

        50% {
          transform: translateY(-4px);
          opacity: 1;
        }
      }

      @keyframes ecChatbotBeltMove {
        from {
          transform: translateX(0);
        }

        to {
          transform: translateX(-50%);
        }
      }

      @keyframes ecChatbotUnreadPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.16); }
      }

      @keyframes ecChatbotLauncherGlow {
        0%,
        100% {
          transform: scale(0.85);
          opacity: 0.2;
        }

        50% {
          transform: scale(1.1);
          opacity: 0.55;
        }
      }
    `;

    document.head.appendChild(style);
  }

  window.ChatbotDesign = {
    inject
  };
})();