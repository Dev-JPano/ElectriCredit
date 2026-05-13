/* =========================================================
   ELECTRICREDIT V2 - PROFILE DESIGN
   File: static/components/header/profile/profile_design.js
   ========================================================= */

(function () {
  "use strict";

  const STYLE_ID = "electricredit-profile-design";

  function inject() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;

    style.textContent = `
      .ec-profile-root {
        position: fixed;
        inset: 0;
        z-index: 165;
        pointer-events: none;
      }

      .ec-profile-panel {
        position: fixed;
        inset: 0;
        z-index: 165;
        display: grid;
        place-items: center;
        padding: 1rem;
        pointer-events: auto;
      }

      .ec-profile-panel[hidden],
      .ec-profile-main-view[hidden],
      .ec-profile-stack-view[hidden],
      [hidden] {
        display: none !important;
      }

      .ec-profile-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(2, 6, 23, 0.72);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        animation: ecProfileFadeIn 180ms ease both;
      }

      .ec-profile-modal {
        position: relative;
        z-index: 1;
        width: min(100%, 920px);
        max-height: min(90vh, 800px);
        display: grid;
        grid-template-rows: auto 1fr;
        overflow: hidden;
        border: 1px solid var(--ec-border);
        border-radius: var(--ec-radius-2xl);
        background:
          linear-gradient(
            145deg,
            color-mix(in srgb, var(--ec-surface-strong) 96%, transparent),
            color-mix(in srgb, var(--ec-bg2) 92%, transparent)
          );
        box-shadow:
          0 34px 120px rgba(0, 0, 0, 0.58),
          inset 0 1px 0 rgba(255, 255, 255, 0.07);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        animation: ecProfileModalIn 240ms ease both;
      }

      .ec-profile-head {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        border-bottom: 1px solid var(--ec-border);
        background:
          linear-gradient(
            135deg,
            color-mix(in srgb, var(--ec-primary) 12%, transparent),
            color-mix(in srgb, var(--ec-secondary) 7%, transparent)
          );
      }

      .ec-profile-head-profile {
        min-width: 0;
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: center;
        gap: 0.8rem;
      }

      .ec-profile-head-icon,
      .ec-profile-head-photo {
        width: 3.15rem;
        height: 3.15rem;
        display: grid;
        place-items: center;
        overflow: hidden;
        border-radius: 1.12rem;
        background:
          linear-gradient(
            135deg,
            var(--ec-primary),
            color-mix(in srgb, var(--ec-secondary) 78%, var(--ec-primary))
          );
        color: var(--ec-txtforprimary);
        font-size: 1.3rem;
        font-weight: 950;
        box-shadow: 0 18px 48px color-mix(in srgb, var(--ec-primary) 24%, transparent);
      }

      .ec-profile-head-photo img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .ec-profile-head-copy {
        min-width: 0;
      }

      .ec-profile-head-copy span {
        display: block;
        color: var(--ec-primary);
        font-size: 0.7rem;
        font-weight: 950;
        letter-spacing: 0.095em;
        text-transform: uppercase;
      }

      .ec-profile-head-copy strong {
        display: block;
        margin-top: 0.14rem;
        color: var(--ec-txtforbg1);
        font-size: clamp(1.02rem, 3vw, 1.34rem);
        font-weight: 950;
        letter-spacing: -0.04em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .ec-profile-head-copy small {
        display: block;
        margin-top: 0.08rem;
        color: var(--ec-txtforbg2);
        font-size: 0.82rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .ec-profile-head-actions {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }

      .ec-profile-close,
      .ec-profile-logout-head {
        height: 2.55rem;
        display: inline-grid;
        place-items: center;
        border: 1px solid var(--ec-border);
        border-radius: 999px;
        background: color-mix(in srgb, var(--ec-card) 82%, transparent);
        color: var(--ec-txtforbg1);
        font-weight: 950;
        transition:
          transform var(--ec-transition-fast),
          border-color var(--ec-transition),
          background var(--ec-transition);
      }

      .ec-profile-close {
        width: 2.55rem;
      }

      .ec-profile-logout-head {
        padding: 0 0.95rem;
        border-color: color-mix(in srgb, var(--ec-danger) 36%, var(--ec-border));
        color: color-mix(in srgb, var(--ec-danger) 72%, white);
      }

      .ec-profile-close:hover,
      .ec-profile-logout-head:hover {
        transform: translateY(-2px);
      }

      .ec-profile-close:hover {
        border-color: var(--ec-danger);
        background: color-mix(in srgb, var(--ec-danger) 16%, var(--ec-card));
      }

      .ec-profile-logout-head:hover {
        background: color-mix(in srgb, var(--ec-danger) 15%, var(--ec-card));
      }

      .ec-profile-body {
        min-height: 0;
        overflow: auto;
        padding: 1rem;
        display: grid;
        gap: 1rem;
      }

      .ec-profile-status {
        min-height: 2.35rem;
        display: flex;
        align-items: center;
        padding: 0.68rem 0.86rem;
        border: 1px solid var(--ec-border);
        border-radius: var(--ec-radius-lg);
        background: color-mix(in srgb, var(--ec-bg1) 42%, transparent);
        color: var(--ec-txtforbg2);
        font-size: 0.86rem;
        line-height: 1.45;
      }

      .ec-profile-status.is-success {
        border-color: color-mix(in srgb, var(--ec-success) 42%, var(--ec-border));
        color: color-mix(in srgb, var(--ec-success) 72%, white);
      }

      .ec-profile-status.is-warning {
        border-color: color-mix(in srgb, var(--ec-warning) 42%, var(--ec-border));
        color: color-mix(in srgb, var(--ec-warning) 72%, white);
      }

      .ec-profile-status.is-danger {
        border-color: color-mix(in srgb, var(--ec-danger) 42%, var(--ec-border));
        color: color-mix(in srgb, var(--ec-danger) 72%, white);
      }

      .ec-profile-login-layout {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1rem;
        align-items: start;
      }

      .ec-profile-visitor-card,
      .ec-profile-login-card,
      .ec-profile-stack-card,
      .ec-profile-action-button,
      .ec-profile-person-card,
      .ec-profile-role-mini,
      .ec-profile-empty {
        border: 1px solid var(--ec-border);
        border-radius: var(--ec-radius-xl);
        background:
          linear-gradient(
            145deg,
            color-mix(in srgb, var(--ec-card) 84%, transparent),
            color-mix(in srgb, var(--ec-bg2) 66%, transparent)
          );
        box-shadow:
          0 18px 52px rgba(0, 0, 0, 0.18),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);
      }

      .ec-profile-visitor-card,
      .ec-profile-login-card,
      .ec-profile-stack-card {
        padding: 1rem;
      }

      .ec-profile-avatar-large {
        width: 4rem;
        height: 4rem;
        display: grid;
        place-items: center;
        border-radius: 1.35rem;
        background:
          linear-gradient(
            135deg,
            var(--ec-primary),
            color-mix(in srgb, var(--ec-secondary) 78%, var(--ec-primary))
          );
        color: var(--ec-txtforprimary);
        font-size: 1.7rem;
        box-shadow: 0 18px 48px color-mix(in srgb, var(--ec-primary) 24%, transparent);
      }

      .ec-profile-visitor-card h3,
      .ec-profile-stack-head h3 {
        margin: 0.85rem 0 0;
        color: var(--ec-txtforbg1);
        font-size: 1.22rem;
        font-weight: 950;
        letter-spacing: -0.035em;
      }

      .ec-profile-visitor-card p,
      .ec-profile-stack-head p {
        margin: 0.35rem 0 0;
        color: var(--ec-txtforbg2);
        line-height: 1.55;
        font-size: 0.9rem;
      }

      .ec-profile-role-list {
        display: grid;
        gap: 0.65rem;
        margin-top: 1rem;
      }

      .ec-profile-role-mini {
        padding: 0.8rem;
      }

      .ec-profile-role-mini strong {
        display: block;
        color: var(--ec-primary);
        font-size: 0.8rem;
        font-weight: 950;
        letter-spacing: 0.05em;
      }

      .ec-profile-role-mini span {
        display: block;
        margin-top: 0.22rem;
        color: var(--ec-txtforbg2);
        font-size: 0.82rem;
        line-height: 1.4;
      }

      .ec-profile-tabs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.45rem;
        margin-bottom: 1rem;
        padding: 0.35rem;
        border: 1px solid var(--ec-border);
        border-radius: 999px;
        background: color-mix(in srgb, var(--ec-bg1) 44%, transparent);
      }

      .ec-profile-tabs button {
        min-height: 2.35rem;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: var(--ec-txtforbg2);
        font-weight: 950;
        transition:
          transform var(--ec-transition-fast),
          background var(--ec-transition),
          color var(--ec-transition);
      }

      .ec-profile-tabs button:hover {
        transform: translateY(-1px);
      }

      .ec-profile-tabs button.is-active {
        background:
          linear-gradient(
            135deg,
            var(--ec-primary),
            color-mix(in srgb, var(--ec-secondary) 76%, var(--ec-primary))
          );
        color: var(--ec-txtforprimary);
      }

      .ec-profile-login-form,
      .ec-profile-form {
        display: grid;
        gap: 0.86rem;
      }

      .ec-profile-login-form label,
      .ec-profile-form label {
        display: grid;
        gap: 0.35rem;
      }

      .ec-profile-login-form label span,
      .ec-profile-form label span {
        color: var(--ec-txtforbg2);
        font-size: 0.75rem;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .ec-profile-login-form input,
      .ec-profile-form input,
      .ec-profile-form select,
      .ec-profile-form textarea {
        width: 100%;
        border: 1px solid var(--ec-border);
        border-radius: 1rem;
        padding: 0.78rem 0.9rem;
        background: color-mix(in srgb, var(--ec-bg2) 82%, transparent);
        color: var(--ec-txtforbg1);
        outline: none;
        transition:
          border-color var(--ec-transition),
          box-shadow var(--ec-transition),
          background var(--ec-transition);
      }

      .ec-profile-login-form input,
      .ec-profile-form input,
      .ec-profile-form select {
        min-height: 2.85rem;
        border-radius: 999px;
      }

      .ec-profile-login-form input:focus,
      .ec-profile-form input:focus,
      .ec-profile-form select:focus,
      .ec-profile-form textarea:focus,
      .ec-profile-pin-wrap input:focus {
        border-color: var(--ec-primary);
        box-shadow: 0 0 0 4px color-mix(in srgb, var(--ec-primary) 16%, transparent);
      }

      .ec-profile-otp-login-area {
        display: grid;
        gap: 0.75rem;
      }

      .ec-profile-otp-actions,
      .ec-profile-otp-row {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.45rem;
        padding: 0.7rem;
        border: 1px solid var(--ec-border);
        border-radius: 1rem;
        background: color-mix(in srgb, var(--ec-bg1) 42%, transparent);
      }

      .ec-profile-otp-actions small,
      .ec-profile-otp-row small {
        color: var(--ec-txtforbg2);
        line-height: 1.45;
        font-size: 0.8rem;
      }

      .ec-profile-pin-wrap {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 0.45rem;
      }

      .ec-profile-pin-wrap input {
        width: 100%;
        height: 3rem;
        border: 1px solid var(--ec-border);
        border-radius: 0.9rem;
        background: color-mix(in srgb, var(--ec-bg2) 82%, transparent);
        color: var(--ec-txtforbg1);
        text-align: center;
        font-size: 1.18rem;
        font-weight: 950;
        outline: none;
      }

      .ec-profile-primary-btn,
      .ec-profile-danger-btn,
      .ec-profile-soft-btn {
        min-height: 2.75rem;
        border-radius: 999px;
        padding: 0 1rem;
        font-weight: 950;
        transition:
          transform var(--ec-transition-fast),
          filter var(--ec-transition),
          border-color var(--ec-transition),
          background var(--ec-transition);
      }

      .ec-profile-primary-btn {
        border: 1px solid color-mix(in srgb, var(--ec-primary) 62%, var(--ec-border));
        background:
          linear-gradient(
            135deg,
            var(--ec-primary),
            color-mix(in srgb, var(--ec-secondary) 76%, var(--ec-primary))
          );
        color: var(--ec-txtforprimary);
      }

      .ec-profile-soft-btn {
        border: 1px solid color-mix(in srgb, var(--ec-primary) 34%, var(--ec-border));
        background: color-mix(in srgb, var(--ec-primary) 9%, var(--ec-card));
        color: var(--ec-primary);
      }

      .ec-profile-danger-btn {
        border: 1px solid color-mix(in srgb, var(--ec-danger) 48%, var(--ec-border));
        background: color-mix(in srgb, var(--ec-danger) 13%, var(--ec-card));
        color: color-mix(in srgb, var(--ec-danger) 72%, white);
      }

      .ec-profile-primary-btn:hover,
      .ec-profile-danger-btn:hover,
      .ec-profile-soft-btn:hover,
      .ec-profile-action-button:hover {
        transform: translateY(-2px);
        filter: brightness(1.06);
      }

      .ec-profile-action-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.85rem;
      }

      .ec-profile-action-button {
        width: 100%;
        min-height: 5.25rem;
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: center;
        gap: 0.85rem;
        padding: 1rem;
        text-align: left;
        color: var(--ec-txtforbg1);
        cursor: pointer;
      }

      .ec-profile-action-icon {
        width: 2.75rem;
        height: 2.75rem;
        display: grid;
        place-items: center;
        border-radius: 1rem;
        background: color-mix(in srgb, var(--ec-primary) 14%, var(--ec-card));
        border: 1px solid color-mix(in srgb, var(--ec-primary) 28%, var(--ec-border));
      }

      .ec-profile-action-button strong {
        display: block;
        font-size: 1rem;
        font-weight: 950;
        line-height: 1.2;
      }

      .ec-profile-action-button small {
        display: block;
        margin-top: 0.24rem;
        color: var(--ec-txtforbg2);
        font-size: 0.84rem;
        line-height: 1.4;
      }

      .ec-profile-stack-card {
        animation: ecProfileStackIn 180ms ease both;
      }

      .ec-profile-stack-head {
        margin-bottom: 1rem;
      }

      .ec-profile-back-link {
        width: fit-content;
        border: 0;
        background: transparent;
        color: var(--ec-primary);
        font-weight: 950;
        padding: 0;
      }

      .ec-profile-divider {
        margin: 0.2rem 0;
        padding: 0.58rem 0.75rem;
        border-radius: 999px;
        background: color-mix(in srgb, var(--ec-primary) 9%, transparent);
        color: var(--ec-primary);
        font-size: 0.75rem;
        font-weight: 950;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .ec-profile-form-actions,
      .ec-profile-management-actions,
      .ec-profile-person-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.55rem;
      }

      .ec-profile-management-actions {
        margin-bottom: 1rem;
      }

      .ec-profile-people-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.85rem;
      }

      .ec-profile-person-card {
        padding: 0.9rem;
        display: grid;
        gap: 0.75rem;
      }

      .ec-profile-person-top {
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: center;
        gap: 0.75rem;
      }

      .ec-profile-person-avatar {
        width: 3.2rem;
        height: 3.2rem;
        display: grid;
        place-items: center;
        overflow: hidden;
        border-radius: 1rem;
        background:
          linear-gradient(
            135deg,
            var(--ec-primary),
            color-mix(in srgb, var(--ec-secondary) 72%, var(--ec-primary))
          );
        color: var(--ec-txtforprimary);
        font-weight: 950;
        box-shadow: 0 16px 40px color-mix(in srgb, var(--ec-primary) 22%, transparent);
      }

      .ec-profile-person-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .ec-profile-person-top strong {
        display: block;
        color: var(--ec-txtforbg1);
        font-size: 0.98rem;
        font-weight: 950;
      }

      .ec-profile-person-top small {
        display: block;
        margin-top: 0.15rem;
        color: var(--ec-primary);
        font-size: 0.72rem;
        font-weight: 900;
      }

      .ec-profile-person-meta {
        display: grid;
        gap: 0.4rem;
      }

      .ec-profile-person-meta p {
        margin: 0;
        display: grid;
        gap: 0.1rem;
      }

      .ec-profile-person-meta b {
        color: var(--ec-txtforbg2);
        font-size: 0.7rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .ec-profile-person-meta span {
        color: var(--ec-txtforbg1);
        font-size: 0.84rem;
        overflow-wrap: anywhere;
      }

      .ec-profile-person-links {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
      }

      .ec-profile-person-links a {
        border: 1px solid color-mix(in srgb, var(--ec-primary) 32%, var(--ec-border));
        border-radius: 999px;
        padding: 0.35rem 0.55rem;
        background: color-mix(in srgb, var(--ec-primary) 9%, var(--ec-card));
        color: var(--ec-primary);
        font-size: 0.74rem;
        font-weight: 850;
      }

      .ec-profile-empty {
        padding: 1.1rem;
        text-align: center;
      }

      .ec-profile-empty strong {
        color: var(--ec-txtforbg1);
      }

      .ec-profile-empty p {
        color: var(--ec-txtforbg2);
        margin: 0.35rem 0 0;
      }

      .ec-profile-person-card.is-loading {
        opacity: 0.72;
        pointer-events: none;
      }

      .ec-profile-person-card.is-loading .ec-profile-person-avatar,
      .ec-profile-person-card.is-loading strong,
      .ec-profile-person-card.is-loading small {
        background: color-mix(in srgb, var(--ec-card) 76%, white 4%);
        color: transparent;
        border-radius: 999px;
        min-height: 0.8rem;
      }

      .ec-profile-person-card.is-loading strong {
        display: block;
        width: 9rem;
      }

      .ec-profile-person-card.is-loading small {
        display: block;
        margin-top: 0.45rem;
        width: 5rem;
      }


      .ec-profile-managed-card {
        position: relative;
        overflow: hidden;
        transition:
          transform var(--ec-transition-fast),
          border-color var(--ec-transition),
          box-shadow var(--ec-transition);
      }

      .ec-profile-managed-card::before {
        content: "";
        position: absolute;
        inset: 0 auto 0 0;
        width: 0.25rem;
        background: linear-gradient(
          180deg,
          var(--ec-primary),
          color-mix(in srgb, var(--ec-secondary) 75%, var(--ec-primary))
        );
      }

      .ec-profile-managed-card:hover {
        transform: translateY(-2px);
        border-color: color-mix(in srgb, var(--ec-primary) 48%, var(--ec-border));
        box-shadow:
          0 24px 70px color-mix(in srgb, var(--ec-shadow) 68%, transparent),
          inset 0 1px 0 rgba(255, 255, 255, 0.08);
      }

      .ec-profile-person-title {
        min-width: 0;
      }

      .ec-profile-person-title em {
        display: block;
        margin-top: 0.15rem;
        color: var(--ec-txtforbg2);
        font-size: 0.8rem;
        font-style: normal;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ec-profile-managed-meta {
        grid-template-columns: 1fr;
      }

      .ec-profile-managed-meta p {
        border: 1px solid color-mix(in srgb, var(--ec-border) 76%, transparent);
        border-radius: 0.9rem;
        padding: 0.62rem;
        background: color-mix(in srgb, var(--ec-bg1) 18%, transparent);
      }

      .ec-profile-managed-links {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.45rem;
      }

      .ec-profile-link-chip {
        min-width: 0;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        gap: 0.55rem;
        border: 1px solid color-mix(in srgb, var(--ec-primary) 30%, var(--ec-border));
        border-radius: 0.9rem;
        padding: 0.5rem;
        background: color-mix(in srgb, var(--ec-primary) 7%, transparent);
        text-decoration: none;
      }

      .ec-profile-link-chip b {
        display: inline-flex;
        align-items: center;
        min-height: 1.5rem;
        border-radius: 999px;
        padding: 0.18rem 0.52rem;
        background: color-mix(in srgb, var(--ec-primary) 15%, transparent);
        color: var(--ec-primary);
        font-size: 0.68rem;
        font-weight: 950;
        letter-spacing: 0.055em;
        text-transform: uppercase;
        white-space: nowrap;
      }

      .ec-profile-link-chip span {
        min-width: 0;
        color: var(--ec-txtforbg1);
        font-size: 0.82rem;
        font-weight: 850;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ec-profile-link-chip:hover {
        border-color: color-mix(in srgb, var(--ec-primary) 58%, var(--ec-border));
        background: color-mix(in srgb, var(--ec-primary) 12%, var(--ec-card));
      }

      .ec-profile-muted-line {
        display: block;
        color: var(--ec-txtforbg2);
        font-size: 0.82rem;
      }

      .ec-profile-managed-edit {
        display: grid;
        gap: 0.95rem;
      }

      .ec-profile-managed-section {
        display: grid;
        gap: 0.75rem;
        border: 1px solid color-mix(in srgb, var(--ec-border) 82%, transparent);
        border-radius: 1.15rem;
        padding: 0.85rem;
        background: color-mix(in srgb, var(--ec-bg1) 18%, transparent);
      }

      .ec-profile-managed-section-head {
        display: grid;
        gap: 0.18rem;
      }

      .ec-profile-managed-section-head strong {
        color: var(--ec-txtforbg1);
        font-size: 0.98rem;
        font-weight: 1000;
        letter-spacing: -0.03em;
      }

      .ec-profile-managed-section-head span {
        color: var(--ec-txtforbg2);
        font-size: 0.82rem;
        line-height: 1.45;
      }

      .ec-profile-managed-form-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.72rem;
      }

      .ec-profile-managed-wide {
        grid-column: 1 / -1;
      }

      .ec-profile-json-area,
      .ec-profile-form textarea.ec-profile-json-area {
        width: 100%;
        min-height: 9rem;
        resize: vertical;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 0.82rem;
        line-height: 1.55;
        border: 1px solid var(--ec-border);
        border-radius: 1rem;
        padding: 0.75rem;
        background: color-mix(in srgb, var(--ec-bg1) 44%, transparent);
        color: var(--ec-txtforbg1);
        outline: none;
      }

      .ec-profile-toggle-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.35rem;
        border: 1px solid var(--ec-border);
        border-radius: 999px;
        padding: 0.3rem;
        background: color-mix(in srgb, var(--ec-bg1) 42%, transparent);
      }

      .ec-profile-toggle-btn {
        min-height: 2.35rem;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: var(--ec-txtforbg2);
        font-weight: 950;
        transition:
          transform var(--ec-transition-fast),
          background var(--ec-transition),
          color var(--ec-transition);
      }

      .ec-profile-toggle-btn:hover {
        transform: translateY(-1px);
        color: var(--ec-txtforbg1);
      }

      .ec-profile-toggle-btn.is-active {
        background: linear-gradient(135deg, var(--ec-primary), color-mix(in srgb, var(--ec-secondary) 70%, var(--ec-primary)));
        color: var(--ec-txtforprimary);
      }

      .ec-profile-approval-box {
        display: grid;
        gap: 0.7rem;
        border: 1px solid color-mix(in srgb, var(--ec-warning) 35%, var(--ec-border));
        border-radius: 1rem;
        padding: 0.8rem;
        background: color-mix(in srgb, var(--ec-warning) 8%, transparent);
      }

      .ec-profile-approval-box > strong {
        color: color-mix(in srgb, var(--ec-warning) 84%, var(--ec-txtforbg1));
        font-weight: 1000;
      }

      .ec-profile-approval-box > p {
        margin: 0;
        color: var(--ec-txtforbg2);
        font-size: 0.85rem;
        line-height: 1.5;
      }

      @media (min-width: 820px) {
        .ec-profile-login-layout {
          grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
        }

        .ec-profile-action-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .ec-profile-people-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .ec-profile-otp-actions,
        .ec-profile-otp-row {
          grid-template-columns: auto 1fr;
          align-items: center;
        }
      }

      @media (max-width: 640px) {
        .ec-profile-panel {
          align-items: end;
          padding: 0;
        }

        .ec-profile-modal {
          width: 100%;
          max-height: 94vh;
          border-radius: 1.6rem 1.6rem 0 0;
        }

        .ec-profile-head {
          padding: 0.9rem;
        }

        .ec-profile-logout-head {
          padding: 0 0.7rem;
          font-size: 0.82rem;
        }

        .ec-profile-form-actions,
        .ec-profile-management-actions,
        .ec-profile-person-actions {
          display: grid;
          grid-template-columns: 1fr;
        }
      }

      @keyframes ecProfileFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes ecProfileModalIn {
        from {
          opacity: 0;
          transform: translateY(18px) scale(0.975);
        }

        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes ecProfileStackIn {
        from {
          opacity: 0;
          transform: translateX(10px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
    `;

    document.head.appendChild(style);
  }

  window.ProfileDesign = {
    inject
  };
})();
