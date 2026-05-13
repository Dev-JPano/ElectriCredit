/* ELECTRICREDIT V2 - FOOTER STRUCTURE v2 */
(function () {
  "use strict";

  const DEFAULT_DATA = {
    school: "BUENAVISTA COMMUNITY COLLEGE",
    group: "Capstone G45 | Toneiu's HUB",
    presenter: "JSpit Corporation Presents",
    bccLogo: "/static/assets/logo/bcc.png",
    groupLogo: "/static/assets/logo/dev.png",
    bccUrl: "https://buenavistacommunitycollege.edu.ph/",
    groupUrl: "https://jpano.dev/"
  };

  function render(data = {}) {
    const info = Object.assign({}, DEFAULT_DATA, data || {});

    return `
      <div class="ec-footer" data-footer-component>
        <div class="ec-footer-shell">
          <a class="ec-footer-logo ec-footer-logo-left"
             href="${escapeAttr(info.bccUrl)}"
             target="_blank"
             rel="noopener noreferrer"
             aria-label="Open Buenavista Community College website">
            <img src="${escapeAttr(info.bccLogo)}" alt="Buenavista Community College logo" onerror="this.style.display='none'">
          </a>

          <div class="ec-footer-copy">
            <strong>${escapeHtml(info.school)}</strong>
            <span>${escapeHtml(info.group)}</span>
            <small>${escapeHtml(info.presenter)}</small>
          </div>

          <a class="ec-footer-logo ec-footer-logo-right"
             href="${escapeAttr(info.groupUrl)}"
             target="_blank"
             rel="noopener noreferrer"
             aria-label="Open Toneiu / JPano website">
            <img src="${escapeAttr(info.groupLogo)}" alt="Group logo" onerror="this.style.display='none'">
          </a>
        </div>
      </div>
    `;
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
    return escapeHtml(value).replaceAll("`", "&#096;");
  }

  window.FooterStructure = {
    render
  };
})();
