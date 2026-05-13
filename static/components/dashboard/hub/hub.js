/* =========================================================
   ELECTRICREDIT V2 - HUB DASHBOARD CONTROLLER
   File: static/components/dashboard/hub/hub.js
   ========================================================= */

(function () {
  "use strict";

  const HubDashboard = {
    root: null,
    parent: null,
    app: null,
    chart: null,
    items: [],
    view: "power",

    async init(context = {}) {
      this.root = context.root;
      this.parent = context.parent || window.DashboardController;
      this.app = context.app || window.ElectriCredit || null;

      if (!this.root || !window.HubDashboardStructure) return;

      window.HubDashboardDesign?.inject?.();
      this.items = normalizeArray(await this.loadData());
      this.render();
      this.bindEvents();
      await this.draw();
    },

    async loadData() {
      try {
        const payload = await this.getJson(this.route("dashboardHub", "/api/dashboard/hub"));
        return unwrapRows(payload);
      } catch (error) {
        console.warn("Hub dashboard failed:", error);
        return [];
      }
    },

    render() {
      this.root.innerHTML = window.HubDashboardStructure.render({ items: this.items });
    },

    bindEvents() {
      this.root.querySelector("[data-hub-view]")?.addEventListener("change", (event) => {
        this.view = event.target.value;
        this.draw();
      });
    },

    async draw() {
      const target = this.root?.querySelector("[data-hub-chart]");
      if (!target) return;

      if (!target.offsetWidth) {
        requestAnimationFrame(() => this.draw());
        return;
      }

      const rows = this.getRows();

      if (!rows.length) {
        target.innerHTML = `<div class="ec-dashboard-state">No hub performance data yet.</div>`;
        return;
      }

      const echarts = await this.parent.ensureECharts();
      this.chart = this.chart || echarts.init(target);

      const title = this.view === "sessions" ? "Sessions" : this.view === "revenue" ? "Revenue" : "kWh";

      this.chart.setOption({
        backgroundColor: "transparent",
        color: [cssVar("--ec-primary"), cssVar("--ec-secondary")],
        tooltip: { trigger: "axis" },
        grid: { top: 28, left: 52, right: 18, bottom: 46 },
        xAxis: {
          type: "category",
          data: rows.map((row) => row.label),
          axisLabel: { color: cssVar("--ec-txtforbg2") },
          axisLine: { lineStyle: { color: cssVar("--ec-border") } }
        },
        yAxis: {
          type: "value",
          name: title,
          nameTextStyle: { color: cssVar("--ec-txtforbg2") },
          axisLabel: { color: cssVar("--ec-txtforbg2") },
          splitLine: { lineStyle: { color: cssVar("--ec-border") } }
        },
        series: [{
          name: title,
          type: "bar",
          barMaxWidth: 42,
          data: rows.map((row) => row.value),
          itemStyle: { borderRadius: [10, 10, 0, 0], color: cssVar("--ec-primary") }
        }]
      }, true);
    },

    getRows() {
      const map = new Map();

      this.items.forEach((item) => {
        const id = pick(item, ["hub_id", "hubId", "id", "hub"]) || "?";
        const label = pick(item, ["name", "location", "label"]) || `HUB[${id}]`;
        const current = map.get(label) || { label, power: 0, sessions: 0, revenue: 0 };

        current.power += numberOf(item, ["consumed_kwh", "consumedKwh", "kwh", "value"]);
        current.sessions += numberOf(item, ["session_count", "sessions"], 1);
        current.revenue += numberOf(item, ["revenue", "total_revenue"]);

        map.set(label, current);
      });

      return Array.from(map.values())
        .map((row) => ({
          label: row.label,
          value: Number((row[this.view === "power" ? "power" : this.view] || 0).toFixed(2))
        }))
        .sort((a, b) => b.value - a.value);
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
    if (Array.isArray(data?.hubs)) return data.hubs;
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

  function numberOf(item, keys, fallback = 0) {
    for (const key of keys) {
      const value = Number(item?.[key]);
      if (Number.isFinite(value)) return value;
    }
    return fallback;
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  window.HubDashboard = HubDashboard;
})();
