(function (global) {
  const chartRefs = { allocation: null, portfolio: null, monteCarlo: null, histogram: null };
  const colors = ["#4e73df", "#1cc88a", "#36b9cc", "#f6c23e", "#e74a3b", "#858796", "#5a5c69"];
  const MAX_LINE_POINTS = 300;

  function destroyChart(name) {
    const chart = chartRefs[name];
    if (chart && typeof chart.destroy === "function") {
      try { chart.destroy(); } catch (error) { /* Un grafico già rimosso non deve bloccare il rendering. */ }
    }
    chartRefs[name] = null;
  }

  function createChart(name, canvasId, config) {
    destroyChart(name);
    const canvas = document.getElementById(canvasId);
    if (!canvas || !global.Chart || typeof canvas.getContext !== "function") return null;
    try {
      chartRefs[name] = new global.Chart(canvas.getContext("2d"), config);
      return chartRefs[name];
    } catch (error) {
      chartRefs[name] = null;
      if (global.console && typeof global.console.error === "function") global.console.error(`Impossibile creare il grafico ${name}.`, error);
      return null;
    }
  }

  function sampleIndexes(length, maxPoints) {
    if (length <= maxPoints) return Array.from({ length }, (_, index) => index);
    const indexes = [0];
    const step = (length - 1) / (maxPoints - 1);
    for (let point = 1; point < maxPoints - 1; point += 1) indexes.push(Math.round(point * step));
    indexes.push(length - 1);
    return indexes;
  }

  function sampledSeries(series, indexes) {
    return indexes.map((index) => series[index]);
  }

  function euroTick(value) {
    return `€${Number(value).toLocaleString("it-IT", { maximumFractionDigits: 0 })}`;
  }

  function renderAllocationChart(allocation) {
    return createChart("allocation", "allocationChart", {
      type: "doughnut",
      data: {
        labels: global.marketData.assetClasses.map((asset) => global.labels.assets[asset]),
        datasets: [{ data: global.marketData.assetClasses.map((asset) => allocation[asset]), backgroundColor: colors }]
      },
      options: { responsive: true, maintainAspectRatio: false, legend: { position: "bottom" }, tooltips: { callbacks: { label: (item, data) => `${data.labels[item.index]}: ${data.datasets[0].data[item.index]}%` } } }
    });
  }

  function renderPortfolioChart(simulation, macroEnabled) {
    const indexes = sampleIndexes(simulation.nominalValues.length, MAX_LINE_POINTS);
    const datasets = [
      { label: "Patrimonio netto", data: sampledSeries(simulation.nominalValues, indexes), borderColor: simulation.marginCallOccurred ? "#e74a3b" : "#4e73df", backgroundColor: "rgba(78,115,223,0.08)", fill: false, pointRadius: 0, lineTension: 0.15 },
      { label: "Capitale versato", data: sampledSeries(simulation.contributions, indexes), borderColor: "#1cc88a", backgroundColor: "rgba(28,200,138,0.08)", fill: false, pointRadius: 0, borderDash: [6, 4], lineTension: 0 }
    ];
    if (simulation.withdrawals && simulation.withdrawals[simulation.withdrawals.length - 1] > 0) datasets.push({ label: "Prelievi cumulati", data: sampledSeries(simulation.withdrawals, indexes), borderColor: "#e74a3b", backgroundColor: "rgba(231,74,59,0.08)", fill: false, pointRadius: 0, borderDash: [3, 3], lineTension: 0 });
    if (simulation.rebalanceTaxes && simulation.rebalanceTaxes[simulation.rebalanceTaxes.length - 1] > 0) datasets.push({ label: "Tasse da ribilanciamento", data: sampledSeries(simulation.rebalanceTaxes, indexes), borderColor: "#858796", backgroundColor: "rgba(133,135,150,0.08)", fill: false, pointRadius: 0, borderDash: [2, 4], lineTension: 0 });
    if (simulation.lombardEnabled) datasets.push({ label: "Debito Lombard", data: sampledSeries(simulation.lombardDebts, indexes), borderColor: "#f6c23e", backgroundColor: "rgba(246,194,62,0.08)", fill: false, pointRadius: 0, borderDash: [5, 3], lineTension: 0 });
    if (macroEnabled && simulation.realValues.length) datasets.push({ label: "Valore reale", data: sampledSeries(simulation.realValues, indexes), borderColor: "#f6c23e", backgroundColor: "rgba(246,194,62,0.08)", fill: false, pointRadius: 0, lineTension: 0.15 });
    return createChart("portfolio", "portfolioChart", {
      type: "line",
      data: { labels: indexes.map((index) => `M${index}`), datasets },
      options: { responsive: true, maintainAspectRatio: false, animation: indexes.length < simulation.nominalValues.length ? { duration: 0 } : undefined, legend: { position: "bottom" }, tooltips: { mode: "index", intersect: false }, scales: { yAxes: [{ ticks: { callback: euroTick } }] } }
    });
  }

  function renderMonteCarloChart(result) {
    if (!result) { destroyChart("monteCarlo"); return null; }
    const bands = result.bands;
    const indexes = sampleIndexes(bands.labels.length, MAX_LINE_POINTS);
    const data = (series) => sampledSeries(series, indexes);
    return createChart("monteCarlo", "monteCarloChart", {
      type: "line",
      data: { labels: data(bands.labels), datasets: [
        { label: "P95", data: data(bands.p95), borderColor: "rgba(78,115,223,0.25)", backgroundColor: "rgba(78,115,223,0.10)", fill: false, pointRadius: 0 },
        { label: "P75", data: data(bands.p75), borderColor: "rgba(78,115,223,0.45)", backgroundColor: "rgba(78,115,223,0.14)", fill: "-1", pointRadius: 0 },
        { label: "P50", data: data(bands.p50), borderColor: "#4e73df", backgroundColor: "rgba(78,115,223,0.04)", fill: false, pointRadius: 0 },
        { label: "P25", data: data(bands.p25), borderColor: "rgba(231,74,59,0.45)", backgroundColor: "rgba(231,74,59,0.12)", fill: false, pointRadius: 0 },
        { label: "P5", data: data(bands.p5), borderColor: "rgba(231,74,59,0.25)", backgroundColor: "rgba(231,74,59,0.10)", fill: "-1", pointRadius: 0 },
        { label: "Capitale versato", data: data(bands.contributions), borderColor: "#1cc88a", fill: false, borderDash: [6, 4], pointRadius: 0 },
        { label: "Obiettivo", data: data(bands.target), borderColor: "#111", fill: false, borderDash: [4, 4], pointRadius: 0 }
      ] },
      options: { responsive: true, maintainAspectRatio: false, animation: { duration: 0 }, legend: { position: "bottom" }, tooltips: { mode: "index", intersect: false }, scales: { yAxes: [{ ticks: { callback: euroTick } }] } }
    });
  }

  function renderHistogramChart(result) {
    if (!result) { destroyChart("histogram"); return null; }
    return createChart("histogram", "monteCarloHistogram", {
      type: "bar",
      data: { labels: result.histogram.labels, datasets: [{ label: "Scenari", data: result.histogram.counts, backgroundColor: "rgba(54,185,204,0.65)", borderColor: "#36b9cc" }] },
      options: { responsive: true, maintainAspectRatio: false, animation: { duration: 0 }, legend: { display: false }, scales: { yAxes: [{ ticks: { beginAtZero: true, precision: 0 } }] } }
    });
  }

  function clearMonteCarloCharts() { destroyChart("monteCarlo"); destroyChart("histogram"); }
  function destroyAll() { Object.keys(chartRefs).forEach(destroyChart); }

  global.WealthPathCharts = { chartRefs, MAX_LINE_POINTS, sampleIndexes, destroyChart, clearMonteCarloCharts, destroyAll, renderAllocationChart, renderPortfolioChart, renderMonteCarloChart, renderHistogramChart };
})(window);
