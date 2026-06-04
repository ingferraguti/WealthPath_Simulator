(function (global) {
  const chartRefs = { allocation: null, portfolio: null, monteCarlo: null, histogram: null };
  const colors = ["#4e73df", "#1cc88a", "#36b9cc", "#f6c23e", "#e74a3b", "#858796", "#5a5c69"];
  function destroyChart(name) { if (chartRefs[name]) { chartRefs[name].destroy(); chartRefs[name] = null; } }
  function euroTick(value) { return `€${Number(value).toLocaleString("it-IT", { maximumFractionDigits: 0 })}`; }
  function renderAllocationChart(allocation) {
    const canvas = document.getElementById("allocationChart"); if (!canvas || !global.Chart) return;
    destroyChart("allocation");
    chartRefs.allocation = new Chart(canvas.getContext("2d"), { type: "doughnut", data: { labels: global.marketData.assetClasses.map((asset) => global.labels.assets[asset]), datasets: [{ data: global.marketData.assetClasses.map((asset) => allocation[asset]), backgroundColor: colors }] }, options: { responsive: true, maintainAspectRatio: false, legend: { position: "bottom" }, tooltips: { callbacks: { label: (item, data) => `${data.labels[item.index]}: ${data.datasets[0].data[item.index]}%` } } } });
  }
  function renderPortfolioChart(simulation, macroEnabled) {
    const canvas = document.getElementById("portfolioChart"); if (!canvas || !global.Chart) return;
    destroyChart("portfolio");
    const labels = simulation.nominalValues.map((_, index) => `M${index}`);
    const datasets = [
      { label: "Valore nominale", data: simulation.nominalValues, borderColor: "#4e73df", backgroundColor: "rgba(78,115,223,0.08)", fill: false, pointRadius: 0, lineTension: 0.15 },
      { label: "Capitale versato", data: simulation.contributions, borderColor: "#1cc88a", backgroundColor: "rgba(28,200,138,0.08)", fill: false, pointRadius: 0, borderDash: [6, 4], lineTension: 0 }
    ];
    if (macroEnabled && simulation.realValues.length) datasets.push({ label: "Valore reale", data: simulation.realValues, borderColor: "#f6c23e", backgroundColor: "rgba(246,194,62,0.08)", fill: false, pointRadius: 0, lineTension: 0.15 });
    chartRefs.portfolio = new Chart(canvas.getContext("2d"), { type: "line", data: { labels, datasets }, options: { responsive: true, maintainAspectRatio: false, legend: { position: "bottom" }, tooltips: { mode: "index", intersect: false }, scales: { yAxes: [{ ticks: { callback: euroTick } }] } } });
  }
  function renderMonteCarloChart(result) {
    const canvas = document.getElementById("monteCarloChart"); if (!canvas || !global.Chart || !result) return;
    destroyChart("monteCarlo");
    const b = result.bands;
    chartRefs.monteCarlo = new Chart(canvas.getContext("2d"), { type: "line", data: { labels: b.labels, datasets: [
      { label: "P95", data: b.p95, borderColor: "rgba(78,115,223,0.25)", backgroundColor: "rgba(78,115,223,0.10)", fill: false, pointRadius: 0 },
      { label: "P75", data: b.p75, borderColor: "rgba(78,115,223,0.45)", backgroundColor: "rgba(78,115,223,0.14)", fill: "-1", pointRadius: 0 },
      { label: "P50", data: b.p50, borderColor: "#4e73df", backgroundColor: "rgba(78,115,223,0.04)", fill: false, pointRadius: 0 },
      { label: "P25", data: b.p25, borderColor: "rgba(231,74,59,0.45)", backgroundColor: "rgba(231,74,59,0.12)", fill: false, pointRadius: 0 },
      { label: "P5", data: b.p5, borderColor: "rgba(231,74,59,0.25)", backgroundColor: "rgba(231,74,59,0.10)", fill: "-1", pointRadius: 0 },
      { label: "Capitale versato", data: b.contributions, borderColor: "#1cc88a", fill: false, borderDash: [6, 4], pointRadius: 0 },
      { label: "Obiettivo", data: b.target, borderColor: "#111", fill: false, borderDash: [4, 4], pointRadius: 0 }
    ] }, options: { responsive: true, maintainAspectRatio: false, legend: { position: "bottom" }, tooltips: { mode: "index", intersect: false }, scales: { yAxes: [{ ticks: { callback: euroTick } }] } } });
  }
  function renderHistogramChart(result) {
    const canvas = document.getElementById("monteCarloHistogram"); if (!canvas || !global.Chart || !result) return;
    destroyChart("histogram");
    chartRefs.histogram = new Chart(canvas.getContext("2d"), { type: "bar", data: { labels: result.histogram.labels, datasets: [{ label: "Scenari", data: result.histogram.counts, backgroundColor: "rgba(54,185,204,0.65)", borderColor: "#36b9cc" }] }, options: { responsive: true, maintainAspectRatio: false, legend: { display: false }, scales: { yAxes: [{ ticks: { beginAtZero: true, precision: 0 } }] } } });
  }
  global.WealthPathCharts = { chartRefs, destroyChart, renderAllocationChart, renderPortfolioChart, renderMonteCarloChart, renderHistogramChart };
})(window);
