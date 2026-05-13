/* ELECTRICREDIT V2 - PEOPLEWARE STRUCTURE patch v11 */
(function () {
  "use strict";

  const DEFAULT_IMAGE = "/static/assets/default-image.png";
  const DEV_IMAGES = ["Jaycob Lumayag", "Jellen Anos", "Jellen Años", "Jhon Anthony Pano", "Joselito Jr. Tambacan", "Joshane Rhea Paquibot"];

  const TABS = [
    { id: "user", label: "USERS", hint: "tenants", title: "Users", subtitle: "Tenant records, RFID cards, contact details, balances, and usage ownership." },
    { id: "administrator", label: "OPERATORS", hint: "admin and owner", title: "Operators", subtitle: "Administrator and Owner accounts for system operations and management." },
    { id: "developer", label: "DEVELOPERS", hint: "maintenance", title: "Developers", subtitle: "Developer accounts for maintenance, database recovery, and technical control." }
  ];

  function render(data = {}) {
    const s = normalizeSummary(data);
    return `<div id="peopleware" class="ec-peopleware" data-peopleware-section><div class="ec-peopleware-shell"><header class="ec-peopleware-head"><div><span class="ec-peopleware-kicker">Peopleware</span><h2>Access Control</h2><p>Manage tenants, RFID cards, administrators, owners, and developers. Records are visible for monitoring while editing actions depend on the signed-in role.</p></div><div class="ec-peopleware-status" aria-label="Peopleware summary">${renderStatus("Users", s.users)}${renderStatus("Cards", s.cards)}${renderStatus("Operators", s.operators)}${renderStatus("Developers", s.developers)}</div></header><section class="ec-peopleware-console" aria-label="Peopleware monitor"><div class="ec-peopleware-console-top"><div class="ec-peopleware-console-title"><strong data-peopleware-title>${esc(TABS[0].title)}</strong><span data-peopleware-subtitle>${esc(TABS[0].subtitle)}</span></div><nav class="ec-peopleware-tabs" aria-label="Peopleware tabs" data-peopleware-tabs>${TABS.map((t, i) => renderTab(t, i === 0)).join("")}</nav></div>${TABS.map((t, i) => `<section class="ec-peopleware-panel ${i === 0 ? "is-active" : ""}" data-peopleware-panel="${attr(t.id)}" ${i === 0 ? "" : "hidden"}><div data-peopleware-mount="${attr(t.id)}" class="ec-peopleware-loading">Loading ${esc(t.label.toLowerCase())}...</div></section>`).join("")}</section></div></div>`;
  }

  function renderTab(t, a) { return `<button type="button" class="ec-peopleware-tab ${a ? "is-active" : ""}" data-peopleware-tab="${attr(t.id)}" aria-selected="${a ? "true" : "false"}"><strong>${esc(t.label)}</strong><span>${esc(t.hint)}</span></button>`; }
  function renderStatus(l, v) { return `<article class="ec-peopleware-stat"><span>${esc(l)}</span><strong>${esc(formatValue(v))}</strong></article>`; }
  function metric(l, v) { return `<article class="ec-peopleware-metric"><span>${esc(l)}</span><strong>${esc(formatValue(v))}</strong></article>`; }
  function detail(l, v) { return `<div class="ec-peopleware-detail"><span>${esc(labelize(l))}</span><strong>${esc(formatValue(v))}</strong></div>`; }

  function renderControlBar({ searchName, filterName, sortName, search = "", filter = "", sort = "", filters = [], sorts = [] } = {}) {
    return `<div class="ec-pw-controlbar"><input class="ec-pw-search" type="search" placeholder="Search by name or ID..." value="${attr(search)}" data-${attr(searchName)}><div class="ec-pw-filter-row"><select class="ec-pw-select" data-${attr(filterName)}>${filters.map((x) => `<option value="${attr(x.value)}" ${String(filter) === String(x.value) ? "selected" : ""}>${esc(x.label)}</option>`).join("")}</select><select class="ec-pw-select" data-${attr(sortName)}>${sorts.map((x) => `<option value="${attr(x.value)}" ${String(sort) === String(x.value) ? "selected" : ""}>${esc(x.label)}</option>`).join("")}</select></div></div>`;
  }

  function simpleList(values, type = "text") {
    const arr = toArray(values).filter((x) => x !== undefined && x !== null && x !== "");
    if (!arr.length) return `<strong>—</strong>`;
    return `<ul class="ec-pw-simple-list">${arr.map((item) => {
      let label = "";
      let value = item;
      if (item && typeof item === "object") {
        label = item.label || item.title || "";
        value = item.url || item.href || item.value || item.email || item.number || "";
      }
      const text = formatValue(value);
      let href = "";
      if (type === "email") href = `mailto:${text}`;
      if (type === "contact") href = `tel:${text.replace(/[^+\\d]/g, "")}`;
      if (type === "link" && /^https?:\/\//i.test(text)) href = text;
      const shown = label ? `${label} — ${text}` : text;
      if (href) return `<li><a href="${attr(href)}" ${type === "link" ? 'target="_blank" rel="noopener noreferrer"' : ""}>${esc(shown)}</a></li>`;
      return `<li>${esc(shown)}</li>`;
    }).join("")}</ul>`;
  }

  function chip(l, s = l) { return `<span class="ec-peopleware-chip ec-chip-${attr(String(s || l || "unknown").toLowerCase())}">${esc(l)}</span>`; }
  function chipRow(chips = []) { return `<div class="ec-chip-row">${chips.filter(Boolean).join("")}</div>`; }
  function icon(type) {
    const p = {
      role: '<path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm7 8a7 7 0 0 0-14 0"/>',
      email: '<path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/>',
      phone: '<path d="M7 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 4 6a2 2 0 0 1 2-2Z"/>'
    };
    return `<svg class="ec-peopleware-mini-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p[type] || p.role}</svg>`;
  }

  function renderPersonCard(item = {}, opt = {}) {
    const role = String(opt.role || item.role || "USER").toUpperCase();
    const prefix = opt.prefix || "user";
    const image = resolveImage(item, role);
    const email = first(item.email, item.emails);
    const phone = first(item.number, item.phone, item.numbers, item.contact);
    const username = item.username || item.handle || "";
    const showUsername = role !== "USER";
    const cardCount = Number(item.cards || item.card_count || item.cards_count || 0) || 0;
    const totalBalance = Number(item.total_card_balance ?? item.balance ?? 0) || 0;
    const hasDebt = Boolean(item.has_debt);
    const isUsing = Boolean(item.is_using || item.active_session || item.active_cards || item.currently_using);
    const isCutoff = Boolean(item.cutoff || item.is_cutoff);
    const accent = role === "DEVELOPER" ? "var(--ec-success)" : role === "OWNER" ? "var(--ec-warning)" : "var(--ec-primary)";
    const stateClass = isCutoff ? "is-cutoff" : hasDebt ? "is-debt" : isUsing ? "is-using" : "";

    const chips = role === "USER"
      ? [chip("USER", "USER"), chip(formatPeso(totalBalance), totalBalance < 0 ? "debt" : "balance"), hasDebt ? chip("DEBT", "cutoff") : "", chip(`${cardCount}`, "cards"), isUsing ? chip("USING", "using") : "", isCutoff ? chip("CUTOFF", "cutoff") : ""]
      : [chip(role, role)];

    return `<article class="ec-peopleware-person ${stateClass}" style="--person-accent:${accent}"><img class="ec-peopleware-avatar" src="${attr(image)}" alt="${attr(item.name || role)}" data-peopleware-image-preview="${attr(image)}" data-peopleware-img-role="${attr(role)}" data-peopleware-img-name="${attr(item.name || "")}" onerror="window.PeoplewareStructure.handleImageError(this)"><div class="ec-peopleware-person-body"><div class="ec-peopleware-name-row"><strong class="ec-peopleware-name">${esc(item.name || "Unnamed")}</strong><span class="ec-peopleware-id">[${esc(item.id || 0)}]</span></div><div class="ec-peopleware-line">${icon("role")}${showUsername ? `<strong>@${esc(username || "username")}</strong>` : ""}${chipRow(chips)}</div><div class="ec-peopleware-line">${icon("email")}<span>${esc(email || "No email recorded")}</span></div><div class="ec-peopleware-line">${icon("phone")}<span>${esc(phone || "No contact recorded")}</span></div><div class="ec-peopleware-person-actions"><button class="ec-peopleware-btn" type="button" data-${attr(prefix)}-details="${attr(item.id)}">Expand</button><button class="ec-peopleware-btn" type="button" data-${attr(prefix)}-edit="${attr(item.id)}" ${opt.canEdit ? "" : "disabled"}>Edit</button><button class="ec-peopleware-btn ec-peopleware-btn-danger" type="button" data-${attr(prefix)}-delete="${attr(item.id)}" ${opt.canDelete ? "" : "disabled"}>Delete</button></div></div></article>`;
  }

  function field(label, value) {
    return `<div class="ec-pw-row"><span>${esc(label)}</span><strong>${esc(formatValue(value))}</strong></div>`;
  }
  function block(label, html, span = false) {
    return `<div class="ec-pw-block ${span ? "ec-pw-span-2" : ""}"><span>${esc(label)}</span>${html}</div>`;
  }

  function renderPersonProfile(item = {}, opt = {}) {
    const role = String(opt.role || item.role || "USER").toUpperCase();
    const isUser = role === "USER";
    const img = resolveImage(item, role);
    const age = computeAge(item.birthdate);
    const totalBalance = Number(item.total_card_balance ?? item.balance ?? 0) || 0;
    const roles = toArray(item.roles || item.project_roles || item.actual_roles || item.actual_role).filter(Boolean);

    const sideFields = isUser
      ? `${field("ID", item.id || 0)}${field("Name", item.name || "—")}${field("Level", role)}${field("Balance Total", formatPeso(totalBalance))}`
      : `${field("ID", item.id || 0)}${field("Name", item.name || "—")}${field("Username", item.username ? `@${item.username}` : "—")}${field("Level", role)}`;

    const below = isUser
      ? `<div class="ec-pw-pair-grid">${field("Age", age || "Not recorded")}${field("Gender", item.gender || "Others")}</div><div class="ec-pw-pair-grid">${block("Emails", simpleList(item.emails || item.email, "email"))}${block("Contacts", simpleList(item.numbers || item.phone || item.number, "contact"))}</div><div class="ec-pw-pair-grid">${field("Cards #", item.cards || 0)}${field("Used", formatNumber(item.used_kwh || 0, 2))}</div>`
      : `<div class="ec-pw-pair-grid">${field("Gender", item.gender || "Others")}${field("Age", age || "Not recorded")}</div>${roles.length ? block("Roles", `<ul class="ec-pw-simple-list">${roles.map((r) => `<li>${esc(String(r))}</li>`).join("")}</ul>`, true) : ""}<div class="ec-pw-pair-grid">${block("Emails", simpleList(item.emails || item.email, "email"))}${block("Contacts", simpleList(item.numbers || item.phone || item.number, "contact"))}</div>${block("Links", simpleList(item.links || [], "link"), true)}`;

    return `<div class="ec-pw-expanded"><div class="ec-pw-top"><div class="ec-pw-image-card"><img class="ec-peopleware-avatar" src="${attr(img)}" alt="${attr(item.name || role)}" data-peopleware-image-preview="${attr(img)}" data-peopleware-img-role="${attr(role)}" data-peopleware-img-name="${attr(item.name || "")}" onerror="window.PeoplewareStructure.handleImageError(this)"><div class="ec-pw-field-stack">${sideFields}</div></div></div>${below}</div>`;
  }

  function renderPersonDetails(item = {}, opt = {}) { return renderPersonProfile(item, opt); }

  function renderImagePicker(name = "image", value = "") {
    const src = value || DEFAULT_IMAGE;
    return `<div class="ec-image-picker" data-image-picker><input type="hidden" name="${attr(name)}" value="${attr(value || "")}" data-image-value><input type="file" accept="image/*" hidden data-image-upload><input type="file" accept="image/*" capture="environment" hidden data-image-camera><div class="ec-image-picker-preview"><img src="${attr(src)}" alt="Selected image" data-image-preview onerror="this.src='${DEFAULT_IMAGE}'"><div><strong>Image</strong><p class="ec-muted">Selected image is sent as the database image value.</p></div></div><div class="ec-image-picker-actions"><button class="ec-peopleware-btn" type="button" data-image-upload-btn>Upload</button><button class="ec-peopleware-btn" type="button" data-image-camera-btn>Camera</button><button class="ec-peopleware-btn ec-peopleware-btn-danger" type="button" data-image-clear-btn>Clear</button></div></div>`;
  }

  function renderUserForm(u = {}) {
    return `<form class="ec-peopleware-form" data-peopleware-user-form data-id="${attr(u.id || "")}"><div class="ec-peopleware-form-grid">${input("Name", "name", u.name || "", "Tenant full name", true)}${input("Birthdate", "birthdate", u.birthdate || "", "", false, "date")}${select("Gender", "gender", u.gender || "Others", ["Others", "Male", "Female"])}${input("Contact Number", "numbers", first(u.number, u.phone, u.numbers) || "", "09xxxxxxxxx")}${input("Email", "emails", first(u.email, u.emails) || "", "tenant@example.com", false, "email")}<div class="ec-peopleware-form-field"><span>Image</span>${renderImagePicker("image", u.image || u.img || "")}</div></div></form>`;
  }

  function renderLinksTextarea(value) {
    const list = toArray(value).filter(Boolean).map((x) => {
      if (x && typeof x === "object") return `${x.label || "Link"} | ${x.url || x.href || x.value || ""}`;
      return String(x);
    }).join("\n");
    return `<label class="ec-peopleware-form-field"><span>Links</span><textarea name="links" placeholder="Portfolio | https://example.com&#10;GitHub | https://github.com/username">${esc(list)}</textarea></label>`;
  }

  function renderOperatorForm(u = {}, role = "ADMINISTRATOR") {
    const edit = Boolean(u.id);
    return `<form class="ec-peopleware-form" data-peopleware-superuser-form data-id="${attr(u.id || "")}" data-role="${attr(role)}"><div class="ec-peopleware-form-grid">${input("Name", "name", u.name || "", "Full name", true)}${input("Username", "username", u.username || "", "username", true)}${!edit ? input("Password", "password", "", "Password", true, "password") : ""}${input("Birthdate", "birthdate", u.birthdate || "", "", false, "date")}${select("Gender", "gender", u.gender || "Others", ["Others", "Male", "Female"])}${input("Contact Number", "numbers", first(u.number, u.phone, u.numbers) || "", "09xxxxxxxxx")}${input("Email", "emails", first(u.email, u.emails) || "", "account@example.com", false, "email")}<div class="ec-peopleware-form-field"><span>Image</span>${renderImagePicker("image", u.image || u.img || "")}</div>${role === "DEVELOPER" ? input("Actual Project Role", "actual_role", u.actual_role || "", "Group Leader / Full-Stack Developer") : ""}${select("Role", "role", role, role === "DEVELOPER" ? ["DEVELOPER"] : ["ADMINISTRATOR", "OWNER"])}${renderLinksTextarea(u.links || [])}</div><div class="ec-peopleware-note">For links, use one per line: Label | https://link.com</div></form>`;
  }

  function renderCardCreateForm(userId) {
    return `<form class="ec-peopleware-form" data-peopleware-card-create-form data-user-id="${attr(userId)}"><div class="ec-peopleware-form-grid">${input("RFID UID", "uid", "", "Ex. CARD-0001 or scanned UID", true)}${input("Initial Balance", "balance", "0", "0", false, "number", "0.01")}${input("Debt Limit", "limit", "100", "100", false, "number", "0.01")}${select("Status", "status", "active", ["active", "banned"])}${input("Note", "note", "", "Optional note")}</div><div class="ec-peopleware-note">Debt limit controls Credit Mode. Example: limit 100 allows debt down to -99, but reaching -100 should trigger cut-off in backend/device logic.</div></form>`;
  }

  function renderCardList(cards = [], access = {}) {
    if (!cards.length) return `<div class="ec-peopleware-empty"><div><strong>No cards linked</strong><p>Cards assigned to this user will appear here.</p></div></div>`;
    return `<div class="ec-peopleware-card-scroll"><div class="ec-peopleware-card-grid">${cards.map((c, i) => renderCardItem(c, i, access)).join("")}</div></div>`;
  }

  function renderCardItem(c = {}, i = 0, a = {}) {
    const id = c.id || c.card_id || i + 1;
    const uid = c.uid || c.rfid_uid || c.card_uid || "No UID";
    const st = String(c.status || "active").toLowerCase();
    const balance = Number(c.balance || 0) || 0;
    const limit = Number(c.limit ?? c.credit_limit ?? c.debt_limit ?? 0) || 0;
    const debt = Math.min(balance, 0);
    const cutoff = limit > 0 && debt <= -Math.abs(limit);
    return `<article class="ec-peopleware-card-item" data-card-item="${attr(id)}"><div class="ec-peopleware-card-head"><div><strong>ID# ${esc(id)} &nbsp; ${esc(shortUid(uid))}</strong><span>${esc(uid)}</span></div>${chip(cutoff ? "cutoff" : st, cutoff ? "cutoff" : st)}</div><div class="ec-peopleware-detail-grid">${detail("Balance", formatPeso(balance))}${detail("Debt Limit", formatPeso(limit))}${detail("Used kWh", formatNumber(c.used_kwh || 0, 2))}${detail("Debt", formatPeso(debt))}</div><div class="ec-peopleware-card-actions"><button class="ec-peopleware-btn" type="button" data-card-edit="${attr(id)}" ${a.canEditCard ? "" : "disabled"}>Edit</button><button class="ec-peopleware-btn ec-peopleware-btn-primary" type="button" data-card-topup="${attr(id)}" ${a.canTopUp ? "" : "disabled"}>Top Up</button><button class="ec-peopleware-btn" type="button" data-card-expand="${attr(id)}">Expand</button></div></article>`;
  }

  function renderCardDetails(c = {}) { return `<div class="ec-peopleware-modal-details">${Object.entries(c).map(([k, v]) => detail(k, v)).join("")}</div>`; }
  function renderCardEditForm(c = {}) {
    const id = c.id || c.card_id || "";
    const uid = c.uid || c.rfid_uid || c.card_uid || "";
    const limit = c.limit ?? c.credit_limit ?? c.debt_limit ?? 100;
    return `<form class="ec-peopleware-form" data-peopleware-card-form data-id="${attr(id)}"><div class="ec-peopleware-form-grid">${input("ID", "id", id, "", false, "text", "", true)}${input("UID", "uid", uid, "", false, "text", "", true)}${input("Balance", "balance", c.balance ?? 0, "0", false, "number", "0.01")}${input("Debt Limit", "limit", limit, "100", false, "number", "0.01")}${select("Status", "status", c.status || "active", ["active", "banned"])}${input("Reason", "reason", c.reason || "", "Reason when banned/disabled")}${input("Until", "until", c.until || "", "", false, "datetime-local")}</div></form>`;
  }
  function renderTopUpForm(c = {}) {
    return `<div><div class="ec-peopleware-pay-tabs"><button type="button" class="ec-peopleware-pay-option" disabled><strong>Online</strong><span>Disabled until payment gateway bridge is connected.</span></button><button type="button" class="ec-peopleware-pay-option is-active"><strong>Coin Slot</strong><span>Manual registry or coin-slot top-up recording.</span></button></div><form class="ec-peopleware-form" data-peopleware-topup-form data-id="${attr(c.id || c.card_id || "")}"><div class="ec-peopleware-form-grid">${input("Card ID", "card_id", c.id || c.card_id || "", "", false, "text", "", true)}${input("UID", "uid", c.uid || c.rfid_uid || c.card_uid || "", "", false, "text", "", true)}${input("Amount", "amount", "", "0.00", true, "number", "0.01")}${input("Reference / Note", "gateway_reference", "coin-slot-manual", "coin-slot-manual")}</div><input type="hidden" name="method" value="coin_slot"><input type="hidden" name="type" value="topup"></form></div>`;
  }

  function input(label, name, value = "", ph = "", req = false, type = "text", step = "", ro = false) {
    return `<label class="ec-peopleware-form-field"><span>${esc(label)}</span><input type="${attr(type)}" name="${attr(name)}" value="${attr(value)}" placeholder="${attr(ph)}" ${req ? "required" : ""} ${step ? `step="${attr(step)}"` : ""} ${ro ? "readonly" : ""}></label>`;
  }
  function select(label, name, value = "", opts = []) {
    return `<label class="ec-peopleware-form-field"><span>${esc(label)}</span><select name="${attr(name)}">${opts.map((o) => `<option value="${attr(o)}" ${String(o) === String(value) ? "selected" : ""}>${esc(o || "Select")}</option>`).join("")}</select></label>`;
  }

  function normalizeSummary(input = {}) {
    const source = unwrapData(input), counts = source.counts || source.summary || source || {};
    return { users: pickNumber(counts.users, counts.user_count, source.users), cards: pickNumber(counts.cards, counts.card_count, source.cards), operators: pickNumber(counts.administrators, counts.admins, counts.owners, counts.superusers), developers: pickNumber(counts.developers, counts.developer_count) };
  }
  function resolveImage(item = {}, role = "USER") {
    const raw = first(item.image, item.img, item.image_url, item.avatar, item.avatar_url, item.photo, item.photo_url, item.profile_image, item.profile_img, item.picture);
    if (raw) return normalizeImagePath(raw);
    if (String(role).toUpperCase() === "DEVELOPER") return devImage(item.name);
    return DEFAULT_IMAGE;
  }
  function handleImageError(img) {
    if (!img || img.dataset.fallbackDone === "true") return;
    const role = String(img.dataset.peoplewareImgRole || "").toUpperCase(), name = img.dataset.peoplewareImgName || "";
    if (role === "DEVELOPER" && img.dataset.devFallbackDone !== "true") { img.dataset.devFallbackDone = "true"; img.src = devImage(name, true); return; }
    img.dataset.fallbackDone = "true"; img.src = DEFAULT_IMAGE;
  }
  function devImage(name, force = false) {
    const norm = normalizeName(name);
    if (!force && name) return `/static/assets/developers/${encodeURIComponent(String(name).trim())}.jpg`;
    const f = DEV_IMAGES.find((c) => normalizeName(c) === norm);
    return f ? `/static/assets/developers/${encodeURIComponent(f)}.jpg` : DEFAULT_IMAGE;
  }
  function normalizeImagePath(v) {
    const p = String(v || "").trim();
    if (!p) return DEFAULT_IMAGE;
    if (p.startsWith("http://") || p.startsWith("https://") || p.startsWith("/") || p.startsWith("data:")) return p;
    if (p.startsWith("static/")) return `/${p}`;
    return `/static/assets/${p}`;
  }
  function parseMaybeJson(v) {
    if (typeof v !== "string") return v;
    const t = v.trim();
    if (!t) return "";
    if ((t.startsWith("[") && t.endsWith("]")) || (t.startsWith("{") && t.endsWith("}"))) { try { return JSON.parse(t); } catch {} }
    return v;
  }
  function toArray(v) {
    const p = parseMaybeJson(v);
    if (Array.isArray(p)) return p;
    if (p === undefined || p === null || p === "") return [];
    return [p];
  }
  function first(...values) {
    for (const v of values) {
      const arr = toArray(v);
      if (arr.length) return arr[0];
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return "";
  }
  function unwrapData(v) {
    let c = v;
    for (let i = 0; i < 4; i += 1) { if (c && typeof c === "object" && !Array.isArray(c) && "data" in c) c = c.data; else break; }
    return c && typeof c === "object" ? c : {};
  }
  function pickNumber(...values) {
    let total = 0, found = false;
    for (const v of values) { const n = extractNumber(v); if (n !== null) { total += n; found = true; } }
    return found ? total : 0;
  }
  function extractNumber(v) {
    if (v === undefined || v === null || v === "") return null;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") { const n = Number(v); return Number.isFinite(n) ? n : null; }
    if (Array.isArray(v)) return v.length;
    if (typeof v === "object") { for (const k of ["total", "count", "value", "items"]) { if (k in v) { const n = extractNumber(v[k]); if (n !== null) return n; } } }
    return null;
  }
  function computeAge(b) {
    if (!b) return "";
    const d = new Date(b);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    let a = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a -= 1;
    return a >= 0 ? a : "";
  }
  function labelize(v) { return String(v || "").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()); }
  function shortUid(u) { const v = String(u || ""); return v.length <= 14 ? v : `${v.slice(0, 6)}...${v.slice(-4)}`; }
  function formatNumber(v, d = 0) { return Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function formatPeso(v) { return `₱${formatNumber(v, 2)}`; }
  function formatValue(v) { if (v === undefined || v === null || v === "") return "—"; if (typeof v === "object") return JSON.stringify(v); return String(v); }
  function normalizeName(v) { return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ñ/gi, "n").replace(/\s+/g, " ").trim().toLowerCase(); }
  function esc(v) { return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
  function attr(v) { return esc(v).replaceAll("`", "&#096;"); }

  window.PeoplewareStructure = {
    tabs: TABS, render, renderStatus, metric, detail, chip, chipRow, icon, renderControlBar,
    renderPersonCard, renderPersonDetails, renderPersonProfile, renderUserForm, renderOperatorForm,
    renderImagePicker, renderCardCreateForm, renderCardList, renderCardItem, renderCardDetails,
    renderCardEditForm, renderTopUpForm, normalizeSummary, resolveImage, handleImageError,
    first, toArray, labelize, formatNumber, formatPeso, computeAge,
    escapeHtml: esc, escapeAttr: attr
  };
})();
