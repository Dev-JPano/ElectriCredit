/* =========================================================
   ELECTRICREDIT V2 - HOME CONTROLLER
   File: static/components/home/home.js

   Purpose:
   - Mount clean Home section
   - Load live snapshot + rates
   - Run continuous interactive system image stage
   ========================================================= */

(function () {
  "use strict";

  const HomeController = {
    root: null,
    section: null,
    stage: null,
    app: null,
    sprites: new Set(),
    animationFrame: 0,
    lastFrameAt: 0,
    spawnClock: 0,
    nextSpawnIn: 0,
    lanes: [],
    imagePool: [],
    reducedMotion: false,

    async init(context = {}) {
      this.app = context.app || window.ElectriCredit || null;
      this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!window.HomeStructure || !window.HomeDesign) {
        console.warn("HomeStructure or HomeDesign is missing.");
        return;
      }

      window.HomeDesign.inject();

      const data = await this.loadSnapshot();
      this.imagePool = this.buildImagePool(data);
      this.mount(data);
      this.cacheElements();
      this.bindEvents();
      this.startPlayground();
    },

    async loadSnapshot() {
      const fallback = {
        server: "active",
        internet: "unknown",
        database_layer: true,
        counts: {
          users: 0,
          cards: 0,
          hubs: 0,
          registry_stations: 0,
          sessions: 0,
          active_sessions: 0
        },
        peopleware: { users: 0, cards: 0, operators: 0, developers: 0 },
        hardware: {
          hubs: { available: 0, online: 0 },
          registry_stations: { available: 0, online: 0 }
        },
        payment: { configured: false, online: false },
        settings: { base_rate: 15, tenant_rate: 20 },
        settings_list: [],
        users: [],
        administrators: [],
        developers: [],
        hubs_list: [],
        registry_list: []
      };

      try {
        const [
          statusPayload,
          hardwarePayload,
          paymentPayload,
          settingsPayload,
          peoplewarePayload,
          usersPayload,
          administratorsPayload,
          developersPayload,
          hubsPayload,
          registryPayload
        ] = await Promise.allSettled([
          this.getJson(this.route("status", "/api/status")),
          this.getJson(this.route("hardwareSummary", "/api/hardware/summary")),
          this.getJson(this.route("paymentStatus", "/api/payment/status")),
          this.getJson(this.route("settings", "/api/settings")),
          this.getJson(this.route("peoplewareSummary", "/api/peopleware/summary")),
          this.getJson(this.route("users", "/api/users")),
          this.getJson(this.route("peoplewareAdministrators", "/api/peopleware/administrators")),
          this.getJson(this.route("peoplewareDevelopers", "/api/peopleware/developers")),
          this.getJson(this.route("hubs", "/api/hubs")),
          this.getJson(this.route("registry", "/api/registry"))
        ]);

        const status = this.unwrap(statusPayload) || {};
        const hardware = this.unwrap(hardwarePayload) || {};
        const payment = this.unwrap(paymentPayload) || {};
        const settingsResult = this.unwrap(settingsPayload);
        const peopleware = this.unwrap(peoplewarePayload) || {};
        const users = this.unwrapList(usersPayload, ["items", "users", "rows"]);
        const administrators = this.unwrapList(administratorsPayload, ["items", "administrators", "operators", "rows"]);
        const developers = this.unwrapList(developersPayload, ["items", "developers", "rows"]);
        const hubsList = this.unwrapList(hubsPayload, ["items", "hubs", "rows"]);
        const registryList = this.unwrapList(registryPayload, ["items", "registry", "registry_stations", "rows"]);

        const settingsList = Array.isArray(settingsResult) ? settingsResult : [];
        const settingsObject = this.settingsListToObject(settingsList);

        return {
          ...fallback,
          ...status,
          settings: {
            ...fallback.settings,
            ...settingsObject,
            ...(status.settings || {})
          },
          settings_list: settingsList,
          peopleware: Object.keys(peopleware).length ? peopleware : fallback.peopleware,
          hardware: Object.keys(hardware).length ? hardware : fallback.hardware,
          payment: Object.keys(payment).length ? payment : fallback.payment,
          users,
          administrators,
          developers,
          hubs_list: hubsList,
          registry_list: registryList
        };
      } catch (error) {
        console.warn("Home snapshot failed:", error);
        return fallback;
      }
    },

    unwrap(settled) {
      if (!settled || settled.status !== "fulfilled") return null;
      const payload = settled.value || {};
      return payload.data || payload;
    },

    unwrapList(settled, keys = []) {
      const data = this.unwrap(settled);
      if (Array.isArray(data)) return data;

      if (data && typeof data === "object") {
        for (const key of keys) {
          if (Array.isArray(data[key])) return data[key];
        }

        if (data.data) {
          if (Array.isArray(data.data)) return data.data;
          for (const key of keys) {
            if (Array.isArray(data.data[key])) return data.data[key];
          }
        }
      }

      return [];
    },

    settingsListToObject(settings) {
      const output = {};
      if (!Array.isArray(settings)) return output;

      settings.forEach((item) => {
        const key = String(item.key || "").trim();
        if (key) output[key] = item.value;
      });

      return output;
    },

    buildImagePool(data = {}) {
      if (window.HomeStructure && typeof window.HomeStructure.collectImages === "function") {
        return window.HomeStructure.collectImages(
          data.users,
          data.administrators,
          data.developers,
          data.peopleware,
          data.hubs_list,
          data.registry_list,
          data.hardware
        );
      }

      return window.HomeStructure?.developerImages || [];
    },

    mount(data = {}) {
      let host = document.querySelector("#home-section") || document.querySelector("[data-section='home']");

      if (!host) {
        host = document.createElement("section");
        host.id = "home-section";
        host.className = "ec-section";
        host.dataset.section = "home";

        const main = document.querySelector("main") || document.body;
        const firstSection = main.querySelector("section");
        if (firstSection) main.insertBefore(host, firstSection);
        else main.appendChild(host);
      }

      host.classList.add("ec-home-host");
      host.innerHTML = window.HomeStructure.renderHome(data);
      this.root = host;
      this.section = host.querySelector("[data-home-section]");
    },

    cacheElements() {
      this.stage = this.root?.querySelector("[data-home-dev-stage]") || null;
      this.buildLanes();
    },

    bindEvents() {
      this.root?.addEventListener("click", (event) => {
        const scrollLink = event.target.closest("[data-home-scroll]");
        if (scrollLink) {
          const target = document.querySelector(scrollLink.getAttribute("href"));
          if (target) {
            event.preventDefault();
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          return;
        }

        const sprite = event.target.closest("[data-home-dev]");
        if (sprite) this.playSpriteReaction(sprite);
      });

      window.addEventListener("resize", () => {
        this.buildLanes();
      });
    },

    startPlayground() {
      if (!this.stage || this.reducedMotion) return;

      this.stopPlayground();
      this.sprites.clear();
      this.stage.querySelectorAll("[data-home-dev], .ec-home-spark").forEach((item) => item.remove());

      this.spawnClock = 0;
      this.nextSpawnIn = 250;
      this.lastFrameAt = performance.now();
      this.animationFrame = requestAnimationFrame((time) => this.tick(time));
    },

    stopPlayground() {
      if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
    },

    tick(time) {
      if (!this.stage) return;

      const rawDelta = Math.min(80, time - this.lastFrameAt);
      this.lastFrameAt = time;

      const delta = document.hidden ? 0 : rawDelta;

      if (delta > 0) {
        this.spawnClock += delta;
        if (this.spawnClock >= this.nextSpawnIn && this.canSpawnMoreSprites()) {
          this.spawnDeveloper();
          this.spawnClock = 0;
          this.nextSpawnIn = this.randomInt(1800, 3900);
        }

        this.updateSprites(delta);
      }

      this.animationFrame = requestAnimationFrame((nextTime) => this.tick(nextTime));
    },

    buildLanes() {
      if (!this.stage) return;

      const height = this.stage.clientHeight || 280;
      const width = this.stage.clientWidth || 420;
      const laneCount = width < 430 ? 3 : width < 760 ? 4 : 5;
      const topPadding = 42;
      const bottomPadding = 54;
      const usable = Math.max(120, height - topPadding - bottomPadding);

      this.lanes = Array.from({ length: laneCount }, (_, index) => {
        if (laneCount === 1) return Math.round(height / 2);
        return Math.round(topPadding + (usable * index) / (laneCount - 1));
      });
    },

    getMaxSprites() {
      const width = this.stage?.clientWidth || window.innerWidth;
      if (width < 420) return 4;
      return 5;
    },

    canSpawnMoreSprites() {
      const max = this.getMaxSprites();

      if (this.sprites.size >= max) return false;

      // User rule:
      // If the stage is not dropping to 4, do not create another.
      // This means desktop only respawns when it has 4 or fewer visible sprites.
      if (max === 5 && this.sprites.size > 4) return false;

      return true;
    },

    spawnDeveloper() {
      if (!this.stage || !window.HomeStructure) return;

      const images = this.imagePool.length ? this.imagePool : (window.HomeStructure.developerImages || []);
      const dialogs = window.HomeStructure.dialogs || [];
      if (!images.length || !dialogs.length) return;

      const stageWidth = this.stage.clientWidth || 420;
      const stageHeight = this.stage.clientHeight || 280;
      const image = this.pickStageImage(images);
      const size = this.pickSize(stageWidth);
      const path = this.pickSpawnPath(stageWidth, stageHeight, size);
      const startRot = this.randomChoice([
        this.randomInt(-32, 32),
        this.randomInt(135, 225),
        this.randomInt(-110, -62),
        this.randomInt(62, 110)
      ]);
      const spin = Math.random() < 0.18;
      const radius = Math.random() < 0.84 ? "999px" : this.randomChoice(["1.1rem", "1.35rem", "38% 62% 45% 55%"]);

      const sprite = document.createElement("button");
      sprite.type = "button";
      sprite.className = "ec-home-dev";
      sprite.dataset.homeDev = "true";
      sprite.dataset.homeImageKey = this.imageKey(image);
      sprite.style.setProperty("--dev-size", `${size}px`);
      sprite.style.setProperty("--dev-radius", radius);
      sprite.innerHTML = `
        <img src="${this.escapeAttr(image)}" alt="ElectriCredit system image" loading="lazy" onerror="this.closest('[data-home-dev]')?.remove()" />
      `;

      const state = {
        el: sprite,
        image,
        imageKey: this.imageKey(image),
        x: path.x,
        y: path.y,
        dx: path.dx,
        dy: path.dy,
        size,
        speed: path.speed,
        rotation: startRot,
        spinSpeed: spin ? this.randomInt(8, 24) * (Math.random() < 0.5 ? -1 : 1) : this.randomInt(-5, 5),
        bobOffset: Math.random() * Math.PI * 2,
        bobPower: this.randomInt(2, 6),
        dialog: this.randomChoice(dialogs),
        speaking: false,
        bubble: null,
        lastSparkAt: 0
      };

      this.stage.appendChild(sprite);
      this.sprites.add(state);
      this.applySprite(state, 0);
    },

    pickStageImage(images) {
      const visible = new Set(Array.from(this.sprites).map((state) => state.imageKey).filter(Boolean));
      const available = images.filter((image) => !visible.has(this.imageKey(image)));

      // Only 1% chance to allow a duplicate visible image.
      if (available.length && Math.random() >= 0.01) {
        return this.randomChoice(available);
      }

      return this.randomChoice(images);
    },

    pickSpawnPath(stageWidth, stageHeight, size) {
      const margin = this.randomInt(22, 96);
      const edge = this.randomChoice(["left", "right", "top", "bottom", "top-left", "top-right", "bottom-left", "bottom-right"]);
      const centerX = stageWidth / 2;
      const centerY = stageHeight / 2;
      let x = 0;
      let y = 0;
      let targetX = centerX + this.randomInt(-stageWidth * 0.18, stageWidth * 0.18);
      let targetY = centerY + this.randomInt(-stageHeight * 0.22, stageHeight * 0.22);

      if (edge === "left") {
        x = -size - margin;
        y = this.randomStageY(stageHeight, size);
      } else if (edge === "right") {
        x = stageWidth + margin;
        y = this.randomStageY(stageHeight, size);
      } else if (edge === "top") {
        x = this.randomStageX(stageWidth, size);
        y = -size - margin;
      } else if (edge === "bottom") {
        x = this.randomStageX(stageWidth, size);
        y = stageHeight + margin;
      } else if (edge === "top-left") {
        x = -size - margin;
        y = -size - margin;
      } else if (edge === "top-right") {
        x = stageWidth + margin;
        y = -size - margin;
      } else if (edge === "bottom-left") {
        x = -size - margin;
        y = stageHeight + margin;
      } else {
        x = stageWidth + margin;
        y = stageHeight + margin;
      }

      const vx = targetX - x;
      const vy = targetY - y;
      const distance = Math.max(1, Math.hypot(vx, vy));
      const speed = this.pickSpeed(stageWidth);

      return {
        x,
        y,
        dx: vx / distance,
        dy: vy / distance,
        speed
      };
    },

    randomStageX(stageWidth, size) {
      return this.randomInt(12, Math.max(18, stageWidth - size - 12));
    },

    randomStageY(stageHeight, size) {
      if (this.lanes.length && Math.random() < 0.62) {
        const lane = this.randomChoice(this.lanes);
        return Math.max(12, Math.min(stageHeight - size - 12, lane - size / 2 + this.randomInt(-18, 18)));
      }

      return this.randomInt(12, Math.max(18, stageHeight - size - 12));
    },

    updateSprites(delta) {
      const stageWidth = this.stage.clientWidth || 420;
      const stageHeight = this.stage.clientHeight || 280;
      const dt = delta / 1000;
      const remove = [];

      this.sprites.forEach((state) => {
        state.x += state.dx * state.speed * dt;
        state.y += state.dy * state.speed * dt;
        state.rotation += state.spinSpeed * dt;

        const centerX = state.x + state.size / 2;
        const centerY = state.y + state.size / 2;
        const centerRatioX = centerX / Math.max(1, stageWidth);
        const centerRatioY = centerY / Math.max(1, stageHeight);

        const insideTrigger =
          centerRatioX >= 0.32 &&
          centerRatioX <= 0.68 &&
          centerRatioY >= 0.20 &&
          centerRatioY <= 0.82;

        const stillVisible =
          state.x > -state.size - 150 &&
          state.x < stageWidth + state.size + 150 &&
          state.y > -state.size - 150 &&
          state.y < stageHeight + state.size + 150;

        if (insideTrigger && !state.speaking) this.showBubble(state);
        if (!insideTrigger && state.speaking) this.hideBubble(state);

        if (state.speaking && performance.now() - state.lastSparkAt > 760 && Math.random() < 0.024) {
          this.spawnSpark(state);
          state.lastSparkAt = performance.now();
        }

        this.applySprite(state, performance.now());

        if (!stillVisible) {
          remove.push(state);
        }
      });

      remove.forEach((state) => this.removeSprite(state));
    },

    applySprite(state, time) {
      const bob = Math.sin(time / 600 + state.bobOffset) * state.bobPower;
      state.el.style.setProperty("--dev-x", `${state.x}px`);
      state.el.style.setProperty("--dev-y", `${state.y + bob}px`);
      state.el.style.setProperty("--dev-rot", `${state.rotation}deg`);
    },

    showBubble(state) {
      state.speaking = true;
      state.el.classList.add("is-speaking");

      const bubble = document.createElement("span");
      bubble.className = "ec-home-bubble";
      bubble.textContent = state.dialog;
      state.el.appendChild(bubble);
      state.bubble = bubble;
    },

    hideBubble(state) {
      state.speaking = false;
      state.el.classList.remove("is-speaking");
      state.bubble?.remove();
      state.bubble = null;
    },

    removeSprite(state) {
      this.hideBubble(state);
      state.el.remove();
      this.sprites.delete(state);
    },

    playSpriteReaction(sprite) {
      const state = Array.from(this.sprites).find((item) => item.el === sprite);
      if (!state) return;

      const effect = Math.random() < 0.55 ? "twirl" : "pop";
      sprite.classList.remove("is-pop", "is-twirl");
      void sprite.offsetWidth;
      sprite.classList.add(effect === "twirl" ? "is-twirl" : "is-pop");

      if (effect === "pop") {
        for (let i = 0; i < 10; i += 1) this.spawnSpark(state, true);
      } else {
        state.spinSpeed += this.randomInt(24, 48) * (Math.random() < 0.5 ? -1 : 1);
        window.setTimeout(() => {
          state.spinSpeed *= 0.3;
        }, 900);
      }
    },

    spawnSpark(state, burst = false) {
      if (!this.stage) return;

      const spark = document.createElement("i");
      spark.className = "ec-home-spark";
      spark.style.left = `${state.x + state.size / 2}px`;
      spark.style.top = `${state.y + state.size / 2}px`;
      spark.style.setProperty("--spark-x", `${this.randomInt(-50, 50)}px`);
      spark.style.setProperty("--spark-y", `${this.randomInt(-42, 42)}px`);
      if (burst) spark.style.background = Math.random() < 0.5 ? "var(--ec-primary)" : "var(--ec-secondary)";

      this.stage.appendChild(spark);
      spark.addEventListener("animationend", () => spark.remove(), { once: true });
    },

    pickSize(width) {
      if (width < 420) return this.randomInt(46, 58);
      if (width < 760) return this.randomInt(52, 72);
      return this.randomInt(58, 82);
    },

    pickSpeed(width) {
      if (width < 420) return this.randomInt(26, 42);
      if (width < 760) return this.randomInt(30, 52);
      return this.randomInt(34, 62);
    },

    async getJson(url) {
      if (this.app && typeof this.app.getJson === "function") return this.app.getJson(url);

      const response = await fetch(url, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.status === "error") {
        throw new Error(payload.message || `Request failed (${response.status}).`);
      }

      return payload;
    },

    route(name, fallback) {
      if (this.app && typeof this.app.route === "function") {
        const value = this.app.route(name);
        if (value && value !== name) return value;
      }

      if (window.ElectriCreditRoute && typeof window.ElectriCreditRoute === "function") {
        const value = window.ElectriCreditRoute(name);
        if (value && value !== name) return value;
      }

      const target = window.ElectriCreditRoutes?.[name];
      if (typeof target === "string") return target;

      return fallback;
    },

    imageKey(value) {
      const text = String(value || "").trim();
      if (!text) return "";
      if (text.startsWith("data:")) return text.slice(0, 80);
      try {
        return decodeURIComponent(text).toLowerCase();
      } catch {
        return text.toLowerCase();
      }
    },

    randomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    randomChoice(list) {
      return list[Math.floor(Math.random() * list.length)];
    },

    escapeAttr(value) {
      return String(value ?? "").replaceAll('"', "&quot;");
    }
  };

  window.HomeController = HomeController;
  window.ElectriCreditHome = HomeController;

  document.addEventListener("DOMContentLoaded", () => {
    HomeController.init({ app: window.ElectriCredit || null });
  });
})();
