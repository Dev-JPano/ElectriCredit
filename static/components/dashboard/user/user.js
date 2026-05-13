/* =========================================================
   ELECTRICREDIT V2 - USER DASHBOARD CONTROLLER
   File: static/components/dashboard/user/user.js
   ========================================================= */

(function () {
  "use strict";

  const UserDashboard = {
    root: null,
    parent: null,
    app: null,
    chart: null,
    items: [],
    view: "user",
    metric: "revenue",

    async init(context = {}) {
      this.root = context.root;
      this.parent = context.parent || window.DashboardController;
      this.app = context.app || window.ElectriCredit || null;

      if (!this.root || !window.UserDashboardStructure) return;

      window.UserDashboardDesign?.inject?.();
      this.items = normalizeArray(await this.loadData());
      this.render();
      this.bindEvents();
      await this.draw();
    },

    async loadData() {
      try {
        const payload = await this.getJson(this.route("dashboardUser", "/api/dashboard/user"));
        return unwrapRows(payload);
      } catch (error) {
        console.warn("User dashboard failed:", error);
        return [];
      }
    },

    render() {
      this.root.innerHTML = window.UserDashboardStructure.render({ items: this.items });
    },

    bindEvents() {
      this.root.querySelector("[data-user-view]")?.addEventListener("change", (event) => {
        this.view = event.target.value;
        this.draw();
      });

      this.root.querySelector("[data-user-metric]")?.addEventListener("change", (event) => {
        this.metric = event.target.value;
        this.draw();
      });
    },

    async draw() {
      const target = this.root?.querySelector("[data-user-chart]");
      if (!target) return;

      if (!target.offsetWidth) {
        requestAnimationFrame(() => this.draw());
        return;
      }

      const rows = this.getRows().slice(0, 12);

      if (!rows.length) {
        target.innerHTML = `<div class="ec-dashboard-state">No user or card ranking data yet.</div>`;
        return;
      }

      const echarts = await this.parent.ensureECharts();
      this.chart = this.chart || echarts.init(target);
      const metricLabel = this.metric === "revenue" ? "Revenue" : "kWh";

      this.chart.setOption({
        backgroundColor: "transparent",
        color: [cssVar("--ec-primary"), cssVar("--ec-secondary")],
        tooltip: { trigger: "axis" },
        grid: { top: 28, left: 100, right: 18, bottom: 36 },
        xAxis: {
          type: "value",
          name: metricLabel,
          nameTextStyle: { color: cssVar("--ec-txtforbg2") },
          axisLabel: { color: cssVar("--ec-txtforbg2") },
          splitLine: { lineStyle: { color: cssVar("--ec-border") } }
        },
        yAxis: {
          type: "category",
          data: rows.map((row) => row.label).reverse(),
          axisLabel: { color: cssVar("--ec-txtforbg2") },
          axisLine: { lineStyle: { color: cssVar("--ec-border") } }
        },
        series: [{
          name: metricLabel,
          type: "bar",
          barMaxWidth: 28,
          data: rows.map((row) => row.value).reverse(),
          itemStyle: { borderRadius: [0, 10, 10, 0], color: cssVar("--ec-primary") }
        }]
      }, true);
    },

    getRows() {
      const rows = [];

      this.items.forEach((item) => {
        if (this.view === "card" && Array.isArray(item.cards)) {
          item.cards.forEach((card) => {
            rows.push({
              label: `CARD[${pick(card, ["id", "card_id", "cardId"]) || "?"}]`,
              value: Number(this.metric === "revenue"
                ? numberOf(card, ["revenue", "balance", "total_revenue"])
                : numberOf(card, ["used_kwh", "total_used_kwh", "kwh"]))
            });
          });
          return;
        }

        rows.push({
          label: pick(item, ["name", "username"]) || `USER[${pick(item, ["user_id", "userId", "id"]) || "?"}]`,
          value: Number(this.metric === "revenue"
            ? numberOf(item, ["total_revenue", "revenue", "total_balance", "balance"])
            : numberOf(item, ["total_used_kwh", "used_kwh", "kwh", "total_kwh"]))
        });
      });

      return rows.sort((a, b) => b.value - a.value);
    },

    resize() {
      this.chart?.resize?.();
    },

    route(name, fallback) {
      return this.parent?.route?.(name, fallback) || fallback;
    },

    getJson(url) {
      return this.parent?.getJson?.(url) || fetch(url).then((response) => response.json());
    }
  };

  function unwrapRows(payload) {
    const data = payload?.data ?? payload?.rows ?? payload?.items ?? payload;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.rows)) return data.rows;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.users)) return data.users;
    return [];
  }

  function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function pick(item, keys) {
    for (const key of keys) {
      if (item?.[key] !== undefined && item?.[key] !== null && item?.[key] !== "") return item[key];
    }
    return "";
  }

  function numberOf(item, keys) {
    for (const key of keys) {
      const value = Number(item?.[key]);
      if (Number.isFinite(value)) return value;
    }
    return 0;
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  window.UserDashboard = UserDashboard;
})();
