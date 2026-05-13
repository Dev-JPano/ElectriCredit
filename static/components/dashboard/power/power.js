/* =========================================================
   ELECTRICREDIT V2 - POWER DASHBOARD CONTROLLER
   File: static/components/dashboard/power/power.js
   ========================================================= */

(function () {
  "use strict";

  const PowerDashboard = {
    root: null,
    parent: null,
    app: null,
    chart: null,
    items: [],
    view: "overall",
    sort: "date_down",

    async init(context = {}) {
      this.root = context.root;
      this.parent = context.parent || window.DashboardController;
      this.app = context.app || window.ElectriCredit || null;

      if (!this.root || !window.PowerDashboardStructure) return;

      window.PowerDashboardDesign?.inject?.();
      this.items = normalizeArray(await this.loadData());
      this.render();
      this.bindEvents();
      await this.draw();
    },

    async loadData() {
      try {
        const payload = await this.getJson(this.route("dashboardPower", "/api/dashboard/power"));
        return unwrapRows(payload);
      } catch (error) {
        console.warn("Power dashboard failed:", error);
        return [];
      }
    },

    render() {
      this.root.innerHTML = window.PowerDashboardStructure.render({ items: this.items });
    },

    bindEvents() {
      this.root.querySelector("[data-power-view]")?.addEventListener("change", (event) => {
        this.view = event.target.value;
        this.draw();
      });

      this.root.querySelector("[data-power-sort]")?.addEventListener("change", (event) => {
        this.sort = event.target.value;
        this.draw();
      });
    },

    async draw() {
      const target = this.root?.querySelector("[data-power-chart]");
      if (!target) return;

      if (!target.offsetWidth) {
        requestAnimationFrame(() => this.draw());
        return;
      }

      if (!this.items.length) {
        target.innerHTML = `<div class="ec-dashboard-state">No power session data yet.</div>`;
        return;
      }

      const echarts = await this.parent.ensureECharts();
      this.chart = this.chart || echarts.init(target);
      const series = this.getSeries();

      this.chart.setOption({
        backgroundColor: "transparent",
        color: [cssVar("--ec-primary"), cssVar("--ec-secondary")],
        tooltip: { trigger: "axis" },
        grid: { top: 28, left: 48, right: 18, bottom: 42 },
        xAxis: {
          type: "category",
          data: series.labels,
          boundaryGap: false,
          axisLabel: { color: cssVar("--ec-txtforbg2") },
          axisLine: { lineStyle: { color: cssVar("--ec-border") } }
        },
        yAxis: {
          type: "value",
          name: "kWh",
          nameTextStyle: { color: cssVar("--ec-txtforbg2") },
          axisLabel: { color: cssVar("--ec-txtforbg2") },
          splitLine: { lineStyle: { color: cssVar("--ec-border") } }
        },
        series: [{
          name: "Consumed kWh",
          type: "line",
          smooth: true,
          symbolSize: 7,
          data: series.values,
          areaStyle: { opacity: 0.16, color: cssVar("--ec-primary") },
          lineStyle: { width: 3, color: cssVar("--ec-primary") },
          itemStyle: { color: cssVar("--ec-primary") }
        }]
      }, true);
    },

    getSeries() {
      const grouped = new Map();

      this.items.forEach((item) => {
        const label = this.formatBucket(pick(item, ["started", "created", "ended", "datetime", "date"]));
        grouped.set(label, (grouped.get(label) || 0) + numberOf(item, ["consumed_kwh", "consumedKwh", "kwh", "value"]));
      });

      let rows = Array.from(grouped.entries()).map(([label, value]) => ({ label, value }));

      rows.sort((a, b) => {
        if (this.sort === "date_up") return a.label.localeCompare(b.label);
        if (this.sort === "consume_up") return a.value - b.value;
        if (this.sort === "consume_down") return b.value - a.value;
        return b.label.localeCompare(a.label);
      });

      return {
        labels: rows.map((row) => row.label),
        values: rows.map((row) => Number(row.value.toFixed(3)))
      };
    },

    formatBucket(value) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "Unknown";

      if (this.view === "day") return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      if (this.view === "month") return date.toLocaleDateString(undefined, { year: "numeric", month: "short" });
      if (this.view === "year") return String(date.getFullYear());

      return date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit" });
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
    if (Array.isArray(data?.sessions)) return data.sessions;
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

  window.PowerDashboard = PowerDashboard;
})();
