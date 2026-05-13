/* =========================================================
   ELECTRICREDIT V2 - PROFILE STRUCTURE
   File: static/components/header/profile/profile_structure.js

   Purpose:
   - Profile/login modal templates
   - Password login and OTP login
   - Modal-stack friendly sub views
   - Profile image fallback support from profile.js
   ========================================================= */

(function () {
  "use strict";

  function renderModal() {
    return `
      <section class="ec-profile-panel" data-profile-panel hidden>
        <div class="ec-profile-backdrop" data-profile-close></div>

        <article class="ec-profile-modal" role="dialog" aria-modal="true">
          <header class="ec-profile-head" data-profile-head>
            <div class="ec-profile-head-profile" data-profile-head-profile>
              ${renderVisitorHeader()}
            </div>

            <div class="ec-profile-head-actions">
              <button class="ec-profile-logout-head" type="button" data-profile-logout hidden>
                Log out
              </button>

              <button class="ec-profile-close" type="button" data-profile-close aria-label="Close profile">
                ✕
              </button>
            </div>
          </header>

          <main class="ec-profile-body">
            <div class="ec-profile-status" data-profile-status>
              Checking profile state...
            </div>

            <section class="ec-profile-main-view" data-profile-main-view></section>
            <section class="ec-profile-stack-view" data-profile-stack-view hidden></section>
          </main>
        </article>
      </section>
    `;
  }

  function renderVisitorHeader() {
    return `
      <div class="ec-profile-head-icon" aria-hidden="true">👤</div>
      <div class="ec-profile-head-copy">
        <span>Account</span>
        <strong>Visitor Mode</strong>
        <small>Login using password or OTP.</small>
      </div>
    `;
  }

  function renderUserHeader(user = {}) {
    const role = String(user.role || "VISITOR").toUpperCase();

    return `
      <div class="ec-profile-head-photo">
        ${
          user.image
            ? `<img src="${escapeHtml(user.image)}" alt="${escapeHtml(user.name || "Profile")}" />`
            : `<span>${escapeHtml(getInitials(user.name || role))}</span>`
        }
      </div>

      <div class="ec-profile-head-copy">
        <span>${escapeHtml(role)}</span>
        <strong>${escapeHtml(user.name || "Current User")}</strong>
        <small>@${escapeHtml(user.username || "account")}</small>
      </div>
    `;
  }

  function renderLoggedOut(activeMode = "password") {
    return `
      <div class="ec-profile-login-layout">
        <section class="ec-profile-visitor-card">
          <div class="ec-profile-avatar-large">👤</div>
          <h3>Visitor Mode</h3>
          <p>
            Public sections are visible. Software tools and protected actions require an
            Administrator, Owner, or Developer account.
          </p>

          <div class="ec-profile-role-list">
            ${renderRoleMini("ADMINISTRATOR", "Users, cards, balance, configuration, logs")}
            ${renderRoleMini("OWNER", "Bulk actions, rates, themes, admin control")}
            ${renderRoleMini("DEVELOPER", "Database, backups, hardware, maintenance")}
          </div>
        </section>

        <section class="ec-profile-login-card">
          <div class="ec-profile-tabs" role="tablist" aria-label="Login method">
            <button
              class="${activeMode === "password" ? "is-active" : ""}"
              type="button"
              data-profile-login-tab="password"
            >
              Password
            </button>

            <button
              class="${activeMode === "otp" ? "is-active" : ""}"
              type="button"
              data-profile-login-tab="otp"
            >
              OTP
            </button>
          </div>

          <form class="ec-profile-login-form" data-profile-login-form>
            <label>
              <span>Username</span>
              <input
                type="text"
                data-profile-login-username
                autocomplete="username"
                placeholder="username"
                required
              />
            </label>

            <label data-profile-password-row ${activeMode === "otp" ? "hidden" : ""}>
              <span>Password</span>
              <input
                type="password"
                data-profile-login-password
                autocomplete="current-password"
                placeholder="password"
              />
            </label>

            <div class="ec-profile-otp-login-area" data-profile-otp-row ${activeMode === "otp" ? "" : "hidden"}>
              <div class="ec-profile-otp-actions">
                <button class="ec-profile-soft-btn" type="button" data-profile-request-login-otp>
                  Send OTP
                </button>
                <small data-profile-otp-hint>OTP will be sent to the account email.</small>
              </div>

              <div class="ec-profile-pin-wrap" data-profile-pin-wrap aria-label="6-digit OTP">
                ${Array.from({ length: 6 }).map((_, index) => {
                  return `
                    <input
                      type="text"
                      inputmode="numeric"
                      maxlength="1"
                      autocomplete="one-time-code"
                      data-profile-pin-box="${index}"
                      aria-label="OTP digit ${index + 1}"
                    />
                  `;
                }).join("")}
              </div>
            </div>

            <button class="ec-profile-primary-btn" type="submit" data-profile-login-submit>
              Log in
            </button>
          </form>
        </section>
      </div>
    `;
  }

  function renderLoggedIn(user = {}) {
    const role = String(user.role || "VISITOR").toUpperCase();

    return `
      <div class="ec-profile-action-grid">
        <button class="ec-profile-action-button" type="button" data-profile-panel-view="change-password">
          <span class="ec-profile-action-icon">🔐</span>
          <span>
            <strong>Change Password</strong>
            <small>Use old password or OTP, then authorize by role.</small>
          </span>
        </button>

        <button class="ec-profile-action-button" type="button" data-profile-panel-view="edit-profile">
          <span class="ec-profile-action-icon">🪪</span>
          <span>
            <strong>Edit Profile</strong>
            <small>Update account details using OTP verification.</small>
          </span>
        </button>

        ${
          role === "OWNER" || role === "DEVELOPER"
            ? `
              <button class="ec-profile-action-button" type="button" data-profile-panel-view="manage-admins">
                <span class="ec-profile-action-icon">🛡️</span>
                <span>
                  <strong>Update Admin</strong>
                  <small>Add, edit, or remove Administrator accounts.</small>
                </span>
              </button>
            `
            : ""
        }

        ${
          role === "DEVELOPER"
            ? `
              <button class="ec-profile-action-button" type="button" data-profile-panel-view="manage-owners">
                <span class="ec-profile-action-icon">👑</span>
                <span>
                  <strong>Update Owner</strong>
                  <small>Add, edit, or remove Owner accounts with OTP rules.</small>
                </span>
              </button>
            `
            : ""
        }
      </div>
    `;
  }

  function renderStackShell(title, subtitle, content) {
    return `
      <div class="ec-profile-stack-card">
        <div class="ec-profile-stack-head">
          <div>
            <button class="ec-profile-back-link" type="button" data-profile-stack-close>
              ← Back
            </button>
            <h3>${escapeHtml(title)}</h3>
            ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
          </div>
        </div>

        ${content}
      </div>
    `;
  }


  function renderProfileOtpBoxes(name, hiddenAttr) {
    const safeName = escapeHtml(name || "otp");
    const safeHiddenAttr = escapeHtml(hiddenAttr || "data-profile-otp-value");

    return `
      <input type="hidden" ${safeHiddenAttr} value="" />
      <div class="ec-profile-pin-wrap ec-profile-inline-otp" data-profile-otp-group="${safeName}" data-profile-otp-target="[${safeHiddenAttr}]" aria-label="6-digit OTP">
        ${Array.from({ length: 6 }).map((_, index) => {
          return `
            <input
              type="text"
              inputmode="numeric"
              maxlength="1"
              autocomplete="one-time-code"
              data-profile-otp-digit="${index}"
              data-profile-otp-name="${safeName}"
              aria-label="OTP digit ${index + 1}"
            />
          `;
        }).join("")}
      </div>
    `;
  }

  function renderChangePassword(user = {}) {
    const role = String(user.role || "ACCOUNT").toUpperCase();
    const authText = getSelfPasswordAuthorizationRule(role);

    return renderStackShell(
      "Change Password",
      "Choose Old Password or OTP, then authorize the password change.",
      `
        <form class="ec-profile-form ec-profile-change-password-form" data-profile-change-password-form>
          <input type="hidden" data-profile-account-id value="${escapeHtml(user.id || "")}" />
          <input type="hidden" data-profile-change-password-method value="password" />

          <section class="ec-profile-managed-section ec-profile-password-section">
            <div class="ec-profile-managed-section-head">
              <strong>Change Password</strong>
              <span>Update this account password using old password or account OTP.</span>
            </div>

            <label>
              <span>New Password</span>
              <input type="password" data-profile-new-password placeholder="Write new password" autocomplete="new-password" required />
            </label>

            <div class="ec-profile-toggle-row" role="group" aria-label="Password verification method">
              <button class="ec-profile-toggle-btn is-active" type="button" data-profile-change-password-mode="password" aria-pressed="true">Old PW</button>
              <button class="ec-profile-toggle-btn" type="button" data-profile-change-password-mode="otp" aria-pressed="false">OTP</button>
            </div>

            <div data-profile-change-password-panel="password">
              <label>
                <span>Old Password</span>
                <input type="password" data-profile-current-password placeholder="Old password" autocomplete="current-password" />
              </label>
            </div>

            <div data-profile-change-password-panel="otp" hidden>
              <div class="ec-profile-otp-row">
                <button class="ec-profile-soft-btn" type="button" data-profile-request-change-password-otp data-otp-lock-key="self-account-password-otp">
                  Send Account OTP
                </button>
                <small>OTP will be sent to this account email. The button reopens after expiry.</small>
              </div>

              ${renderProfileOtpBoxes("self-account", "data-profile-change-password-otp")}
            </div>
          </section>

          <section class="ec-profile-managed-section ec-profile-password-section">
            <div class="ec-profile-managed-section-head">
              <strong>Authorization</strong>
              <span>${escapeHtml(authText.text)}</span>
            </div>

            <label>
              <span>Authorization Username</span>
              <input type="text" data-profile-authorizer-username placeholder="${escapeHtml(authText.placeholder)}" autocomplete="username" />
            </label>

            <div class="ec-profile-otp-row">
              <button class="ec-profile-soft-btn" type="button" data-profile-request-authorizer-otp data-otp-lock-key="self-authorizer-otp">
                Send Authorization OTP
              </button>
              <small>OTP request will state whose account password is about to be changed.</small>
            </div>

            ${renderProfileOtpBoxes("self-authorizer", "data-profile-authorizer-otp")}
          </section>

          <div class="ec-profile-form-actions">
            <button class="ec-profile-soft-btn" type="button" data-profile-clear-change-password>Clear</button>
            <button class="ec-profile-primary-btn" type="submit">Change Password</button>
          </div>
        </form>
      `
    );
  }

  function getSelfPasswordAuthorizationRule(role) {
    if (role === "ADMINISTRATOR") {
      return {
        text: "Administrator password changes require authorization from an Owner or Developer account.",
        placeholder: "owner/developer username"
      };
    }

    if (role === "OWNER") {
      return {
        text: "Owner password changes require authorization from a Developer account.",
        placeholder: "developer username"
      };
    }

    if (role === "DEVELOPER") {
      return {
        text: "Developer password changes require authorization from the main Developer account only.",
        placeholder: "main developer username"
      };
    }

    return {
      text: "Password changes require authorized account approval.",
      placeholder: "authorized username"
    };
  }

  function renderEditProfile(user = {}) {
    const emails = Array.isArray(user.emails) ? user.emails : [];
    const numbers = Array.isArray(user.numbers) ? user.numbers : [];
    const links = Array.isArray(user.links) ? user.links : [];

    return renderStackShell(
      "Edit Profile",
      "Profile updates require OTP verification.",
      `
        <form class="ec-profile-form" data-profile-edit-form>
          <label>
            <span>Name</span>
            <input type="text" data-profile-edit-name value="${escapeHtml(user.name || "")}" required />
          </label>

          <label>
            <span>Username</span>
            <input type="text" data-profile-edit-username value="${escapeHtml(user.username || "")}" required />
          </label>

          <label>
            <span>Birthdate</span>
            <input type="date" data-profile-edit-birthdate value="${escapeHtml(user.birthdate || "")}" />
          </label>

          <label>
            <span>Gender</span>
            <select data-profile-edit-gender>
              ${renderGenderOptions(user.gender)}
            </select>
          </label>

          <label>
            <span>Emails comma-separated</span>
            <input type="text" data-profile-edit-emails value="${escapeHtml(emails.join(", "))}" />
          </label>

          <label>
            <span>Numbers comma-separated</span>
            <input type="text" data-profile-edit-numbers value="${escapeHtml(numbers.join(", "))}" />
          </label>

          <label>
            <span>Image URL / path</span>
            <input type="text" data-profile-edit-image value="${escapeHtml(user.image || "")}" />
          </label>

          <label>
            <span>Links JSON</span>
            <textarea data-profile-edit-links rows="5">${escapeHtml(JSON.stringify(links, null, 2))}</textarea>
          </label>

          <div class="ec-profile-otp-row">
            <button class="ec-profile-soft-btn" type="button" data-profile-request-update-profile-otp>
              Send OTP
            </button>
            <small>Required before saving profile changes.</small>
          </div>

          <label>
            <span>OTP</span>
            <input type="text" inputmode="numeric" maxlength="6" data-profile-update-profile-otp placeholder="000000" required />
          </label>

          <div class="ec-profile-form-actions">
            <button class="ec-profile-soft-btn" type="button" data-profile-stack-close>Cancel</button>
            <button class="ec-profile-primary-btn" type="submit">Save Profile</button>
          </div>
        </form>
      `
    );
  }

  function renderManageAccounts(title, role) {
    return renderStackShell(
      title,
      "Accounts are loaded from the database. Protected actions call the backend profile manager.",
      `
        <div class="ec-profile-management-actions">
          <button class="ec-profile-primary-btn" type="button" data-profile-add-account="${escapeHtml(role)}">
            Add ${escapeHtml(role)}
          </button>
          <button class="ec-profile-soft-btn" type="button" data-profile-refresh-accounts="${escapeHtml(role)}">
            Refresh
          </button>
        </div>

        <div class="ec-profile-people-grid" data-profile-people-grid>
          ${renderLoadingPeople()}
        </div>
      `
    );
  }

  function renderPeopleCard(person = {}) {
    const role = String(person.role || "SUPERUSER").toUpperCase();
    const emails = toArray(person.emails || person.email);
    const numbers = toArray(person.numbers || person.phone || person.contact || person.number);
    const links = normalizeLinks(person.links);
    const image = person.image || person.img || person.avatar || "";

    return `
      <article class="ec-profile-person-card ec-profile-managed-card">
        <div class="ec-profile-person-top">
          <div class="ec-profile-person-avatar">
            ${
              image
                ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(person.name || "Profile")}" onerror="this.closest('.ec-profile-person-avatar').innerHTML='<span>${escapeHtml(getInitials(person.name || role))}</span>'" />`
                : `<span>${escapeHtml(getInitials(person.name || role))}</span>`
            }
          </div>

          <div class="ec-profile-person-title">
            <strong>${escapeHtml(person.name || "Unnamed")}</strong>
            <small>${escapeHtml(role)}[${escapeHtml(person.id || "0")}]</small>
            ${person.username ? `<em>@${escapeHtml(person.username)}</em>` : ""}
          </div>
        </div>

        <div class="ec-profile-person-meta ec-profile-managed-meta">
          ${renderManagedMini("Email", emails[0] || "Not recorded")}
          ${renderManagedMini("Contact", numbers[0] || "Not recorded")}
        </div>

        <div class="ec-profile-person-links ec-profile-managed-links">
          ${
            links.length
              ? links.slice(0, 4).map((link) => renderManagedLink(link)).join("")
              : `<span class="ec-profile-muted-line">No links recorded</span>`
          }
        </div>

        <div class="ec-profile-person-actions">
          <button class="ec-profile-soft-btn" type="button" data-profile-edit-account="${escapeHtml(person.id || "")}">
            Edit
          </button>
          <button class="ec-profile-danger-btn" type="button" data-profile-remove-account="${escapeHtml(person.id || "")}" data-profile-remove-role="${escapeHtml(role)}">
            Remove
          </button>
        </div>
      </article>
    `;
  }

  function renderEditManagedAccountForm(person = {}, actor = {}) {
    const role = String(person.role || "ADMINISTRATOR").toUpperCase();
    const emails = toArray(person.emails || person.email);
    const numbers = toArray(person.numbers || person.phone || person.contact || person.number);
    const links = normalizeLinks(person.links);
    const approverRule = getManagedApproverRule(role);

    return renderStackShell(
      `Edit ${role}[${person.id || ""}]`,
      "Update the account profile. Password changes are prepared for backend OTP approval rules.",
      `
        <form class="ec-profile-form ec-profile-managed-edit" data-profile-edit-managed-form data-target-id="${escapeHtml(person.id || "")}" data-role="${escapeHtml(role)}">
          <section class="ec-profile-managed-section">
            <div class="ec-profile-managed-section-head">
              <strong>Account Record</strong>
              <span>Basic profile information loaded from database.</span>
            </div>

            <div class="ec-profile-managed-form-grid">
              <label><span>Name</span><input type="text" data-managed-name value="${escapeHtml(person.name || "")}" required /></label>
              <label><span>Username</span><input type="text" data-managed-username value="${escapeHtml(person.username || "")}" required /></label>
              <label><span>Birthdate</span><input type="date" data-managed-birthdate value="${escapeHtml(cleanDate(person.birthdate))}" /></label>
              <label><span>Gender</span><select data-managed-gender>${renderGenderOptions(person.gender || "Other")}</select></label>
              <label><span>Emails comma-separated</span><input type="text" data-managed-emails value="${escapeHtml(emails.join(", "))}" /></label>
              <label><span>Numbers comma-separated</span><input type="text" data-managed-numbers value="${escapeHtml(numbers.join(", "))}" /></label>
              <label class="ec-profile-managed-wide"><span>Image URL / path</span><input type="text" data-managed-image value="${escapeHtml(person.image || "")}" /></label>
            </div>
          </section>

          <section class="ec-profile-managed-section">
            <div class="ec-profile-managed-section-head">
              <strong>Links JSON</strong>
              <span>Keep this as JSON. If invalid, link changes are ignored while other edits can continue.</span>
            </div>
            <textarea class="ec-profile-json-area" rows="7" data-managed-links spellcheck="false">${escapeHtml(JSON.stringify(links, null, 2))}</textarea>
          </section>

          <section class="ec-profile-managed-section">
            <div class="ec-profile-managed-section-head">
              <strong>Profile Update OTP</strong>
              <span>For backend-ready account record approval.</span>
            </div>

            <div class="ec-profile-otp-row">
              <button class="ec-profile-soft-btn" type="button" data-profile-request-managed-otp="${escapeHtml(person.id || "")}">
                Send Profile OTP
              </button>
              <small>OTP will be sent to this account email.</small>
            </div>

            <label><span>Profile OTP</span><input type="text" inputmode="numeric" maxlength="6" data-managed-otp placeholder="000000" /></label>
          </section>

          <section class="ec-profile-managed-section ec-profile-password-section">
            <div class="ec-profile-managed-section-head">
              <strong>Password Change</strong>
              <span>Leave New Password blank if you do not want to change password.</span>
            </div>

            <label><span>New Password</span><input type="password" data-managed-new-password placeholder="Write new password" autocomplete="new-password" /></label>

            <div class="ec-profile-toggle-row" role="group" aria-label="Password verification method">
              <input type="hidden" data-managed-password-method value="password" />
              <button class="ec-profile-toggle-btn is-active" type="button" data-managed-password-mode="password" aria-pressed="true">Password</button>
              <button class="ec-profile-toggle-btn" type="button" data-managed-password-mode="otp" aria-pressed="false">OTP</button>
            </div>

            <div data-managed-password-panel="password">
              <label><span>Current Password</span><input type="password" data-managed-current-password placeholder="Current password of this account" autocomplete="current-password" /></label>
            </div>

            <div data-managed-password-panel="otp" hidden>
              <div class="ec-profile-otp-row">
                <button class="ec-profile-soft-btn" type="button" data-profile-request-managed-password-otp="${escapeHtml(person.id || "")}">
                  Send Password OTP
                </button>
                <small>OTP is sent to this account email.</small>
              </div>
              <label><span>Account OTP</span><input type="text" inputmode="numeric" maxlength="6" data-managed-password-otp placeholder="000000" /></label>
            </div>

            <div class="ec-profile-approval-box">
              <strong>${escapeHtml(approverRule.title)}</strong>
              <p>${escapeHtml(approverRule.text)}</p>

              <div class="ec-profile-managed-form-grid">
                <label><span>Approver Username</span><input type="text" data-managed-approver-username placeholder="owner/developer username" /></label>
                <label><span>Approver OTP</span><input type="text" inputmode="numeric" maxlength="6" data-managed-approver-otp placeholder="000000" /></label>
              </div>

              <div class="ec-profile-otp-row">
                <button class="ec-profile-soft-btn" type="button" data-profile-request-managed-approver-otp="${escapeHtml(person.id || "")}">
                  Send Approver OTP
                </button>
                <small>Email wording should say: ${escapeHtml(actor?.name || "Requester")} @${escapeHtml(actor?.username || "username")} requested a password change and needs your OTP.</small>
              </div>
            </div>
          </section>

          <div class="ec-profile-form-actions">
            <button class="ec-profile-soft-btn" type="button" data-profile-stack-close>Cancel</button>
            <button class="ec-profile-primary-btn" type="submit">Save Changes</button>
          </div>
        </form>
      `
    );
  }

  function renderRemoveAccountConfirm(person = {}, confirmationCode = "") {
    const role = String(person.role || "SUPERUSER").toUpperCase();
    const isOwner = role === "OWNER";

    return renderStackShell(
      `Remove ${role}[${person.id || ""}]`,
      isOwner
        ? "Removing an Owner requires a 16-character confirmation code and OTP."
        : "This action removes the account from the system after confirmation.",
      `
        <form class="ec-profile-form" data-profile-remove-account-form data-target-id="${escapeHtml(person.id || "")}" data-role="${escapeHtml(role)}">
          <div class="ec-profile-danger-note">
            <strong>${escapeHtml(person.name || "Unnamed account")}</strong>
            <span>@${escapeHtml(person.username || "account")}</span>
          </div>

          <div class="ec-profile-confirm-box">
            <span>Copy this confirmation code</span>
            <strong>${escapeHtml(confirmationCode)}</strong>
          </div>

          <label>
            <span>Paste 16-character confirmation code</span>
            <input class="ec-profile-mono" type="text" data-remove-confirm-code autocomplete="off" required />
          </label>

          ${isOwner ? `
            <div class="ec-profile-otp-row">
              <button class="ec-profile-soft-btn" type="button" data-profile-request-remove-owner-otp>
                Send Owner Removal OTP
              </button>
              <small>OTP is required by backend before removing an Owner.</small>
            </div>

            <label>
              <span>Owner Removal OTP</span>
              <input type="text" inputmode="numeric" maxlength="6" data-remove-owner-otp placeholder="000000" />
            </label>
          ` : ""}

          <div class="ec-profile-form-actions">
            <button class="ec-profile-soft-btn" type="button" data-profile-stack-close>Cancel</button>
            <button class="ec-profile-danger-btn" type="submit">Remove Account</button>
          </div>
        </form>
      `
    );
  }

  function renderAddAccountForm(role) {
    return renderStackShell(
      `Add ${role}`,
      "A welcome email will be sent if the account has an email address.",
      `
        <form class="ec-profile-form" data-profile-add-account-form data-role="${escapeHtml(role)}">
          <label><span>Name</span><input type="text" data-add-name required /></label>
          <label><span>Username</span><input type="text" data-add-username required /></label>
          <label><span>Temporary Password</span><input type="password" data-add-password required /></label>
          <label><span>Birthdate</span><input type="date" data-add-birthdate /></label>
          <label><span>Gender</span><select data-add-gender>${renderGenderOptions("Other")}</select></label>
          <label><span>Emails comma-separated</span><input type="text" data-add-emails /></label>
          <label><span>Numbers comma-separated</span><input type="text" data-add-numbers /></label>
          <label><span>Image URL / path</span><input type="text" data-add-image /></label>

          <div class="ec-profile-form-actions">
            <button class="ec-profile-soft-btn" type="button" data-profile-stack-close>Cancel</button>
            <button class="ec-profile-primary-btn" type="submit">Create Account</button>
          </div>
        </form>
      `
    );
  }

  function renderManagedMini(label, value) {
    return `
      <p>
        <b>${escapeHtml(label)}</b>
        <span>${escapeHtml(value || "Not recorded")}</span>
      </p>
    `;
  }

  function renderManagedLink(link = {}) {
    const label = link.label || link.title || "Link";
    const url = link.url || link.href || link.value || "#";
    return `
      <a class="ec-profile-link-chip" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(url)}">
        <b>${escapeHtml(label)}</b>
        <span>${escapeHtml(shortenUrl(url))}</span>
      </a>
    `;
  }

  function getManagedApproverRule(role) {
    const safe = String(role || "ADMINISTRATOR").toUpperCase();
    if (safe === "OWNER") {
      return {
        title: "Developer Approval Required",
        text: "Owner password changes require OTP from any Developer account."
      };
    }
    if (safe === "DEVELOPER") {
      return {
        title: "First Developer Approval Required",
        text: "Developer password changes require OTP from the first Developer account only."
      };
    }
    return {
      title: "Owner or Developer Approval Required",
      text: "Administrator password changes require OTP from an Owner or Developer account."
    };
  }

  function normalizeLinks(value) {
    const parsed = parseMaybeJson(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => {
        if (typeof item === "string") return { label: "Link", url: item };
        if (item && typeof item === "object") return { label: item.label || item.title || "Link", url: item.url || item.href || item.value || "" };
        return null;
      }).filter((item) => item && item.url);
    }
    if (parsed && typeof parsed === "object") {
      return Object.entries(parsed).map(([label, url]) => ({ label, url })).filter((item) => item.url);
    }
    if (typeof parsed === "string" && parsed.trim()) return [{ label: "Link", url: parsed.trim() }];
    return [];
  }

  function toArray(value) {
    const parsed = parseMaybeJson(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
    if (parsed === undefined || parsed === null || parsed === "") return [];
    if (typeof parsed === "string") return parsed.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
    return [parsed].filter(Boolean);
  }

  function parseMaybeJson(value) {
    if (typeof value !== "string") return value;
    const text = value.trim();
    if (!text) return "";
    if ((text.startsWith("[") && text.endsWith("]")) || (text.startsWith("{") && text.endsWith("}"))) {
      try { return JSON.parse(text); } catch {}
    }
    return value;
  }

  function cleanDate(value) {
    const text = String(value || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
  }

  function shortenUrl(value) {
    const text = String(value || "");
    try {
      const url = new URL(text);
      const clean = `${url.hostname}${url.pathname && url.pathname !== "/" ? url.pathname.replace(/\/$/, "") : ""}`.replace(/^www\./, "");
      return clean.length > 34 ? `${clean.slice(0, 31)}...` : clean;
    } catch {
      return text.length > 34 ? `${text.slice(0, 31)}...` : text;
    }
  }

  function renderRoleMini(role, description) {
    return `
      <article class="ec-profile-role-mini">
        <strong>${escapeHtml(role)}</strong>
        <span>${escapeHtml(description)}</span>
      </article>
    `;
  }

  function renderLoadingPeople() {
    return Array.from({ length: 3 })
      .map(() => {
        return `
          <article class="ec-profile-person-card is-loading">
            <div class="ec-profile-person-top">
              <div class="ec-profile-person-avatar"></div>
              <div>
                <strong></strong>
                <small></small>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderEmptyPeople(role = "accounts") {
    return `
      <div class="ec-profile-empty">
        <strong>No ${escapeHtml(String(role).toLowerCase())} loaded</strong>
        <p>Refresh the list or check the superusers API/database records.</p>
      </div>
    `;
  }

  function renderGenderOptions(active) {
    const options = ["Male", "Female", "Other"];
    return options
      .map((item) => {
        return `<option value="${escapeHtml(item)}" ${String(active) === item ? "selected" : ""}>${escapeHtml(item)}</option>`;
      })
      .join("");
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

  window.ProfileStructure = {
    renderModal,
    renderVisitorHeader,
    renderUserHeader,
    renderLoggedOut,
    renderLoggedIn,
    renderChangePassword,
    renderEditProfile,
    renderManageAccounts,
    renderPeopleCard,
    renderEditManagedAccountForm,
    renderRemoveAccountConfirm,
    renderAddAccountForm,
    renderLoadingPeople,
    renderEmptyPeople,
    escapeHtml
  };
})();
