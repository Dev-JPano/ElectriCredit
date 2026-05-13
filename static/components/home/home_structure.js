/* =========================================================
   ELECTRICREDIT V2 - HOME STRUCTURE
   File: static/components/home/home_structure.js

   Purpose:
   - Clean public landing section
   - Compact rates + status snapshot
   - Interactive system image stage
   ========================================================= */

(function () {
  "use strict";

  const DEFAULT_IMAGES = [
    "/static/assets/developers/Jhon Anthony Pano.jpg",
    "/static/assets/developers/Joshane Rhea Paquibot.jpg",
    "/static/assets/developers/Jellen Anos.jpg",
    "/static/assets/developers/Joselito Jr. Tambacan.jpg",
    "/static/assets/developers/Jaycob Lumayag.jpg"
  ];

  const DEFAULT_IMAGE_PATH = "/static/assets/default-image.png";

  const DIALOGS = [
    "Hi! Welcome to ElectriCredit.",
    "Good day! Check the rates first.",
    "ElectriCredit is ready.",
    "Cards, hubs, and registry stations work together.",
    "Hubs handle electricity sessions.",
    "Registry stations handle RFID and coin top-up.",
    "Dashboard shows live activity.",
    "Top-up updates card balance through transactions.",
    "Secure actions need permission.",
    "Ask the assistant if you need help.",
    "RFID makes access faster.",
    "Keep the Raspberry Pi server running.",
    "SQLite keeps the records organized.",
    "Power control made smarter.",
    "Hello from ElectriCredit!",
    "Users, cards, hubs, and registry stations stay connected.",
    "Credit limits help prevent unpaid overuse.",
    "Owners and developers can manage deeper tools.",
    "The Hub checks card balance before power access.",
    "Registry stations can record coin-slot top-ups."
  ];

  function renderHome(data = {}) {
    const status = normalizeStatus(data);

    return `
      <div id="home" class="ec-home-section" data-home-section>
        <div class="ec-home-shell">
          <div class="ec-home-grid">
            <article class="ec-home-panel ec-home-intro">
              <span class="ec-home-kicker">
                <i></i>
                HOME
              </span>

              <h1>ElectriCredit</h1>

              <p class="ec-home-subtitle">
                A prepaid electricity system for cards, hubs, registry stations,
                and local administration.
              </p>

              <div class="ec-home-rates" aria-label="Current rates">
                ${renderRateCard("Base Rate", status.baseRate)}
                ${renderRateCard("Tenant Rate", status.tenantRate)}
              </div>

              <div class="ec-home-actions">
                <a href="#dashboard" data-home-scroll>Dashboard</a>
                <a href="#hardware" data-home-scroll>Hardware</a>
              </div>
            </article>

            <article class="ec-home-panel ec-home-play-card">
              <div class="ec-home-play-head">
                <div>
                  <span>System Snapshot</span>
                  <strong>${escapeHtml(status.serverLabel)}</strong>
                </div>
                <b class="${status.serverOnline ? "is-online" : "is-warn"}" aria-hidden="true"></b>
              </div>

              <div class="ec-home-mini-stats">
                ${renderMiniStat("Users", status.users)}
                ${renderMiniStat("Cards", status.cards)}
                ${renderMiniStat("Hubs", status.activeHubs)}
                ${renderMiniStat("Registry", status.activeRegistry)}
              </div>

              <div class="ec-home-stage" data-home-dev-stage aria-label="Interactive ElectriCredit stage">
                <div class="ec-home-stage-grid" aria-hidden="true"></div>
                <div class="ec-home-trigger-zone" aria-hidden="true"></div>
              </div>
            </article>
          </div>
        </div>
      </div>
    `;
  }

  function renderRateCard(label, value) {
    return `
      <article class="ec-home-rate">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(formatPeso(value))}</strong>
        <small>per kWh</small>
      </article>
    `;
  }

  function renderMiniStat(label, value) {
    return `
      <article>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `;
  }

  function normalizeStatus(data = {}) {
    const counts = data.counts || {};
    const peopleware = data.peopleware || {};
    const peopleCounts = peopleware.counts || peopleware.summary || peopleware || {};
    const hardware = data.hardware || {};
    const hubs = hardware.hubs || {};
    const registry = hardware.registry_stations || {};
    const settings = data.settings || {};

    const baseRate = pickNumber(
      settings.base_rate,
      settings.baseRate,
      data.base_rate,
      data.baseRate,
      getSettingFromList(data.settings_list, "base_rate"),
      getSettingFromList(data.settings_list, "baseRate"),
      15
    );

    const tenantRate = pickNumber(
      settings.tenant_rate,
      settings.tenantRate,
      data.tenant_rate,
      data.tenantRate,
      getSettingFromList(data.settings_list, "tenant_rate"),
      getSettingFromList(data.settings_list, "tenantRate"),
      20
    );

    const serverRaw = String(data.server || "active").toLowerCase();
    const serverOnline = !["offline", "down", "false", "0"].includes(serverRaw);

    return {
      baseRate,
      tenantRate,
      serverOnline,
      serverLabel: serverOnline ? "Server Active" : "Server Offline",
      users: pickNumber(peopleCounts.users, peopleCounts.user_count, counts.users, data.users_count, data.users, 0),
      cards: pickNumber(peopleCounts.cards, peopleCounts.card_count, counts.cards, data.cards_count, data.cards, 0),
      activeHubs: pickNumber(hubs.available, hubs.online, counts.hubs, data.hubs_count, 0),
      activeRegistry: pickNumber(registry.available, registry.online, counts.registry_stations, data.registry_count, 0)
    };
  }

  function getSettingFromList(list, key) {
    if (!Array.isArray(list)) return null;

    const found = list.find((item) => String(item.key || "") === key);
    return found ? found.value : null;
  }

  function pickNumber(...values) {
    for (const value of values) {
      if (value === null || value === undefined || value === "") continue;
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }

    return 0;
  }

  function collectImages(...sources) {
    const found = [];

    sources.forEach((source) => {
      scanForImages(source, found);
    });

    DEFAULT_IMAGES.forEach((image) => found.push(image));

    return uniqueImages(found);
  }

  function scanForImages(value, output) {
    if (!value) return;

    if (Array.isArray(value)) {
      value.forEach((item) => scanForImages(item, output));
      return;
    }

    if (typeof value !== "object") return;

    const keys = [
      "image", "img", "image_url", "avatar", "avatar_url",
      "photo", "photo_url", "profile_image", "profile_img", "picture"
    ];

    keys.forEach((key) => {
      const image = normalizeImage(value[key]);
      if (image) output.push(image);
    });

    Object.keys(value).forEach((key) => {
      const item = value[key];
      if (item && typeof item === "object") scanForImages(item, output);
    });
  }

  function uniqueImages(images) {
    const seen = new Set();
    const out = [];

    images.forEach((image) => {
      const normalized = normalizeImage(image);
      const key = normalizeImageKey(normalized);

      if (!normalized || !key || seen.has(key)) return;
      seen.add(key);
      out.push(normalized);
    });

    return out;
  }

  function normalizeImage(value) {
    const raw = parseMaybeJson(value);
    if (Array.isArray(raw)) {
      for (const item of raw) {
        const found = normalizeImage(item);
        if (found) return found;
      }
      return "";
    }

    if (raw && typeof raw === "object") {
      return normalizeImage(raw.url || raw.src || raw.value || raw.image || raw.path || "");
    }

    const src = String(raw || "").trim();
    if (!src) return "";
    if (isDefaultImage(src)) return "";
    if (src.startsWith("data:")) return src;
    if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")) return src;
    if (src.startsWith("static/")) return `/${src}`;
    return `/static/assets/${src}`;
  }

  function isDefaultImage(value) {
    const text = String(value || "").trim().toLowerCase().replaceAll("\\", "/");
    return !text || text.endsWith("/static/assets/default-image.png") || text.endsWith("static/assets/default-image.png") || text.endsWith("/default-image.png");
  }

  function normalizeImageKey(value) {
    const text = String(value || "").trim();
    if (!text || isDefaultImage(text)) return "";
    if (text.startsWith("data:")) return text.slice(0, 80);
    try {
      return decodeURIComponent(text).toLowerCase();
    } catch {
      return text.toLowerCase();
    }
  }

  function parseMaybeJson(value) {
    if (typeof value !== "string") return value;
    const text = value.trim();
    if (!text) return "";
    if ((text.startsWith("[") && text.endsWith("]")) || (text.startsWith("{") && text.endsWith("}"))) {
      try {
        return JSON.parse(text);
      } catch {}
    }
    return value;
  }

  function formatPeso(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "₱0";
    return `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  window.HomeStructure = {
    renderHome,
    developerImages: DEFAULT_IMAGES,
    defaultImagePath: DEFAULT_IMAGE_PATH,
    dialogs: DIALOGS,
    collectImages,
    normalizeImage,
    isDefaultImage
  };
})();
