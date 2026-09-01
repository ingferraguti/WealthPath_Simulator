(function (global) {
  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function runBrowserRegressionTests() {
    const root = document.documentElement;
    const status = document.getElementById("monteCarloStatus");
    const kpis = document.getElementById("monteCarloKpis");
    const scenarios = document.getElementById("monteCarloScenarios");
    const horizon = document.getElementById("timeHorizonYears");
    const initialInvestment = document.getElementById("initialInvestment");

    try {
      assert(status && kpis && scenarios && horizon && initialInvestment, "Controlli Monte Carlo mancanti.");

      horizon.value = "1";
      horizon.dispatchEvent(new Event("blur"));
      scenarios.value = "3";
      scenarios.dispatchEvent(new Event("blur"));
      global.runMonteCarloFromUi();

      assert(global.currentMonteCarlo && global.currentMonteCarlo.pathsCount === 3, "Monte Carlo non eseguito.");
      assert(status.textContent.includes("completato con 3 scenari"), "Stato di completamento assente.");
      assert(!kpis.textContent.includes(global.labels.ui.noMonteCarlo), "KPI Monte Carlo non popolati.");

      initialInvestment.value = "11000";
      initialInvestment.dispatchEvent(new Event("blur"));

      assert(global.currentMonteCarlo === null, "Risultato Monte Carlo obsoleto ancora esposto.");
      assert(status.textContent === global.labels.ui.noMonteCarlo, "Stato Monte Carlo obsoleto.");
      assert(kpis.textContent.trim() === global.labels.ui.noMonteCarlo, "KPI Monte Carlo obsoleti.");
      assert(global.WealthPathCharts.chartRefs.monteCarlo === null, "Grafico percentile obsoleto.");
      assert(global.WealthPathCharts.chartRefs.histogram === null, "Istogramma obsoleto.");

      root.dataset.browserRegression = "passed:1";
      return [{ name: "invalidazione Monte Carlo dopo modifica input", ok: true }];
    } catch (error) {
      root.dataset.browserRegression = "failed";
      root.dataset.browserRegressionError = error.message;
      console.error(error);
      return [{ name: "invalidazione Monte Carlo dopo modifica input", ok: false, error: error.message }];
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runBrowserRegressionTests);
  } else {
    setTimeout(runBrowserRegressionTests, 0);
  }

  global.runBrowserRegressionTests = runBrowserRegressionTests;
})(window);
