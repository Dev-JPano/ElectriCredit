/* ELECTRICREDIT V2 - FOOTER CONTROLLER v2 */
(function () {
  "use strict";

  const C = {
    root: null,
    app: null,

    async init(ctx = {}) {
      this.root = ctx.root || document.querySelector("#footer-root");
      this.app = ctx.app || window.ElectriCredit || null;

      if (!this.root) return;

      if (!window.FooterStructure || !window.FooterDesign) {
        console.warn("FooterStructure or FooterDesign is missing.");
        return;
      }

      window.FooterDesign.inject();
      this.render();
    },

    render() {
      this.root.innerHTML = window.FooterStructure.render({
        school: "BUENAVISTA COMMUNITY COLLEGE",
        group: "Capstone G45 | Toneiu's HUB",
        presenter: "JSpit Corporation Presents",
        bccLogo: "/static/assets/logo/bcc.png",
        groupLogo: "/static/assets/logo/dev.png",
        bccUrl: "https://buenavistacommunitycollege.edu.ph/",
        groupUrl: "https://jpano.dev/"
      });
    }
  };

  window.FooterController = C;
  window.ElectriCreditFooter = C;
})();
