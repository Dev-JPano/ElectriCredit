/* =========================================================
   ELECTRICREDIT V2 - USAGE DASHBOARD CONTROLLER
   File: static/components/dashboard/usage/usage.js
   ========================================================= */

(function () {
  "use strict";

  const UsageDashboard = {
    root: null,
    parent: null,
    app: null,
    chart: null,
    items: [],

    async init(context = {}) {
      this.root = context.root;
      this.parent = context.parent || window.DashboardController;
      this.app = context.app || window.ElectriCredit || null;

      if (!this.root || !window.UsageDashboardStructure) return;

      window.UsageDashboardDesign?.inject?.();
      this.items = normalizeArray(await this.loadData());
      this.render();
      await this.draw();
    },

    async loadData() {
      try {
        const payload = await this.getJson(this.route("dashboardUsage", "/api/dashboard/usage"));
        return unwrapRows(payload);
      } catch (error) {
        console.warn("Usage dashboard failed:", error);
        return [];
      }
    },

    render() {
      this.root.innerHTML = window.UsageDashboardStructure.render({ items: this.items });
    },

    async draw() {
      const target = this.root?.querySelector("[data-usage-chart]");
      if (!target) return;

      if (!target.offsetWidth) {
        requestAnimationFrame(() => this.draw());
        return;
      }

      const data = this.getHeatmapData();

      if (!this.items.length) {
        target.innerHTML = `<div class="ec-dashboard-state">No hourly usage data yet.</div>`;
        return;
      }

      const echarts = await this.parent.ensureECharts();
      this.chart = this.chart || echarts.init(target);

      this.chart.setOption({
        backgroundColor: "transparent",
        color: [cssVar("--ec-primary"), cssVar("--ec-secondary")],
        tooltip: {
          position: "top",
          formatter: (params) => {
            const hub = data.hubs[params.value[0]] || "HUB[?]";
            const hour = data.hours[params.value[1]] || "--:--";
            return `${hub}<br>${hour}: ${params.value[2]} kWh`;
          }
        },
        grid: { top: 20, left: 72, right: 22, bottom: 72 },
        xAxis: {
          type: "category",
          data: data.hubs,
          splitArea: { show: true },
          axisLabel: { color: cssVar("--ec-txtforbg2") },
          axisLine: { lineStyle: { color: cssVar("--ec-border") } }
        },
        yAxis: {
          type: "category",
          data: data.hours,
          splitArea: { show: true },
          axisLabel: { color: cssVar("--ec-txtforbg2") },
          axisLine: { lineStyle: { color: cssVar("--ec-border") } }
        },
        visualMap: {
          min: 0,
          max: data.max || 1,
          calculable: true,
          orient: "horizontal",
          left: "center",
          bottom: 8,
          inRange: { color: [cssVar("--ec-bg2"), cssVar("--ec-primary"), cssVar("--ec-secondary")] },
          textStyle: { color: cssVar("--ec-txtforbg2") }
        },
        series: [{
          name: "Hourly kWh",
          type: "heatmap",
          data: data.values,
          label: { show: false },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: cssVar("--ec-shadow")
            }
          }
        }]
      }, true);
    },

    getHeatmapData() {
      const hubIds = unique(this.items.map((item) => pick(item, ["hub_id", "hubId", "id", "hub"]) || "?"));
      const hubs = hubIds.length ? hubIds.map((id) => `HUB[${id}]`) : ["HUB[0]"];
      const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
      const matrix = new Map();
      let max = 0;

      this.items.forEach((item) => {
        const hubId = pick(item, ["hub_id", "hubId", "id", "hub"]) || "?";
        const x = Math.max(0, hubIds.indexOf(hubId));
        const hour = getHour(pick(item, ["started", "created", "datetime", "hour"]));
        const key = `${x}:${hour}`;
        const value = (matrix.get(key) || 0) + numberOf(item, ["consumed_kwh", "consumedKwh", "kwh", "value"]);

        matrix.set(key, value);
        max = Math.max(max, value);
      });

      const values = [];
      for (let x = 0; x < hubs.length; x += 1) {
        for (let y = 0; y < 24; y += 1) {
          values.push([x, y, Number((matrix.get(`${x}:${y}`) || 0).toFixed(3))]);
        }
      }

      return { hubs, hours, values, max };
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
    if (Array.isArray(data?.usage)) return data.usage;
    return [];
  }

  function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function unique(values) {
    return Array.from(new Set(values.filter((value) => value !== undefined && value !== null && value !== "")));
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

  function getHour(value) {
    const numeric = Number(value);
    if (Number.isInteger(numeric) && numeric >= 0 && numeric <= 23) return numeric;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getHours();
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  window.UsageDashboard = UsageDashboard;
})();
