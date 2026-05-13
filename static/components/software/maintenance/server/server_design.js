/* SOFTWARE SERVER MAINTENANCE DESIGN v2 */
(function () {
  "use strict";

  const ID = "electricredit-software-server-design-v2";

  function inject() {
    const old = document.getElementById("electricredit-software-server-design-v1");
    if (old) old.remove();
    if (document.getElementById(ID)) return;

    const s = document.createElement("style");
    s.id = ID;
    s.textContent = `
      .ec-software-server{width:100%;min-width:0}
      .ec-software-server .ec-software-card{min-width:0}
    `;
    document.head.appendChild(s);
  }

  window.SoftwareServerDesign = { inject };
})();
