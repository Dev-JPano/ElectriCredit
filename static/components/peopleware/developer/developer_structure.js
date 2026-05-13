/* PEOPLEWARE DEVELOPER STRUCTURE v12 */
(function () {
  "use strict";

  function render(d = {}) {
    const items = normalizeItems(d.items || []);
    const access = d.access || {};
    const state = d.state || {};
    const filtered = applyFilter(items, state);

    return `
      <div class="ec-developer-peopleware ec-peopleware-module">
        <div class="ec-peopleware-toolbar">
          <div>
            <strong>Developers</strong>
            <span>Maintenance accounts. Images fallback to static/assets/developers by name.</span>
          </div>
          <div class="ec-peopleware-actions">
            <button class="ec-peopleware-btn" type="button" data-developer-refresh>Refresh</button>
            <button class="ec-peopleware-btn ec-peopleware-btn-primary" type="button" data-developer-add ${access.canCreate ? "" : "disabled"}>Add Developer</button>
          </div>
        </div>

        ${window.PeoplewareStructure.renderControlBar({
          searchName: "developer-search",
          filterName: "developer-filter",
          sortName: "developer-sort",
          search: state.search || "",
          filter: state.filter || "all",
          sort: state.sort || "id",
          filters: [{ value: "all", label: "All developers" }],
          sorts: [
            { value: "id", label: "Default by ID" },
            { value: "name", label: "Name" }
          ]
        })}

        <div class="ec-peopleware-scroll">
          <div data-developer-list>${renderList(filtered, access)}</div>
        </div>
      </div>
    `;
  }

  function renderList(items, access = {}) {
    return items.length
      ? `<div class="ec-peopleware-grid">${items.map((item) => window.PeoplewareStructure.renderPersonCard(item, {
          prefix: "developer",
          role: "DEVELOPER",
          canEdit: access.canEditItem?.(item) || false,
          canDelete: access.canDeleteItem?.(item) || false
        })).join("")}</div>`
      : empty();
  }

  function empty() {
    return `<div class="ec-peopleware-empty"><div><strong>No developers found</strong><p>Try changing the search.</p></div></div>`;
  }

  function renderDetails(item = {}) {
    const img = resolveImage(item);
    const age = window.PeoplewareStructure?.computeAge?.(item.birthdate) || "Not recorded";
    const roles = toArray(pick(item.roles, item.project_roles, [])).filter(Boolean);
    const emails = toArray(pick(item.emails, item.email, [])).filter(Boolean);
    const numbers = toArray(pick(item.numbers, item.phone, item.number, item.contact, [])).filter(Boolean);
    const links = normalizeLinks(item.links);

    return `
      <div class="ec-dev-profile">
        <section class="ec-dev-profile-top">
          <button class="ec-dev-profile-img" type="button" data-peopleware-image-preview="${attr(img)}" aria-label="Preview developer image">
            <img src="${attr(img)}" alt="${attr(item.name || "Developer")}" onerror="window.PeoplewareStructure.handleImageError(this)">
          </button>

          <div class="ec-dev-profile-main">
            ${infoRow("ID", `[${item.id || 0}]`)}
            ${infoRow("Name", item.name || "—")}
            ${infoRow("Username", item.username ? `@${item.username}` : "—")}
            ${infoRow("Level", "DEVELOPER")}
          </div>
        </section>

        <section class="ec-dev-profile-grid">
          ${infoBlock("Gender", item.gender || "Others")}
          ${infoBlock("Age", age || "Not recorded")}
        </section>

        <section class="ec-dev-wide-card">
          <span>Roles</span>
          ${roles.length ? `<ul class="ec-dev-bullets">${roles.map((role) => `<li>${esc(role)}</li>`).join("")}</ul>` : `<strong>Not recorded</strong>`}
        </section>

        <section class="ec-dev-profile-grid">
          ${listBlock("Emails", emails, "email")}
          ${listBlock("Contacts", numbers, "phone")}
        </section>

        <section class="ec-dev-wide-card">
          <span>Links</span>
          ${links.length ? `<div class="ec-dev-link-list">${links.map(renderLinkRow).join("")}</div>` : `<strong>No links recorded</strong>`}
        </section>
      </div>
    `;
  }

  function renderDeveloperForm(item = {}) {
    const edit = Boolean(item.id);
    const links = normalizeLinks(item.links).map((link) => `${link.label || "Link"} | ${link.url || ""}`).join("\n");
    const email = first(item.emails, item.email);
    const number = first(item.numbers, item.phone, item.number, item.contact);
    const image = item.image || item.img || "";

    return `
      <form class="ec-peopleware-form" data-peopleware-superuser-form data-id="${attr(item.id || "")}" data-role="DEVELOPER">
        <div class="ec-peopleware-form-grid">
          ${input("Name", "name", item.name || "", "Full name", true)}
          ${input("Username", "username", item.username || "", "username", true)}
          ${edit ? "" : input("Password", "password", "", "Password", true, "password")}
          ${input("Birthdate", "birthdate", item.birthdate || "", "", false, "date")}
          ${select("Gender", "gender", item.gender || "Others", ["Others", "Male", "Female"])}
          ${input("Contact Number", "numbers", number || "", "09xxxxxxxxx")}
          ${input("Email", "emails", email || "", "developer@example.com", false, "email")}
          <div class="ec-peopleware-form-field">
            <span>Image</span>
            ${window.PeoplewareStructure.renderImagePicker("image", image)}
          </div>
          <label class="ec-peopleware-form-field ec-dev-form-links">
            <span>Links</span>
            <textarea name="links" rows="5" placeholder="Portfolio | https://example.com\nGitHub | https://github.com/name">${esc(links)}</textarea>
          </label>
          <input type="hidden" name="role" value="DEVELOPER">
        </div>
        <div class="ec-peopleware-note">Required: name, username, password when creating, and role. Optional: birthdate, gender, contact, email, image, and links. Actual roles are no longer edited here.</div>
      </form>
    `;
  }

  function renderLinkRow(link) {
    const label = link.label || "Link";
    const url = link.url || "";
    const display = shortenUrl(url);
    return `
      <div class="ec-dev-link-row">
        <span class="ec-dev-link-chip">${esc(label)}</span>
        <a href="${attr(url)}" target="_blank" rel="noopener noreferrer" title="${attr(url)}">${esc(display)}</a>
        <button class="ec-copy-btn ec-dev-copy-btn" type="button" data-developer-copy="${attr(url)}">Copy</button>
      </div>
    `;
  }

  function listBlock(label, values, type = "text") {
    if (!values.length) return infoBlock(label, "Not recorded");
    return `
      <section class="ec-dev-info-block">
        <span>${esc(label)}</span>
        <ul class="ec-dev-clean-list">
          ${values.map((value) => {
            const text = String(value || "");
            const href = type === "email" ? `mailto:${text}` : type === "phone" ? `tel:${text.replace(/[^+\d]/g, "")}` : "";
            return `<li>${href ? `<a href="${attr(href)}">${esc(text)}</a>` : esc(text)} <button class="ec-copy-btn ec-dev-copy-btn" type="button" data-developer-copy="${attr(text)}">Copy</button></li>`;
          }).join("")}
        </ul>
      </section>
    `;
  }

  function infoRow(label, value) {
    return `<div class="ec-dev-info-row"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
  }

  function infoBlock(label, value) {
    return `<section class="ec-dev-info-block"><span>${esc(label)}</span><strong>${esc(value)}</strong></section>`;
  }

  function normalizeItems(raw) {
    const list = Array.isArray(raw) ? raw : unwrap(raw);
    return list.map((x, i) => {
      const role = String(pick(x.role, "DEVELOPER")).toUpperCase();
      return {
        raw: x,
        id: pick(x.id, x.superuser_id, x.account_id, i + 1),
        name: pick(x.name, x.full_name, x.display_name, ""),
        username: pick(x.username, ""),
        birthdate: pick(x.birthdate, ""),
        gender: pick(x.gender, "Others"),
        image: pick(x.image, x.img, x.image_url, x.avatar, x.photo, x.profile_image, ""),
        email: pick(x.email, x.emails, ""),
        emails: toArray(pick(x.emails, x.email, [])),
        phone: pick(x.phone, x.number, x.contact, x.numbers, ""),
        numbers: toArray(pick(x.numbers, x.phone, x.number, x.contact, [])),
        links: normalizeLinks(pick(x.links, [])),
        role,
        actual_role: "",
        roles: toArray(pick(x.roles, x.project_roles, x.actual_roles, [])),
        status: pick(x.status, "active")
      };
    }).filter((item) => item.role === "DEVELOPER");
  }

  function applyFilter(items, state = {}) {
    let output = [...items];
    const query = String(state.search || "").trim().toLowerCase();
    const sort = state.sort || "id";

    if (query) {
      output = output.filter((item) => String(item.id).includes(query) || String(item.name || "").toLowerCase().includes(query));
    }

    output.sort((a, b) => sort === "name" ? String(a.name).localeCompare(String(b.name)) : Number(a.id || 0) - Number(b.id || 0));
    return output;
  }

  function normalizeStats(items) {
    return { total: items.length };
  }

  function normalizeLinks(value) {
    const parsed = parseMaybeJson(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => {
        if (typeof item === "string") return linkFromString(item);
        if (item && typeof item === "object") return { label: item.label || item.title || "Link", url: item.url || item.href || item.value || "" };
        return null;
      }).filter((item) => item && item.url);
    }
    if (parsed && typeof parsed === "object") {
      return Object.entries(parsed).map(([label, url]) => ({ label, url: String(url || "") })).filter((item) => item.url);
    }
    if (typeof parsed === "string" && parsed.trim()) return [linkFromString(parsed.trim())].filter((item) => item.url);
    return [];
  }

  function linkFromString(value) {
    const text = String(value || "").trim();
    if (!text) return null;
    if (text.includes("|")) {
      const [label, ...rest] = text.split("|");
      return { label: label.trim() || "Link", url: rest.join("|").trim() };
    }
    return { label: "Link", url: text };
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

  function resolveImage(item = {}) {
    if (window.PeoplewareStructure?.resolveImage) return window.PeoplewareStructure.resolveImage(item, "DEVELOPER");
    const image = pick(item.image, item.img, item.image_url, "");
    if (image) return image;
    return item.name ? `/static/assets/developers/${encodeURIComponent(item.name)}.jpg` : "/static/assets/default-image.png";
  }

  function shortenUrl(value) {
    const text = String(value || "");
    try {
      const url = new URL(text);
      const cleanPath = url.pathname && url.pathname !== "/" ? url.pathname.replace(/\/$/, "") : "";
      const shortened = `${url.hostname.replace(/^www\./, "")}${cleanPath}`;
      return shortened.length > 46 ? `${shortened.slice(0, 43)}...` : shortened;
    } catch {
      return text.length > 46 ? `${text.slice(0, 43)}...` : text;
    }
  }

  function unwrap(value) {
    if (!value || typeof value !== "object") return [];
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.superusers)) return value.superusers;
    if (Array.isArray(value.developers)) return value.developers;
    if (Array.isArray(value.rows)) return value.rows;
    if (value.data) return unwrap(value.data);
    return [];
  }

  function toArray(value) {
    return window.PeoplewareStructure?.toArray?.(value) || (Array.isArray(value) ? value : [value].filter(Boolean));
  }

  function first(...values) {
    for (const value of values) {
      const array = toArray(value);
      if (array.length) return array[0];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return "";
  }

  function input(label, name, value = "", placeholder = "", required = false, type = "text") {
    return `<label class="ec-peopleware-form-field"><span>${esc(label)}</span><input type="${attr(type)}" name="${attr(name)}" value="${attr(value)}" placeholder="${attr(placeholder)}" ${required ? "required" : ""}></label>`;
  }

  function select(label, name, value = "", options = []) {
    return `<label class="ec-peopleware-form-field"><span>${esc(label)}</span><select name="${attr(name)}">${options.map((option) => `<option value="${attr(option)}" ${String(option) === String(value) ? "selected" : ""}>${esc(option || "Select")}</option>`).join("")}</select></label>`;
  }

  function pick(...values) {
    for (const value of values) if (value !== undefined && value !== null && value !== "") return value;
    return "";
  }

  function esc(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function attr(value) {
    return esc(value).replaceAll("`", "&#096;");
  }

  window.PeoplewareDeveloperStructure = {
    render,
    renderList,
    renderDetails,
    renderDeveloperForm,
    normalizeItems,
    normalizeStats,
    normalizeLinks,
    applyFilter
  };
})();
