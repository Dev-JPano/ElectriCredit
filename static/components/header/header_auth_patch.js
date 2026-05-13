/* =========================================================
   ELECTRICREDIT V2 - HEADER AUTH PATCH
   File: static/components/header/header_auth_patch.js
   Purpose: Prevent syncAuthState from crashing when profile loads before header root is mounted.
   ========================================================= */

(function () {
  "use strict";

  function patchHeader() {
    const Header = window.HeaderController || window.ElectriCreditHeader;
    if (!Header || Header.__authSafePatched || typeof Header.syncAuthState !== "function") return;

    const originalSyncAuthState = Header.syncAuthState;

    Header.syncAuthState = function patchedSyncAuthState() {
      if (!this.root) {
        this.root = document.getElementById("header-root");
      }

      if (!this.root) return;

      return originalSyncAuthState.call(this);
    };

    Header.__authSafePatched = true;
  }

  patchHeader();
  document.addEventListener("DOMContentLoaded", patchHeader);
  window.addEventListener("electricredit:auth-change", patchHeader);
})();
