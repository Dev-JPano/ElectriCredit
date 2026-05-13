/* ELECTRICREDIT V2 - ABOUT STRUCTURE v2 */
(function () {
  "use strict";

  const DEFAULT_DEVELOPERS = [
    {
      name: "Jhon Anthony Pano",
      username: "@toneiu",
      emails: ["jpano487023@gmail.com"],
      numbers: ["(+63) 0993 885 9567"],
      links: [
        { label: "Portfolio", url: "https://www.jpano.dev" },
        { label: "GitHub", url: "https://github.com/Dev-JPano" }
      ],
      roles: ["Group Leader", "Full-Stack Developer", "Technical Craftsman", "Final Documentation Editor"],
      image: "/static/assets/developers/Jhon Anthony Pano.jpg"
    },
    {
      name: "Joshane Rhea Paquibot",
      username: "",
      emails: [],
      numbers: [],
      links: [],
      roles: ["Documentation", "Research Support"],
      image: "/static/assets/developers/Joshane Rhea Paquibot.jpg"
    },
    {
      name: "Jellen Años",
      username: "",
      emails: [],
      numbers: [],
      links: [],
      roles: ["Documentation", "Research Support"],
      image: "/static/assets/developers/Jellen Años.jpg"
    },
    {
      name: "Joselito Jr. Tambacan",
      username: "",
      emails: [],
      numbers: [],
      links: [],
      roles: ["Documentation", "Research Support"],
      image: "/static/assets/developers/Joselito Jr. Tambacan.jpg"
    },
    {
      name: "Jaycob Lumayag",
      username: "",
      emails: [],
      numbers: [],
      links: [],
      roles: ["Documentation", "Research Support"],
      image: "/static/assets/developers/Jaycob Lumayag.jpg"
    }
  ];

  const HARDWARE = [
    {
      icon: "π",
      title: "Raspberry Pi 4 Server",
      text: "Hosts the Flask API, web interface, SQLite database, system files, and device communication endpoints."
    },
    {
      icon: "H",
      title: "ESP32 Hub Module",
      text: "Measures electricity consumption, validates card access, controls relay output, and reports usage sessions."
    },
    {
      icon: "R",
      title: "ESP32 Registry Station",
      text: "Supports RFID card registration, card scanning, and coin-slot credit top-up transactions."
    }
  ];

  const FEATURES = [
    "Prepaid credit and credit-limit electricity control",
    "Raspberry Pi hosted Flask API and SQLite database",
    "ESP32 Hub and Registry Station support",
    "RFID/card-based tenant transactions",
    "Role-based access control for administrators, owners, and developers",
    "Logs, transactions, themes, settings, and database maintenance",
    "Prepared path for optional payment bridge integration"
  ];

  function render(data = {}) {
    const developers = normalizeDevelopers(data.developers);
    const system = data.system || {};

    return `
      <div id="about" class="ec-about" data-about-section>
        <div class="ec-about-shell">
          ${hero(system)}
          ${projectOverview()}
          ${problemSolution()}
          ${hardwareSection()}
          ${operationSection()}
          ${capstoneSection()}
          ${developerSection(developers)}
          ${acknowledgementSection()}
        </div>
      </div>
    `;
  }

  function hero(system = {}) {
    return `
      <header class="ec-about-hero">
        <div class="ec-about-hero-copy">
          <span class="ec-about-kicker">About ElectriCredit</span>
          <h2>Prepaid electricity management for rental spaces.</h2>
          <p>
            ElectriCredit helps landlords, apartment owners, boarding house managers, and tenants
            monitor electricity usage, manage prepaid credits, and automate fair electricity access.
          </p>

          <div class="ec-about-hero-actions">
            <a class="ec-about-btn ec-about-btn-primary" href="#dashboard-section">Dashboard</a>
            <a class="ec-about-btn" href="#hardware-section">Hardware</a>
            <a class="ec-about-btn" href="#peopleware-section">Peopleware</a>
          </div>
        </div>

        <div class="ec-about-system-card">
          <div class="ec-about-system-visual" aria-hidden="true">
            <span class="node node-pi">π</span>
            <span class="node node-hub">Hub</span>
            <span class="node node-reg">Reg</span>
            <span class="node node-db">DB</span>
          </div>

          <div class="ec-about-system-content">
            <strong>${escapeHtml(system.name || "ElectriCredit v2")}</strong>
            <p>${escapeHtml(system.version || "Raspberry Pi + ESP32 electricity credit system")}</p>

            <div class="ec-about-system-grid">
              ${mini("Server", "Raspberry Pi 4")}
              ${mini("Backend", "Flask API")}
              ${mini("Database", "SQLite")}
              ${mini("Hardware", "ESP32 modules")}
            </div>
          </div>
        </div>
      </header>
    `;
  }

  function projectOverview() {
    return `
      <section class="ec-about-section ec-about-overview">
        <div class="ec-about-section-head">
          <span>01</span>
          <div>
            <h3>What is ElectriCredit?</h3>
            <p>
              ElectriCredit is a prepaid electricity credit monitoring system for boarding houses,
              dormitories, apartments, rental rooms, and other rentable spaces with electricity billing.
            </p>
          </div>
        </div>

        <div class="ec-about-feature-grid">
          ${FEATURES.map((item) => `
            <article class="ec-about-feature">
              <span>✓</span>
              <strong>${escapeHtml(item)}</strong>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function problemSolution() {
    return `
      <section class="ec-about-section">
        <div class="ec-about-section-head">
          <span>02</span>
          <div>
            <h3>Problem and Solution</h3>
            <p>
              Many rental establishments still rely on manual submeter checking, cash collection,
              and delayed balance updates. ElectriCredit provides a digital way to monitor usage,
              deduct credits, record transactions, and disconnect power when balance rules require it.
            </p>
          </div>
        </div>

        <div class="ec-about-compare">
          <article>
            <span class="ec-about-tag is-danger">Problem</span>
            <h4>Manual billing and unclear usage</h4>
            <p>
              Manual readings can be time-consuming, error-prone, and unfair when tenants share costs
              without clear individual consumption records.
            </p>
          </article>

          <article>
            <span class="ec-about-tag is-success">Solution</span>
            <h4>Credit-based monitoring</h4>
            <p>
              The system uses cards, sensors, logs, and a local database to track balance, usage,
              top-ups, deductions, and access control.
            </p>
          </article>
        </div>
      </section>
    `;
  }

  function hardwareSection() {
    return `
      <section class="ec-about-section">
        <div class="ec-about-section-head">
          <span>03</span>
          <div>
            <h3>Hardware Architecture</h3>
            <p>
              The Raspberry Pi works as the main server while ESP32 devices handle electricity
              access, monitoring, card scanning, and top-up activity.
            </p>
          </div>
        </div>

        <div class="ec-about-hardware-grid">
          ${HARDWARE.map((item) => `
            <article class="ec-about-hardware-card">
              <div class="ec-about-hardware-icon">${escapeHtml(item.icon)}</div>
              <h4>${escapeHtml(item.title)}</h4>
              <p>${escapeHtml(item.text)}</p>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function operationSection() {
    return `
      <section class="ec-about-section">
        <div class="ec-about-section-head">
          <span>04</span>
          <div>
            <h3>Offline Operation and Payment Bridge</h3>
            <p>
              ElectriCredit can operate through a Raspberry Pi hotspot without internet. The optional
              payment bridge can be added later for online or controlled-network payment processing.
            </p>
          </div>
        </div>

        <div class="ec-about-flow">
          ${flow("1", "Card Scan", "Tenant scans an RFID/card on a Hub or Registry Station.")}
          ${flow("2", "Balance Check", "The Raspberry Pi checks ownership, balance, card status, and credit limit.")}
          ${flow("3", "Access Control", "The Hub allows or disconnects electricity based on the result.")}
          ${flow("4", "SQLite Update", "Usage, top-up, deductions, logs, and sessions are stored in the database.")}
        </div>

        <div class="ec-about-note">
          Payment bridge support is prepared as a future extension. The main ElectriCredit database
          remains on the Raspberry Pi while the bridge handles payment gateway communication.
        </div>
      </section>
    `;
  }

  function capstoneSection() {
    return `
      <section class="ec-about-section">
        <div class="ec-about-section-head">
          <span>05</span>
          <div>
            <h3>Capstone Context</h3>
            <p>
              The project combines web development, embedded systems, database management, networking,
              security roles, and electricity monitoring into one applied capstone system.
            </p>
          </div>
        </div>

        <div class="ec-about-context-grid">
          ${context("Software", "Dashboard, Hardware, Peopleware, Software tools, configuration, logs, themes, and maintenance.")}
          ${context("Hardware", "Raspberry Pi 4, ESP32 Hub Modules, ESP32 Registry Stations, RFID, relay, and monitoring components.")}
          ${context("Security", "Role-based access for visitor, administrator, owner, and developer permissions.")}
        </div>
      </section>
    `;
  }

  function developerSection(developers) {
    return `
      <section class="ec-about-section">
        <div class="ec-about-section-head">
          <span>06</span>
          <div>
            <h3>Developer Profiles</h3>
            <p>
              Team members and project contributors are displayed with their role, first email/contact,
              and available links from the database.
            </p>
          </div>
        </div>

        <div class="ec-about-dev-grid">
          ${developers.map(developerCard).join("")}
        </div>
      </section>
    `;
  }

  function developerCard(dev = {}) {
    const emails = toArray(dev.emails || dev.email);
    const numbers = toArray(dev.numbers || dev.phone || dev.contact || dev.number);
    const links = normalizeLinks(dev.links);
    const image = resolveImage(dev);
    const email = emails[0] || "";
    const number = numbers[0] || "";
    const firstLinks = links.slice(0, 2);

    return `
      <article class="ec-about-dev-card">
        <button class="ec-about-dev-image-btn" type="button" data-about-image="${escapeAttr(image)}" aria-label="Preview ${escapeAttr(dev.name || "developer image")}">
          <img src="${escapeAttr(image)}" alt="${escapeAttr(dev.name || "Developer")}" onerror="window.AboutStructure.handleImageError(this)">
        </button>

        <div class="ec-about-dev-body">
          <div class="ec-about-dev-top">
            <div>
              <h4>${escapeHtml(dev.name || "Developer")}</h4>
              ${dev.username ? `<span class="ec-about-dev-user">@${escapeHtml(dev.username)}</span>` : ""}
            </div>
            <span class="ec-about-dev-chip">Developer</span>
          </div>

          <div class="ec-about-dev-contact">
            ${contactRow("Email", email, email ? `mailto:${email}` : "")}
            ${contactRow("Contact", number, number ? `tel:${String(number).replace(/[^+\d]/g, "")}` : "")}
          </div>

          <div class="ec-about-dev-links">
            ${firstLinks.length ? firstLinks.map(linkRow).join("") : `<span class="ec-about-muted">No links recorded</span>`}
          </div>
        </div>
      </article>
    `;
  }

  function acknowledgementSection() {
    return `
      <section class="ec-about-section ec-about-ack">
        <div class="ec-about-section-head">
          <span>07</span>
          <div>
            <h3>School Acknowledgement</h3>
            <p>
              ElectriCredit is an academic capstone project made to demonstrate applied learning in
              software development, database design, embedded systems, networking, and IT-based
              problem solving.
            </p>
          </div>
        </div>

        <div class="ec-about-ack-card">
          <strong>
            The proponents acknowledge the support of their school, advisers, instructors, panel
            members, classmates, and everyone who helped guide the development of this project.
          </strong>
        </div>
      </section>
    `;
  }

  function contactRow(label, value, href) {
    if (!value) {
      return `
        <div class="ec-about-dev-contact-row">
          <span>${escapeHtml(label)}</span>
          <strong>Not recorded</strong>
        </div>
      `;
    }

    return `
      <div class="ec-about-dev-contact-row">
        <span>${escapeHtml(label)}</span>
        <a href="${escapeAttr(href)}">${escapeHtml(value)}</a>
      </div>
    `;
  }

  function linkRow(link) {
    const label = link.label || "Link";
    const url = link.url || link.href || link.value || "";
    if (!url) return "";

    return `
      <a class="ec-about-link-pill" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(shortUrl(url))}</strong>
      </a>
    `;
  }

  function mini(label, value) {
    return `
      <article>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </article>
    `;
  }

  function flow(number, title, text) {
    return `
      <article class="ec-about-flow-step">
        <span>${escapeHtml(number)}</span>
        <div>
          <strong>${escapeHtml(title)}</strong>
          <p>${escapeHtml(text)}</p>
        </div>
      </article>
    `;
  }

  function context(title, text) {
    return `
      <article class="ec-about-context-card">
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(text)}</p>
      </article>
    `;
  }

  function normalizeDevelopers(raw) {
    if (Array.isArray(raw) && raw.length) {
      return raw.map((item) => ({
        id: item.id || item.developer_id || item.superuser_id || "",
        name: item.name || item.full_name || item.display_name || "Developer",
        username: item.username || item.handle || "",
        email: item.email || "",
        emails: item.emails || item.email || [],
        number: item.number || item.phone || item.contact || "",
        numbers: item.numbers || item.phone || item.contact || item.number || [],
        links: item.links || [],
        role: item.role || item.roles || item.actual_role || item.project_roles || [],
        roles: item.roles || item.role || item.actual_role || item.project_roles || [],
        image: item.image || item.img || item.image_url || item.avatar || ""
      }));
    }

    return DEFAULT_DEVELOPERS;
  }

  function resolveImage(dev = {}) {
    const raw = dev.image || dev.img || dev.image_url || dev.avatar || "";
    if (raw) return normalizeImage(raw);
    if (dev.name) return `/static/assets/developers/${encodeURIComponent(dev.name)}.jpg`;
    return "/static/assets/default-image.png";
  }

  function handleImageError(img) {
    if (!img || img.dataset.fallbackDone === "true") return;
    img.dataset.fallbackDone = "true";

    const original = decodeURIComponent(String(img.src || ""));
    if (original.includes("Años")) {
      img.src = "/static/assets/developers/Jellen Anos.jpg";
      return;
    }

    img.src = "/static/assets/default-image.png";
  }

  function normalizeImage(value) {
    const src = String(value || "").trim();
    if (!src) return "/static/assets/default-image.png";
    if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/") || src.startsWith("data:")) return src;
    if (src.startsWith("static/")) return `/${src}`;
    return `/static/assets/${src}`;
  }

  function normalizeLinks(value) {
    const parsed = parseMaybeJson(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (typeof item === "string") return { label: "Link", url: item };
          if (item && typeof item === "object") return { label: item.label || item.title || "Link", url: item.url || item.href || item.value || "" };
          return null;
        })
        .filter((item) => item && item.url);
    }

    if (parsed && typeof parsed === "object") {
      return Object.entries(parsed)
        .map(([label, url]) => ({ label, url }))
        .filter((item) => item.url);
    }

    if (typeof parsed === "string" && parsed.trim()) return [{ label: "Link", url: parsed.trim() }];

    return [];
  }

  function toArray(value) {
    const parsed = parseMaybeJson(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
    if (parsed === undefined || parsed === null || parsed === "") return [];
    if (typeof parsed === "string") {
      const text = parsed.trim();
      if (!text) return [];
      return text.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
    }
    return [parsed].filter(Boolean);
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

  function shortUrl(value) {
    const text = String(value || "");
    try {
      const url = new URL(text);
      const path = url.pathname && url.pathname !== "/" ? url.pathname.replace(/\/$/, "") : "";
      return `${url.hostname}${path}`.replace(/^www\./, "");
    } catch {
      return text.length > 34 ? `${text.slice(0, 31)}...` : text;
    }
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

  window.AboutStructure = {
    render,
    normalizeDevelopers,
    handleImageError
  };
})();
