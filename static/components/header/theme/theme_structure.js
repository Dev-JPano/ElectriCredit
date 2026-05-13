/* =========================================================
   ELECTRICREDIT V2 - THEME STRUCTURE
   File: static/components/header/theme/theme_structure.js
   Purpose: Theme modal HTML templates only
   ========================================================= */

(function () {
  "use strict";

  function renderModal() {
    return `
      <section
        class="ec-theme-panel"
        data-theme-panel
        aria-label="Theme selector"
        hidden
      >
        <div class="ec-theme-backdrop" data-theme-close></div>

        <article class="ec-theme-modal" role="dialog" aria-modal="true">
          <header class="ec-theme-head">
            <div>
              <span class="ec-theme-kicker">Frontend Theme</span>
              <h2>Choose Theme</h2>
              <p>Theme changes affect this browser only.</p>
            </div>

            <button
              class="ec-theme-close"
              type="button"
              data-theme-close
              aria-label="Close theme selector"
            >
              ✕
            </button>
          </header>

          <div class="ec-theme-body">
            <div class="ec-theme-current" data-theme-current>
              <div>
                <small>Current Theme</small>
                <strong data-theme-current-name>Electric Default</strong>
              </div>

              <button
                class="ec-theme-reset"
                type="button"
                data-theme-reset
              >
                Reset
              </button>
            </div>

            <div class="ec-theme-status" data-theme-status>
              Loading themes...
            </div>

            <div class="ec-theme-grid" data-theme-grid></div>
          </div>
        </article>
      </section>
    `;
  }

  function renderThemeCard(theme = {}, activeThemeId = "") {
    const id = String(theme.id ?? "");
    const isActive = String(activeThemeId) === id;

    const colors = normalizeTheme(theme);

    return `
      <button
        class="ec-theme-card ${isActive ? "is-active" : ""}"
        type="button"
        data-theme-card
        data-theme-id="${escapeHtml(id)}"
        aria-label="Apply ${escapeHtml(theme.name || "Theme")}"
      >
        <div
          class="ec-theme-card-preview"
          style="
            --preview-bg:${escapeAttr(colors.bg1)};
            --preview-surface:${escapeAttr(colors.surface)};
            --preview-primary:${escapeAttr(colors.primary)};
            --preview-secondary:${escapeAttr(colors.secondary)};
            --preview-text:${escapeAttr(colors.txtforbg1)};
          "
        >
          <span></span>
          <i></i>
          <b></b>
        </div>

        <div class="ec-theme-card-info">
          <strong>${escapeHtml(theme.name || "Unnamed Theme")}</strong>
          <small>Priority ${escapeHtml(theme.priority ?? "—")}</small>
        </div>

        <div class="ec-theme-swatches" aria-hidden="true">
          <span style="background:${escapeAttr(colors.primary)}"></span>
          <span style="background:${escapeAttr(colors.secondary)}"></span>
          <span style="background:${escapeAttr(colors.bg1)}"></span>
        </div>

        ${
          isActive
            ? `<em class="ec-theme-active-label">Active</em>`
            : `<em class="ec-theme-active-label">Apply</em>`
        }
      </button>
    `;
  }

  function renderEmpty() {
    return `
      <div class="ec-theme-empty">
        <strong>No themes found</strong>
        <p>The system will use the default Electric theme.</p>
      </div>
    `;
  }

  function renderLoadingCards() {
    return Array.from({ length: 3 })
      .map(() => {
        return `
          <div class="ec-theme-card is-loading">
            <div class="ec-theme-card-preview"></div>
            <div class="ec-theme-card-info">
              <strong></strong>
              <small></small>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function normalizeTheme(theme = {}) {
    return {
      id: theme.id ?? "",
      name: theme.name || "Electric Default",
      primary: theme.primary || theme.accent || "#38bdf8",
      secondary: theme.secondary || theme.success || "#22c55e",
      warning: theme.warning || "#f59e0b",
      danger: theme.danger || "#ef4444",
      bg1: theme.bg1 || theme.background || "#020617",
      bg2: theme.bg2 || "#0f172a",
      txtforbg1: theme.txtforbg1 || theme.text || "#f8fafc",
      txtforbg2: theme.txtforbg2 || theme.muted_text || "#cbd5e1",
      txtforprimary: theme.txtforprimary || "#021018",
      txtforsecondary: theme.txtforsecondary || "#02140a",
      surface: theme.surface || "rgba(15, 23, 42, 0.78)",
      card: theme.card || "rgba(30, 41, 59, 0.74)",
      border: theme.border || "rgba(148, 163, 184, 0.22)",
      shadow: theme.shadow || "rgba(0, 0, 0, 0.42)",
      priority: theme.priority ?? 1
    };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll(";", "");
  }

  window.ThemeStructure = {
    renderModal,
    renderThemeCard,
    renderEmpty,
    renderLoadingCards,
    normalizeTheme,
    escapeHtml
  };
})();