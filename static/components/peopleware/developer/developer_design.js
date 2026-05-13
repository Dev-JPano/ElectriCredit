/* DEVELOPER DESIGN v12 */
(function () {
  "use strict";

  const ID = "electricredit-peopleware-developer-design-v12";

  function inject() {
    const old = document.getElementById("electricredit-peopleware-developer-design-v5");
    if (old) old.remove();
    if (document.getElementById(ID)) return;

    const style = document.createElement("style");
    style.id = ID;
    style.textContent = `
      .ec-developer-peopleware{display:grid;gap:1rem}

      .ec-dev-profile{display:grid;gap:.85rem;text-align:left}
      .ec-dev-profile-top{display:grid;grid-template-columns:minmax(12rem,.92fr) minmax(0,1.08fr);gap:.85rem;align-items:stretch}
      .ec-dev-profile-img{display:block;width:100%;min-height:16rem;border:1px solid color-mix(in srgb,var(--ec-primary) 34%,var(--ec-border));border-radius:1.15rem;overflow:hidden;background:color-mix(in srgb,var(--ec-bg1) 28%,transparent);padding:0;cursor:pointer;box-shadow:0 18px 44px color-mix(in srgb,var(--ec-shadow) 62%,transparent)}
      .ec-dev-profile-img img{width:100%;height:100%;min-height:16rem;object-fit:cover;display:block;transition:transform var(--ec-transition),filter var(--ec-transition)}
      .ec-dev-profile-img:hover img{transform:scale(1.035);filter:brightness(1.06)}
      .ec-dev-profile-main{display:grid;grid-template-rows:repeat(4,1fr);gap:.55rem}
      .ec-dev-info-row,.ec-dev-info-block,.ec-dev-wide-card{border:1px solid color-mix(in srgb,var(--ec-border) 80%,transparent);border-radius:1rem;padding:.68rem;background:color-mix(in srgb,var(--ec-bg1) 18%,transparent);min-width:0;text-align:left}
      .ec-dev-info-row{display:grid;grid-template-columns:minmax(5.8rem,.32fr) minmax(0,1fr);gap:.65rem;align-items:center}
      .ec-dev-info-row span,.ec-dev-info-block span,.ec-dev-wide-card>span{color:var(--ec-txtforbg2);font-size:.72rem;font-weight:950;text-transform:uppercase;letter-spacing:.07em}
      .ec-dev-info-row strong,.ec-dev-info-block strong,.ec-dev-wide-card strong{color:var(--ec-txtforbg1);font-size:.9rem;font-weight:950;overflow-wrap:anywhere}
      .ec-dev-profile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem}
      .ec-dev-bullets{margin:.45rem 0 0;padding-left:1.15rem;color:var(--ec-txtforbg1);line-height:1.55}
      .ec-dev-clean-list{display:grid;gap:.45rem;margin:.45rem 0 0;padding:0;list-style:none}
      .ec-dev-clean-list li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.5rem;align-items:center;color:var(--ec-txtforbg1);min-width:0}
      .ec-dev-clean-list a{color:var(--ec-txtforbg1);font-weight:850;text-decoration:none;overflow-wrap:anywhere}.ec-dev-clean-list a:hover{color:var(--ec-primary);text-decoration:underline}
      .ec-dev-link-list{display:grid;gap:.52rem;margin-top:.55rem}
      .ec-dev-link-row{display:grid;grid-template-columns:minmax(6.2rem,9rem) minmax(0,1fr) auto;gap:.55rem;align-items:center;border:1px solid color-mix(in srgb,var(--ec-border) 76%,transparent);border-radius:.9rem;padding:.55rem;background:color-mix(in srgb,var(--ec-bg1) 18%,transparent);min-width:0}
      .ec-dev-link-chip{display:inline-flex;width:fit-content;max-width:100%;align-items:center;justify-content:center;border:1px solid color-mix(in srgb,var(--ec-primary) 46%,var(--ec-border));border-radius:var(--ec-radius-full);padding:.25rem .58rem;background:color-mix(in srgb,var(--ec-primary) 9%,transparent);color:var(--ec-primary)!important;font-size:.68rem!important;font-weight:950!important;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ec-dev-link-row a{color:var(--ec-txtforbg1);font-size:.86rem;font-weight:850;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.ec-dev-link-row a:hover{color:var(--ec-primary);text-decoration:underline}
      .ec-dev-copy-btn{min-width:4.2rem;justify-self:end}.ec-dev-form-links{grid-column:1/-1}.ec-dev-form-links textarea{resize:vertical;min-height:7rem}
      @media(max-width:720px){.ec-dev-profile-top{grid-template-columns:1fr}.ec-dev-profile-img,.ec-dev-profile-img img{min-height:18rem}.ec-dev-profile-grid{grid-template-columns:1fr}.ec-dev-link-row{grid-template-columns:1fr}.ec-dev-copy-btn{justify-self:start}.ec-dev-info-row{grid-template-columns:1fr;gap:.28rem}}
    `;

    document.head.appendChild(style);
  }

  window.PeoplewareDeveloperDesign = { inject };
})();
