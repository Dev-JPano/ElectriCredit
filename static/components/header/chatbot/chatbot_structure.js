/* =========================================================
   ELECTRICREDIT V2 - CHATBOT STRUCTURE
   File: static/components/header/chatbot/chatbot_structure.js
   Purpose: Chatbot HTML templates only
   ========================================================= */

(function () {
  "use strict";

  function renderLauncher() {
    return `
      <button
        class="ec-chatbot-launcher"
        type="button"
        data-chatbot-launcher
        aria-label="Open ElectriCredit chatbot"
        title="ElectriCredit Assistant"
      >
        <span class="ec-chatbot-launcher-glow" aria-hidden="true"></span>
        <svg class="ec-chatbot-launcher-svg" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4.5 5.5A7.5 7.5 0 0 1 12 3h.4a7.1 7.1 0 0 1 7.1 7.1v.3a7.1 7.1 0 0 1-7.1 7.1H9.2L5 21v-4.2a7.5 7.5 0 0 1-.5-11.3Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M8.3 10.4h7.4M8.3 13.3h4.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
        </svg>
        <span class="ec-chatbot-unread" data-chatbot-unread hidden>!</span>
      </button>
    `;
  }

  function renderPanel() {
    return `
      <section
        class="ec-chatbot-panel"
        data-chatbot-panel
        aria-label="ElectriCredit chatbot"
        hidden
      >
        <header class="ec-chatbot-head">
          <div class="ec-chatbot-avatar" aria-hidden="true">⚡</div>

          <div class="ec-chatbot-title-wrap">
            <strong class="ec-chatbot-title">ElectriCredit Assistant</strong>
            <span class="ec-chatbot-status" data-chatbot-status>
              Backend-ready local guide
            </span>
          </div>

          <div class="ec-chatbot-head-actions">
            <button
              class="ec-chatbot-head-btn"
              type="button"
              data-chatbot-reset
              aria-label="Reset chat"
              title="Reset chat"
            >
              ↻
            </button>

            <button
              class="ec-chatbot-head-btn"
              type="button"
              data-chatbot-close
              aria-label="Close chatbot"
              title="Close"
            >
              ✕
            </button>
          </div>
        </header>

        <div class="ec-chatbot-belt" aria-label="Chatbot command belt">
          <div class="ec-chatbot-belt-track" data-chatbot-command-belt></div>
        </div>

        <main class="ec-chatbot-messages" data-chatbot-messages></main>

        <div class="ec-chatbot-suggestions" data-chatbot-suggestions></div>

        <form class="ec-chatbot-form" data-chatbot-form>
          <label class="ec-sr-only" for="ec-chatbot-input">
            Ask ElectriCredit
          </label>

          <input
            id="ec-chatbot-input"
            class="ec-chatbot-input"
            data-chatbot-input
            type="text"
            autocomplete="off"
            placeholder="Ask or type /help..."
          />

          <button
            class="ec-chatbot-send"
            type="submit"
            aria-label="Send message"
          >
            ➤
          </button>
        </form>
      </section>
    `;
  }

  function renderMessage(message = {}) {
    const role = message.role === "user" ? "user" : "bot";
    const label = role === "user" ? "You" : "Assistant";
    const text = message.text || message.response || "";

    return `
      <article class="ec-chatbot-message is-${role}">
        <div class="ec-chatbot-message-bubble">
          <span class="ec-chatbot-message-label">${label}</span>
          <p>${escapeHtml(text)}</p>

          ${renderCards(message.cards)}

          ${
            message.intent
              ? `<small class="ec-chatbot-message-intent">${escapeHtml(message.intent)}</small>`
              : ""
          }
        </div>
      </article>
    `;
  }

  function renderCards(cards = []) {
    if (!Array.isArray(cards) || !cards.length) return "";

    return `
      <div class="ec-chatbot-card-grid">
        ${cards.map((card) => renderCard(card)).join("")}
      </div>
    `;
  }

  function renderCard(card = {}) {
    if (card.type === "person") return renderPersonCard(card);

    return `
      <article class="ec-chatbot-data-card">
        <strong>${escapeHtml(card.title || card.name || "Card")}</strong>
        <p>${escapeHtml(card.description || card.label || "")}</p>
      </article>
    `;
  }

  function renderPersonCard(card = {}) {
    const emails = Array.isArray(card.emails) ? card.emails : [];
    const numbers = Array.isArray(card.numbers) ? card.numbers : [];
    const links = Array.isArray(card.links) ? card.links : [];

    return `
      <article class="ec-chatbot-person-card">
        <div class="ec-chatbot-person-top">
          <div class="ec-chatbot-person-avatar">
            ${
              card.image
                ? `<img src="${escapeHtml(card.image)}" alt="${escapeHtml(card.name || "Profile")}" />`
                : `<span>${escapeHtml(getInitials(card.name || card.role || "EC"))}</span>`
            }
          </div>

          <div>
            <strong>${escapeHtml(card.name || "Unnamed")}</strong>
            <small>${escapeHtml(card.label || card.role || "")}</small>
          </div>
        </div>

        <div class="ec-chatbot-person-meta">
          ${card.username ? `<p>@${escapeHtml(card.username)}</p>` : ""}
          ${emails[0] ? `<p>${escapeHtml(emails[0])}</p>` : ""}
          ${numbers[0] ? `<p>${escapeHtml(numbers[0])}</p>` : ""}
        </div>

        ${
          links.length
            ? `
              <div class="ec-chatbot-person-links">
                ${links.slice(0, 3).map((link) => {
                  return `
                    <a href="${escapeHtml(link.url || "#")}" target="_blank" rel="noopener noreferrer">
                      ${escapeHtml(link.label || "Link")}
                    </a>
                  `;
                }).join("")}
              </div>
            `
            : ""
        }
      </article>
    `;
  }

  function renderSuggestion(text) {
    return `
      <button class="ec-chatbot-suggestion" type="button" data-chatbot-suggestion>
        ${escapeHtml(text)}
      </button>
    `;
  }

  function renderCommand(command) {
    return `
      <button class="ec-chatbot-command" type="button" data-chatbot-command="${escapeHtml(command)}">
        ${escapeHtml(command)}
      </button>
    `;
  }

  function renderTyping() {
    return `
      <article class="ec-chatbot-message is-bot" data-chatbot-typing>
        <div class="ec-chatbot-message-bubble">
          <span class="ec-chatbot-message-label">Assistant</span>
          <div class="ec-chatbot-typing">
            <i></i>
            <i></i>
            <i></i>
          </div>
        </div>
      </article>
    `;
  }

  function getInitials(name) {
    return String(name || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() || "")
      .join("") || "?";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  window.ChatbotStructure = {
    renderLauncher,
    renderPanel,
    renderMessage,
    renderCards,
    renderCard,
    renderPersonCard,
    renderSuggestion,
    renderCommand,
    renderTyping,
    escapeHtml
  };
})();