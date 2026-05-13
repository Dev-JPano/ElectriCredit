/* =========================================================
   ELECTRICREDIT V2 - CHATBOT CONTROLLER
   File: static/components/header/chatbot/chatbot.js

   Purpose:
   - Backend-first chatbot frontend
   - Slash command support
   - Browser-only chat history
   - No SQLite/server conversation saving
   - Renders cards from backend for /devs, /admins, /owner
   ========================================================= */

(function () {
  "use strict";

  const STORAGE_KEYS = {
    messages: "electricredit.chatbot.messages",
    summary: "electricredit.chatbot.summary"
  };

  const RULES_URL = "/static/components/header/chatbot/chatbot_rules.json";
  const CHATBOT_ENDPOINT = "/api/chatbot/message";

  const ChatbotController = {
    root: null,
    panel: null,
    messagesRoot: null,
    suggestionsRoot: null,
    input: null,
    status: null,
    commandBelt: null,
    unreadBadge: null,
    rules: null,
    messages: [],
    isOpen: false,
    isSending: false,

    async init(context = {}) {
      this.app = context.app || window.ElectriCredit || null;

      if (!window.ChatbotStructure || !window.ChatbotDesign) {
        console.warn("ChatbotStructure or ChatbotDesign is missing.");
        return;
      }

      window.ChatbotDesign.inject();

      this.mountRoot();
      this.cacheElements();
      this.bindEvents();

      await this.loadRules();
      await this.checkProviderStatus();

      this.loadMessages();

      if (!this.messages.length) {
        this.pushBot(this.getGreeting(), {
          intent: "welcome",
          save: true
        });
      } else {
        this.renderMessages();
      }

      this.renderCommands();
      this.renderSuggestions(this.getDefaultSuggestions());
      this.updateStatus("Backend-ready guide");
    },

    mountRoot() {
      let root = document.querySelector("[data-chatbot-root]");

      if (!root) {
        root = document.createElement("div");
        root.className = "ec-chatbot-root";
        root.dataset.chatbotRoot = "true";
        document.body.appendChild(root);
      }

      root.innerHTML = `
        ${window.ChatbotStructure.renderLauncher()}
        ${window.ChatbotStructure.renderPanel()}
      `;

      this.root = root;
    },

    cacheElements() {
      this.panel = this.root.querySelector("[data-chatbot-panel]");
      this.messagesRoot = this.root.querySelector("[data-chatbot-messages]");
      this.suggestionsRoot = this.root.querySelector("[data-chatbot-suggestions]");
      this.input = this.root.querySelector("[data-chatbot-input]");
      this.status = this.root.querySelector("[data-chatbot-status]");
      this.commandBelt = this.root.querySelector("[data-chatbot-command-belt]");
      this.unreadBadge = this.root.querySelector("[data-chatbot-unread]");
    },

    bindEvents() {
      document.addEventListener(
        "click",
        (event) => {
          const button = event.target.closest("[data-chatbot-open]");
          if (!button) return;

          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          this.open();
        },
        true
      );

      this.root.addEventListener("click", (event) => {
        if (event.target.closest("[data-chatbot-launcher]")) {
          this.open();
          return;
        }

        if (event.target.closest("[data-chatbot-close]")) {
          this.close();
          return;
        }

        if (event.target.closest("[data-chatbot-reset]")) {
          this.executeLocalReset();
          return;
        }

        const suggestion = event.target.closest("[data-chatbot-suggestion]");
        if (suggestion) {
          this.sendUserMessage(suggestion.textContent.trim());
          return;
        }

        const command = event.target.closest("[data-chatbot-command]");
        if (command) {
          this.sendUserMessage(command.dataset.chatbotCommand);
        }
      });

      const form = this.root.querySelector("[data-chatbot-form]");
      form?.addEventListener("submit", (event) => {
        event.preventDefault();

        const value = this.input.value.trim();
        if (!value || this.isSending) return;

        this.input.value = "";
        this.sendUserMessage(value);
      });

      window.addEventListener("electricredit:chatbot-open", (event) => {
        if (event.cancelable) event.preventDefault();
        this.open();
      });

      window.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && this.isOpen) {
          this.close();
        }
      });
    },

    async loadRules() {
      try {
        const response = await fetch(RULES_URL, {
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error(`Rules file failed: ${response.status}`);
        }

        this.rules = await response.json();
      } catch (error) {
        console.warn("Chatbot rules failed to load:", error);
        this.rules = this.getFallbackRules();
      }
    },


    async checkProviderStatus() {
      try {
        const response = await fetch(this.route("apiProvidersStatus", "/api/providers/status"), {
          cache: "no-store"
        });
        const payload = await response.json().catch(() => ({}));
        const ai = payload.data?.ai || {};
        const gemini = Number(ai.gemini_keys || 0);
        const groq = Number(ai.groq_keys || 0);

        if (gemini || groq) {
          this.updateStatus(`AI ready: Gemini ${gemini}, Groq ${groq}`);
        } else {
          this.updateStatus("Backend ready, AI keys not configured");
        }
      } catch (_) {
        this.updateStatus("Backend status unavailable");
      }
    },

    executeLocalReset() {
      this.messages = [];
      try {
        localStorage.removeItem(STORAGE_KEYS.messages);
        localStorage.removeItem(STORAGE_KEYS.summary);
      } catch (_) {}

      this.pushBot("Chat history reset on this browser only.", {
        intent: "command_reset",
        save: true
      });
      this.renderSuggestions(this.getDefaultSuggestions());
    },

    loadMessages() {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.messages);
        const parsed = stored ? JSON.parse(stored) : [];
        this.messages = Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        this.messages = [];
      }
    },

    saveMessages() {
      try {
        localStorage.setItem(
          STORAGE_KEYS.messages,
          JSON.stringify(this.messages.slice(-80))
        );
      } catch (_) {}
    },

    open() {
      this.panel.hidden = false;
      this.isOpen = true;

      this.root.querySelector("[data-chatbot-launcher]")?.classList.add("is-hidden");
      this.setUnread(false);

      window.setTimeout(() => {
        this.input?.focus();
        this.scrollToBottom();
      }, 60);
    },

    close() {
      this.panel.hidden = true;
      this.isOpen = false;

      this.root.querySelector("[data-chatbot-launcher]")?.classList.remove("is-hidden");
    },

    async sendUserMessage(text) {
      const cleanText = String(text || "").trim();
      if (!cleanText || this.isSending) return;

      this.pushUser(cleanText);

      const localOnly = this.handleFrontendOnlyCommand(cleanText);
      if (localOnly) {
        await this.fakeTyping();
        this.applyBotPayload(localOnly);
        return;
      }

      this.isSending = true;
      this.setInputState(false);
      this.updateStatus("Sending to backend...");

      try {
        await this.fakeTyping();

        let payload = await this.requestBackend(cleanText);

        if (payload?.mode === "offline" || payload?.intent === "offline") {
          payload = this.createOfflineReply(cleanText, payload);
        }

        this.applyBotPayload(payload);
        this.updateStatus(payload.mode === "ai" ? "AI response ready" : "Local response ready");
      } catch (error) {
        console.warn("Chatbot backend failed:", error);

        const fallback = this.createOfflineReply(cleanText, { response: error.message || "", intent: "backend_error" });
        this.applyBotPayload(fallback);
        this.updateStatus("AI unavailable / local fallback");
      } finally {
        this.isSending = false;
        this.setInputState(true);
      }
    },

    async requestBackend(message) {
      const response = await fetch(this.route("chatbotMessage", CHATBOT_ENDPOINT), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message,
          history: this.getHistoryForBackend()
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.status === "error") {
        throw new Error(payload.response || payload.message || "Chatbot backend failed.");
      }

      return payload;
    },

    applyBotPayload(payload = {}) {
      const clientAction = payload.data?.client_action || "";

      if (clientAction === "clear_messages") {
        this.messages = [];
        localStorage.removeItem(STORAGE_KEYS.messages);
        this.renderMessages();
      }

      if (clientAction === "reset_history") {
        this.messages = [];
        localStorage.removeItem(STORAGE_KEYS.messages);
        localStorage.removeItem(STORAGE_KEYS.summary);
        this.renderMessages();
      }

      if (clientAction === "show_history") {
        this.showLocalHistory();
        return;
      }

      if (clientAction === "apply_theme" && payload.data?.theme) {
        this.applyThemeFromChat(payload.data.theme);
      }

      this.pushBot(payload.response || "No response.", {
        intent: payload.intent || payload.mode || "",
        cards: payload.cards || [],
        save: true
      });

      this.renderSuggestions(payload.reply || this.getDefaultSuggestions());
    },

    handleFrontendOnlyCommand(text) {
      const command = text.trim().toLowerCase();

      if (command === "/clear") {
        return {
          status: "ok",
          mode: "local",
          intent: "command_clear",
          response: "Chat display cleared on this browser only.",
          reply: ["/help", "/devs", "/status", "/rate"],
          data: {
            client_action: "clear_messages"
          }
        };
      }

      if (command === "/reset") {
        return {
          status: "ok",
          mode: "local",
          intent: "command_reset",
          response: "Chat history reset on this browser only.",
          reply: ["/help", "/devs", "/status", "/rate"],
          data: {
            client_action: "reset_history"
          }
        };
      }

      if (command === "/history") {
        return {
          status: "ok",
          mode: "local",
          intent: "command_history",
          response: "Here is the chat history stored on this browser.",
          reply: ["/clear", "/reset", "/help"],
          data: {
            client_action: "show_history"
          }
        };
      }

      if (command === "/help" || command === "/commands") {
        return {
          status: "ok",
          mode: "local",
          intent: "command_help",
          response: this.getHelpText(),
          reply: ["/contact", "/devs", "/status", "/rate", "/theme"]
        };
      }

      if (command === "/contact") {
        return {
          status: "ok",
          mode: "local",
          intent: "command_contact",
          response: "For chatbot, AI credits, local server, payment bridge, hardware, database, or installation issues, contact the developer directly. You can also use /devs to show developer cards from the database.",
          reply: ["/devs", "/status", "/help", "Explain Hardware"]
        };
      }

      return null;
    },

    showLocalHistory() {
      if (!this.messages.length) {
        this.pushBot("No local chat history found on this browser.", {
          intent: "history"
        });
        return;
      }

      const lines = this.messages
        .slice(-20)
        .map((message, index) => {
          const role = message.role === "user" ? "You" : "Assistant";
          return `${index + 1}. ${role}: ${message.text || ""}`;
        })
        .join("\n");

      this.pushBot(lines, {
        intent: "history"
      });
    },

    applyThemeFromChat(theme) {
      if (window.ThemeController && typeof window.ThemeController.applyTheme === "function") {
        window.ThemeController.applyTheme(theme, {
          notify: true,
          close: false,
          animate: true
        });
        return;
      }

      if (window.ElectriCredit && typeof window.ElectriCredit.applyTheme === "function") {
        window.ElectriCredit.applyTheme(theme);
      }
    },

    pushUser(text) {
      this.messages.push({
        role: "user",
        text,
        created: new Date().toISOString()
      });

      this.saveMessages();
      this.renderMessages();
    },

    pushBot(text, options = {}) {
      this.messages.push({
        role: "bot",
        text,
        intent: options.intent || "",
        cards: options.cards || [],
        created: new Date().toISOString()
      });

      if (options.save !== false) {
        this.saveMessages();
      }

      if (!this.isOpen && options.intent !== "welcome") {
        this.setUnread(true);
      }

      this.renderMessages();
    },

    renderMessages() {
      if (!this.messagesRoot) return;

      this.messagesRoot.innerHTML = this.messages
        .map((message) => window.ChatbotStructure.renderMessage(message))
        .join("");

      this.scrollToBottom();
    },

    renderCommands() {
      if (!this.commandBelt) return;

      const commands = this.rules?.ui?.commands || [
        "/help",
        "/contact",
        "/clear",
        "/reset",
        "/history",
        "/theme",
        "/devs",
        "/admins",
        "/owner",
        "/users",
        "/superusers",
        "/rate",
        "/status"
      ];

      const doubled = [...commands, ...commands];

      this.commandBelt.innerHTML = doubled
        .map((command) => window.ChatbotStructure.renderCommand(command))
        .join("");
    },

    renderSuggestions(suggestions = []) {
      if (!this.suggestionsRoot) return;

      const safeSuggestions = Array.from(new Set(suggestions))
        .filter(Boolean)
        .slice(0, 6);

      this.suggestionsRoot.innerHTML = safeSuggestions
        .map((text) => window.ChatbotStructure.renderSuggestion(text))
        .join("");
    },

    async fakeTyping() {
      if (!this.messagesRoot) return;

      this.messagesRoot.insertAdjacentHTML("beforeend", window.ChatbotStructure.renderTyping());
      this.scrollToBottom();

      await this.sleep(320);

      this.messagesRoot.querySelector("[data-chatbot-typing]")?.remove();
    },

    createOfflineReply(text, backendPayload = null) {
      const lower = String(text || "").toLowerCase();
      const providerText = String(backendPayload?.response || backendPayload?.message || backendPayload?.error || "").toLowerCase();
      const hasProviderRest = /quota|credit|credits|billing|exhaust|insufficient|rate limit|resource_exhausted|provider|api key|unavailable/.test(providerText);

      if (/\b(hello|hi|hey|hellow|good morning|good afternoon|good evening)\b/.test(lower)) {
        return {
          status: "ok",
          mode: "local",
          intent: "greeting",
          response: this.getGreeting(),
          reply: this.pickSuggestions("greeting")
        };
      }

      if (lower.includes("who are you") || lower.includes("who ur u") || lower.includes("who r u") || lower.includes("what are you")) {
        return {
          status: "ok",
          mode: "local",
          intent: "identity",
          response: "I am the ElectriCredit Assistant. I help with this prepaid electricity management system: Dashboard, Hardware, Peopleware, Software, About, cards, top-up, logs, database, and troubleshooting.",
          reply: ["What is ElectriCredit?", "Explain Hardware", "What's in the dashboard?", "/contact"]
        };
      }

      if (this.isElectricityQuestion(lower)) {
        return {
          status: "ok",
          mode: "local",
          intent: "electricity_support",
          response: this.pickRuleMessage("electricity", "I cannot verify a live area blackout unless an outage API is connected. Check your electric utility or local advisory. For ElectriCredit device issues, contact the developer."),
          reply: ["Check system status", "/status", "/contact", "Why did power cut off?", "Explain Hub"]
        };
      }

      if (lower.includes("dashboard") || lower.includes("chart") || lower.includes("usage") || lower.includes("revenue") || lower.includes("summary") || lower.includes("heatmap")) {
        return {
          status: "ok",
          mode: "local",
          intent: "dashboard",
          response: "The Dashboard shows the ElectriCredit overview: power trend, hub performance, user/card activity, usage heatmap, revenue, active sessions, and system metrics from the SQLite database.",
          reply: ["Explain Hardware", "Show current rate", "What is Peopleware?", "/status"]
        };
      }

      if (lower.includes("hardware") || lower.includes("components") || lower.includes("parts") || lower.includes("hub") || lower.includes("registry") || lower.includes("esp32") || lower.includes("rfid") || lower.includes("coin")) {
        return {
          status: "ok",
          mode: "local",
          intent: "hardware",
          response: "ElectriCredit uses a Raspberry Pi 4 as the Flask + SQLite server, ESP32 Hub Modules for electricity sessions/relay/power monitoring, and ESP32 Registry Stations for RFID registration and coin-slot top-up.",
          reply: ["What is a Hub?", "What is a Registry Station?", "How does top-up work?", "/contact"]
        };
      }

      if (lower.includes("topup") || lower.includes("top-up") || lower.includes("payment") || lower.includes("balance") || lower.includes("transaction") || lower.includes("credit mode")) {
        return {
          status: "ok",
          mode: "local",
          intent: "transactions",
          response: "Top-up is recorded as a transaction. Coin-slot top-up comes from the Registry Station. Future online payment will use a payment bridge. If a card reaches its debt/credit limit, the Hub can cut power automatically.",
          reply: ["Show current rate", "Explain Registry", "Why did power cut off?", "/status"]
        };
      }

      if (lower.includes("software") || lower.includes("logs") || lower.includes("database") || lower.includes("backup") || lower.includes("theme") || lower.includes("announcement") || lower.includes("bonus")) {
        return {
          status: "ok",
          mode: "local",
          intent: "software",
          response: "Software contains configuration tools for rates, connection, logs, announcement, bonus, server identity, database maintenance, and backups. Some tools require Administrator, Owner, or Developer access.",
          reply: ["Who can access Software?", "/status", "/rate", "/contact"]
        };
      }

      if (lower.includes("peopleware") || lower.includes("user") || lower.includes("admin") || lower.includes("owner") || lower.includes("developer") || lower.includes("card")) {
        return {
          status: "ok",
          mode: "local",
          intent: "peopleware",
          response: "Peopleware manages tenant users, RFID cards, administrators, owners, and developers. Administrators handle users/cards, owners have higher management permissions, and developers handle technical control.",
          reply: ["Show developers", "/devs", "/users", "/superusers"]
        };
      }

      if (lower.includes("help") || lower.startsWith("/")) {
        return {
          status: "ok",
          mode: "local",
          intent: "offline_help",
          response: this.getHelpText(),
          reply: ["/contact", "/devs", "/status", "/rate", "/theme"]
        };
      }

      if (backendPayload?.response && !String(backendPayload.response).toLowerCase().includes("ai provider is unavailable") && !hasProviderRest) {
        return backendPayload;
      }

      if (hasProviderRest) {
        return {
          status: "ok",
          mode: "local_fallback",
          intent: "provider_rest",
          response: this.pickRuleMessage("providerRest", "The chatbot is currently at rest because the AI provider may be out of credits or unavailable. Please contact the developer directly or try /help."),
          reply: ["/contact", "/devs", "/help", "/status", "Try commands"]
        };
      }

      return {
        status: "ok",
        mode: "local_fallback",
        intent: "local_fallback",
        response: this.pickRuleMessage("localServerOffline", "The server is running locally. Please contact the developer directly or try /help."),
        reply: this.rules?.offline?.suggestedReplies || this.getDefaultSuggestions()
      };
    },

    isElectricityQuestion(lower) {
      return /\b(blackout|brownout|outage|no power|power cut|electricity|electrical|kwh|kilowatt|watt|voltage|current|breaker|short circuit|bill|billing|consumption)\b/.test(String(lower || ""));
    },

    pickSuggestions(context = "default") {
      const map = {
        greeting: ["What is ElectriCredit?", "Explain Hardware", "Is there a blackout?", "/help", "/contact", "/status", "/rate"],
        failure: ["/contact", "/devs", "/help", "/status", "Try commands", "Explain Hardware"]
      };
      return (map[context] || this.getDefaultSuggestions()).slice(0, 6);
    },

    pickRuleMessage(poolName, fallback) {
      const pools = this.rules?.randomPools || {};
      const list = Array.isArray(pools[poolName]) ? pools[poolName] : [];
      return this.pickNoRepeat(poolName, list.length ? list : [fallback]);
    },

    pickNoRepeat(key, list) {
      const safe = Array.isArray(list) ? list.filter(Boolean) : [];
      if (!safe.length) return "";
      if (safe.length === 1) return safe[0];
      this._lastRandomByKey = this._lastRandomByKey || {};
      let picked = safe[Math.floor(Math.random() * safe.length)];
      let guard = 0;
      while (picked === this._lastRandomByKey[key] && guard < 8) {
        picked = safe[Math.floor(Math.random() * safe.length)];
        guard += 1;
      }
      this._lastRandomByKey[key] = picked;
      return picked;
    },

    getGreeting() {
      const fallbackByTime = (() => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning. I can help with ElectriCredit. Type /help to see commands.";
        if (hour < 18) return "Good afternoon. Ask me about ElectriCredit or type /help.";
        return "Good evening. I can guide you through ElectriCredit. Type /help to see commands.";
      })();
      return this.pickRuleMessage("greetings", fallbackByTime);
    },

    getOfflineMessage(type = "localServerOffline") {
      return this.pickRuleMessage(type, "The server is running locally. Please contact the developer directly or try /help.");
    },

    getDefaultSuggestions() {
      const suggestions = this.rules?.defaultSuggestedReplies || [
        "/help",
        "/contact",
        "/devs",
        "/status",
        "/rate",
        "What is ElectriCredit?",
        "Explain Hardware"
      ];
      return suggestions.slice(0, 6);
    },

    setUnread(active) {
      if (!this.unreadBadge) return;
      this.unreadBadge.hidden = !active;
    },

    updateStatus(text) {
      if (this.status) {
        this.status.textContent = text;
      }
    },

    setInputState(enabled) {
      if (!this.input) return;

      this.input.disabled = !enabled;
      this.input.placeholder = enabled ? "Ask or type /help..." : "Waiting for response...";
    },

    scrollToBottom() {
      if (!this.messagesRoot) return;

      window.requestAnimationFrame(() => {
        this.messagesRoot.scrollTop = this.messagesRoot.scrollHeight;
      });
    },


    getHistoryForBackend() {
      return this.messages
        .slice(-10)
        .map((message) => {
          return {
            role: message.role === "bot" ? "assistant" : "user",
            content: message.text || ""
          };
        })
        .filter((message) => String(message.content || "").trim());
    },

    getHelpText() {
      const commands = this.rules?.commands || {
        "/help": "Show chatbot commands.",
        "/contact": "Show developer contact/help direction.",
        "/clear": "Clear chat display on this browser only.",
        "/reset": "Reset local chat history on this browser only.",
        "/history": "Display local chat history.",
        "/theme": "Apply random theme or use /theme <id>.",
        "/devs": "Display developers as cards.",
        "/admins": "Display administrators as cards.",
        "/owner": "Display owner as cards.",
        "/users": "Display users as text.",
        "/superusers": "Display all superusers as text.",
        "/rate": "Display current base and tenant rates.",
        "/status": "Display system status."
      };

      const lines = Object.entries(commands).map(([command, description]) => {
        return `${command} - ${description}`;
      });

      return [
        "Available commands:",
        "",
        ...lines,
        "",
        "Chat history stays on this browser only.",
        "If the chatbot or AI provider fails, use /contact or /devs."
      ].join("\n");
    },

    route(name, fallback) {
      if (window.ElectriCreditRoute && typeof window.ElectriCreditRoute === "function") {
        const value = window.ElectriCreditRoute(name);
        if (typeof value === "string") return value;
      }

      const routes = window.ElectriCreditRoutes || {};
      const target = routes[name];

      if (typeof target === "string") return target;

      return fallback;
    },

    sleep(ms) {
      return new Promise((resolve) => window.setTimeout(resolve, ms));
    },

    getFallbackRules() {
      return {
        "identity": {
                "name": "ElectriCredit Assistant",
                "scope": "ElectriCredit system first; basic electricity questions are allowed when related to outages, kWh, safety, or power usage.",
                "tone": "Clear, helpful, simple, and system-focused.",
                "outsideTopicReply": "I am focused on ElectriCredit. I can still answer basic electricity concerns like outage, kWh, safety, or power usage, but for unrelated topics please use another assistant.",
                "rules": [
                        "Answer primarily about ElectriCredit.",
                        "Allow electricity-related support questions such as outage/brownout, kWh usage, safety, wiring caution, billing concepts, and power consumption basics.",
                        "Do not claim to know live area blackout status unless a live outage API exists.",
                        "Do not invent live database values.",
                        "Do not expose passwords, API keys, SMTP keys, SMS keys, tokens, .env values, Wi-Fi passwords, or payment bridge credentials.",
                        "When uncertain or offline, guide the user to contact the developer or use commands."
                ]
        },
        "system": {
                "summary": "ElectriCredit v2 is a Raspberry Pi 4 based prepaid electricity management capstone system for rental spaces such as boarding houses, dormitories, apartments, and rentable rooms. It uses a Flask API, SQLite database, browser UI, ESP32 Hub Modules, and ESP32 Registry Stations to manage users, RFID cards, electricity credit, usage sessions, top-up records, logs, settings, themes, backups, and maintenance.",
                "stack": {
                        "server": "Raspberry Pi 4",
                        "backend": "Python Flask API",
                        "database": "SQLite",
                        "frontend": "HTML, CSS, JavaScript, Tailwind during development",
                        "hardware": [
                                "ESP32 Hub Module",
                                "ESP32 Registry Station"
                        ]
                }
        },
        "navigation": {
                "home": "Project landing and summary.",
                "dashboard": "Charts and system overview: power, hub, user, and usage heatmap.",
                "hardware": "Hub and Registry Station management.",
                "peopleware": "Users, cards, administrators, owners, and developers.",
                "software": "Rates, connection, logs, announcements, bonus, maintenance, database, and backup tools.",
                "about": "Project explanation, problem/solution, hardware, operation, capstone context, developers, and acknowledgement."
        },
        "hardware": {
                "raspberryPi": "The Raspberry Pi 4 hosts Flask, SQLite, static UI files, and local device APIs.",
                "hub": "The ESP32 Hub Module validates cards, controls relay output, monitors electricity usage, and reports sessions.",
                "registry": "The ESP32 Registry Station registers RFID cards, scans cards, and supports coin-slot top-up."
        },
        "roles": {
                "visitor": "Can view public sections.",
                "administrator": "Can manage rates, users/cards, announcements, and basic operations.",
                "owner": "Can perform owner-level actions such as logs, themes, bonuses, and higher controls.",
                "developer": "Highest access for hardware registration, database maintenance, recovery, and technical configuration."
        },
        "electricityAllowance": {
                "allowed": [
                        "blackout",
                        "brownout",
                        "outage",
                        "electricity usage",
                        "kWh",
                        "power consumption",
                        "billing concept",
                        "basic electrical safety"
                ],
                "blackoutReply": "I cannot verify a live area blackout from the local ElectriCredit server unless an outage provider/API is connected. Please check your electric utility, barangay/local advisory, or building administrator. If the ElectriCredit server is only running locally, contact the developer for network or device checks."
        },
        "contactGuide": {
                "developer": "For server, AI provider, database, installation, hardware registration, API, payment bridge, or offline chatbot issues, contact the Developer directly.",
                "administrator": "For tenant user, card, balance, top-up, and normal account concerns, contact an Administrator.",
                "owner": "For rates, themes, logs, bonuses, and policy-level actions, contact the Owner or Developer."
        },
        "ui": {
                "chatStyle": {
                        "desktop": "Messenger-style floating panel.",
                        "mobile": "Full-screen or near full-screen panel.",
                        "draggable": false,
                        "storage": "localStorage or sessionStorage only"
                },
                "commands": [
                        "/help",
                        "/contact",
                        "/clear",
                        "/reset",
                        "/history",
                        "/theme",
                        "/devs",
                        "/admins",
                        "/owner",
                        "/users",
                        "/superusers",
                        "/rate",
                        "/status"
                ]
        },
        "commands": {
                "/help": "Show chatbot commands.",
                "/contact": "Show developers/contact cards.",
                "/clear": "Clear chat display on this browser only.",
                "/reset": "Reset local chat history on this browser only.",
                "/history": "Display local chat history.",
                "/theme <id>": "Apply theme by ID.",
                "/theme": "Apply random theme.",
                "/devs": "Display developers as cards.",
                "/admins": "Display administrators as cards.",
                "/owner": "Display owner as cards.",
                "/users": "Display users as text.",
                "/superusers": "Display all superusers as text.",
                "/rate": "Display current base and tenant rates.",
                "/status": "Display system status."
        },
        "quickAnswers": {
                "system": "ElectriCredit is a Raspberry Pi and ESP32 based prepaid electricity management system for rental spaces.",
                "hardware": "Hardware contains the Raspberry Pi server, ESP32 Hub Modules, and ESP32 Registry Stations.",
                "topup": "Top-up is recorded through transactions. Coin-slot top-up uses a Registry Station. Online payment will use a future payment bridge.",
                "software": "Software contains rates, connection, logs, announcement, bonus, database, server, and backup tools.",
                "roles": "Roles are Visitor, Administrator, Owner, and Developer. Developer has the highest technical access."
        },
        "randomPools": {
                "greetings": [
                        "Hello. I can help with ElectriCredit, cards, hubs, registry, rates, logs, and troubleshooting.",
                        "Hi. Ask me about ElectriCredit or type /help to see commands.",
                        "Hello there. I can guide you through the Dashboard, Hardware, Peopleware, Software, and About sections.",
                        "Hi. I am the ElectriCredit Assistant. Need help with users, cards, top-up, or hardware?",
                        "Welcome. I can explain ElectriCredit and help you find the right section.",
                        "Hello. I can help with prepaid electricity credit, RFID cards, hubs, and registry stations.",
                        "Hi. Type /status, /rate, /devs, or ask a question about the system.",
                        "Good to see you. I can answer ElectriCredit questions and basic electricity concerns.",
                        "Hello. Ask about the Raspberry Pi server, ESP32 Hub, Registry Station, or SQLite database.",
                        "Hi. I can help you understand the capstone system and its parts.",
                        "Hello. I can guide you through local operation, payment bridge plans, and troubleshooting.",
                        "Hi. I can help with system overview, hardware roles, and access permissions.",
                        "Hello. For commands, type /help. For developer cards, type /devs.",
                        "Hi. I can answer about ElectriCredit and power-related concerns.",
                        "Hello. What part of ElectriCredit do you want to check?"
                ],
                "localServerOffline": [
                        "The server is running locally. If you cannot reach the AI or external service, contact the developer directly or try /help.",
                        "ElectriCredit is local-server based. For offline network issues, contact the developer directly or use the command belt.",
                        "The Raspberry Pi server may be running locally without internet. Contact the developer for AI, network, or API checks.",
                        "This system can still run locally. If the assistant cannot reach the backend provider, contact the developer or try /status.",
                        "The local ElectriCredit server is available, but online assistant support may be unavailable. Contact the developer directly.",
                        "Offline mode detected. Please contact the developer for server/network checks or try /help for local commands.",
                        "The system may be on local-only mode. Contact the developer if you need AI, payment bridge, or internet features.",
                        "ElectriCredit can work locally. For assistant/provider issues, contact the developer directly.",
                        "The backend assistant is unreachable, but local ElectriCredit guidance can still work. Try /help or contact the developer.",
                        "Local server mode is likely active. Contact the developer for connection, AI key, or provider setup.",
                        "The assistant cannot reach its provider right now. The system itself may still be running locally.",
                        "If this is a Raspberry Pi local network, external AI may be unavailable. Contact the developer directly.",
                        "The local server is the main system. Online assistant features may rest until the developer checks the provider.",
                        "This looks like local/offline operation. For server configuration, contact the developer directly.",
                        "I can still help with basic commands. For backend/provider failure, contact the developer."
                ],
                "providerRest": [
                        "The chatbot is currently at rest because the AI provider may be out of credits or unavailable. Please contact the developer directly or try /help.",
                        "AI credits/provider access may be exhausted. The chatbot is resting; contact the developer or use /devs.",
                        "The assistant provider may be out of credits. Please contact the developer directly for reactivation.",
                        "The AI service cannot answer right now, possibly due to quota or credits. Contact the developer or try commands.",
                        "Chatbot AI is resting right now. For urgent help, contact the developer or use /status and /help.",
                        "The provider returned an unavailable/credit issue. Please contact the developer directly.",
                        "AI response is unavailable. This may be a provider-credit issue, so contact the developer.",
                        "The chatbot is on rest mode because the online provider is not available. Use local commands or contact the developer.",
                        "The AI provider is unavailable. Try command shortcuts, or contact the developer to check credits/API keys.",
                        "Provider quota may be reached. The developer should check the AI keys or billing.",
                        "I cannot use the AI provider right now. Contact the developer if this keeps happening.",
                        "The chatbot provider is not ready. Use /help for local support or contact the developer.",
                        "Online assistant credits may need to be renewed. Please contact the developer directly.",
                        "The AI provider is resting or blocked by quota. I can still answer simple ElectriCredit topics locally.",
                        "The AI side is unavailable right now. Contact the developer, or try /devs, /status, or /rate."
                ],
                "failure": [
                        "Something failed while contacting the assistant. Would you like to contact the developer or try /help?",
                        "I could not complete that request. You can contact the developer or use the command belt.",
                        "The chatbot backend did not respond correctly. Try /status, /devs, or contact the developer.",
                        "I hit a chatbot error. Please try a command or contact the developer directly.",
                        "The assistant is having trouble. Use /help for local options or contact the developer.",
                        "That request failed. For urgent support, contact the developer or try /devs.",
                        "I cannot process that right now. Try commands like /rate or /status.",
                        "Assistant failure detected. You may contact the developer or retry using a shorter question.",
                        "The chatbot response failed. Use the command belt if you need quick system info.",
                        "I am having trouble answering. Would you like to open /devs or try /help?",
                        "Backend assistant failed. The local system may still be working; try /status.",
                        "That did not go through. Contact the developer if the issue repeats.",
                        "Chatbot service failed temporarily. Try /help, /devs, /rate, or /status.",
                        "I cannot answer through AI right now. I can still give local ElectriCredit guidance.",
                        "The assistant stopped responding. Contact the developer directly or use the commands."
                ],
                "outsideScope": [
                        "I am focused on ElectriCredit. I can also help with basic electricity topics like outage, kWh, or safety.",
                        "That seems outside ElectriCredit. Ask about the system, electricity usage, blackout concerns, or use /help.",
                        "I can only support ElectriCredit and related electricity concerns here.",
                        "For unrelated topics, please use another assistant. For ElectriCredit commands, type /help.",
                        "This assistant is for ElectriCredit, power usage, cards, hubs, registry, and troubleshooting.",
                        "I cannot handle that topic here, but I can explain ElectriCredit or basic electricity concerns.",
                        "Please keep questions related to ElectriCredit or electricity operation.",
                        "That is out of scope. Try asking about the Dashboard, Hardware, Peopleware, Software, or About section.",
                        "I am not a general-purpose chatbot in this app. I am for ElectriCredit guidance.",
                        "Ask me about users, cards, top-up, rates, logs, database, hardware, or electricity usage.",
                        "That topic is not part of this system. Try /help for available commands.",
                        "I can answer if it relates to electricity or ElectriCredit. Otherwise, it is outside this app.",
                        "Let us stay within ElectriCredit, the capstone system, or power-related concerns.",
                        "I am designed for this electricity credit system, not unrelated questions.",
                        "I can redirect you to /help, /devs, /status, or /rate for system support."
                ],
                "electricity": [
                        "I cannot verify a live area blackout unless an outage API is connected. Check your electric utility or local advisory.",
                        "For a possible blackout, check the utility provider, barangay advisory, or building administrator. ElectriCredit can only report its own local device/server status.",
                        "If the area has no power, the Raspberry Pi may need backup power to keep the UI and database online.",
                        "Brownout or blackout detection requires hardware status, UPS/power sensor data, or a utility outage API.",
                        "ElectriCredit can monitor local device usage, but it cannot automatically confirm city-wide outages yet.",
                        "If only one room lost power, check the Hub relay, card balance, credit limit, breaker, and wiring safely.",
                        "If all devices are offline, check the Raspberry Pi power supply, router/hotspot, and main electrical source.",
                        "For safety, do not open live electrical wiring. Contact a qualified person for wiring or breaker issues.",
                        "A zero-balance or reached debt limit can cut power through the Hub even when the area has electricity.",
                        "If there is no electricity but the card has balance, check whether the Hub is online and relay status is enabled.",
                        "For outage reports, the system needs an external provider/API or manual admin announcement.",
                        "The best local check is: Pi online, Hub online, Registry online, breaker on, card active, and balance allowed.",
                        "kWh means kilowatt-hour, which is the unit used to measure electricity consumption over time.",
                        "Higher wattage and longer usage create higher kWh consumption and faster credit deduction.",
                        "ElectriCredit can help track local consumption, but area blackout confirmation must come from the utility or a connected outage service."
                ]
        },
        "offline": {
                "messages": [
                        "The server is running locally. If you cannot reach the AI or external service, contact the developer directly or try /help.",
                        "ElectriCredit is local-server based. For offline network issues, contact the developer directly or use the command belt.",
                        "The Raspberry Pi server may be running locally without internet. Contact the developer for AI, network, or API checks.",
                        "This system can still run locally. If the assistant cannot reach the backend provider, contact the developer or try /status.",
                        "The local ElectriCredit server is available, but online assistant support may be unavailable. Contact the developer directly.",
                        "Offline mode detected. Please contact the developer for server/network checks or try /help for local commands.",
                        "The system may be on local-only mode. Contact the developer if you need AI, payment bridge, or internet features.",
                        "ElectriCredit can work locally. For assistant/provider issues, contact the developer directly.",
                        "The backend assistant is unreachable, but local ElectriCredit guidance can still work. Try /help or contact the developer.",
                        "Local server mode is likely active. Contact the developer for connection, AI key, or provider setup.",
                        "The assistant cannot reach its provider right now. The system itself may still be running locally.",
                        "If this is a Raspberry Pi local network, external AI may be unavailable. Contact the developer directly.",
                        "The local server is the main system. Online assistant features may rest until the developer checks the provider.",
                        "This looks like local/offline operation. For server configuration, contact the developer directly.",
                        "I can still help with basic commands. For backend/provider failure, contact the developer."
                ],
                "suggestedReplies": [
                        "/help",
                        "/contact",
                        "/devs",
                        "/status",
                        "/rate",
                        "Is there a blackout?",
                        "Explain Hardware"
                ]
        },
        "defaultSuggestedReplies": [
                "/help",
                "/contact",
                "/devs",
                "/status",
                "/rate",
                "What is ElectriCredit?",
                "Explain Hardware",
                "Is there a blackout?",
                "How does top-up work?"
        ]
};
    }
  };

  window.ChatbotController = ChatbotController;
  window.ElectriCreditChatbot = ChatbotController;

  document.addEventListener("DOMContentLoaded", () => {
    ChatbotController.init({
      app: window.ElectriCredit || null
    });
  });
})();