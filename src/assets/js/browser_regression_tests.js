(function (global) {
  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  async function runBrowserRegressionTests() {
    const root = document.documentElement;
    const status = document.getElementById("monteCarloStatus");
    const kpis = document.getElementById("monteCarloKpis");
    const scenarios = document.getElementById("monteCarloScenarios");
    const horizon = document.getElementById("timeHorizonYears");
    const initialInvestment = document.getElementById("initialInvestment");
    const singleTab = document.getElementById("singleSimulationTab");
    const monteCarloTab = document.getElementById("monteCarloTab");
    const singlePanel = document.getElementById("singleSimulationPanel");
    const monteCarloPanel = document.getElementById("monteCarloPanel");
    const monthlyTable = document.getElementById("monthlyTable");
    const annualTable = document.getElementById("annualTable");
    const retirementToggle = document.getElementById("enableRetirement");
    const retirementSettings = document.getElementById("retirementSettings");
    const withdrawalRate = document.getElementById("retirementWithdrawalRate");
    const taxRate = document.getElementById("rebalanceTaxRate");

    try {
      assert(status && kpis && scenarios && horizon && initialInvestment && singleTab && monteCarloTab && singlePanel && monteCarloPanel && monthlyTable && annualTable && retirementToggle && retirementSettings && withdrawalRate && taxRate, "Controlli dell'interfaccia mancanti.");
      assert(Number(taxRate.value) === 26 && Number(withdrawalRate.value) === 3.5 && retirementSettings.classList.contains("d-none"), "Valori retirement predefiniti errati.");
      retirementToggle.checked = true;
      retirementToggle.dispatchEvent(new Event("change"));
      assert(!retirementSettings.classList.contains("d-none"), "Controlli retirement non attivabili.");
      assert(singleTab.classList.contains("active") && !monteCarloTab.classList.contains("active"), "Scheda iniziale errata.");
      assert(monthlyTable.closest("section").parentElement === singlePanel && annualTable.closest("section").parentElement === singlePanel, "Tabelle non nella simulazione singola.");
      assert(monthlyTable.closest("section").nextElementSibling === annualTable.closest("section"), "Tabelle non disposte una sotto l'altra.");
      monteCarloTab.click();
      assert(monteCarloTab.classList.contains("active"), "Scheda Monte Carlo non attivabile.");

      horizon.value = "1";
      horizon.dispatchEvent(new Event("blur"));
      scenarios.value = "3";
      scenarios.dispatchEvent(new Event("blur"));
      await global.runMonteCarloFromUi();

      assert(global.currentMonteCarlo && global.currentMonteCarlo.pathsCount === 3, "Monte Carlo non eseguito.");
      assert(status.textContent.includes("completato con 3 scenari"), "Stato di completamento assente.");
      assert(!kpis.textContent.includes(global.labels.ui.noMonteCarlo), "KPI Monte Carlo non popolati.");
      const cacheAfterFirstRun = global.MonteCarloGBM.getCacheStats();
      assert(cacheAfterFirstRun.size >= 1 && cacheAfterFirstRun.size <= cacheAfterFirstRun.maxEntries, "Risultato Monte Carlo non memorizzato in cache.");

      await global.runMonteCarloFromUi();
      assert(global.currentMonteCarlo.performance.cacheHit === true, "Cache Monte Carlo non riutilizzata.");

      initialInvestment.value = "11000";
      initialInvestment.dispatchEvent(new Event("blur"));

      assert(global.currentMonteCarlo === null, "Risultato Monte Carlo obsoleto ancora esposto.");
      assert(status.textContent === global.labels.ui.noMonteCarlo, "Stato Monte Carlo obsoleto.");
      assert(kpis.textContent.trim() === global.labels.ui.noMonteCarlo, "KPI Monte Carlo obsoleti.");
      assert(global.WealthPathCharts.chartRefs.monteCarlo === null, "Grafico percentile obsoleto.");
      assert(global.WealthPathCharts.chartRefs.histogram === null, "Istogramma obsoleto.");
      assert(global.MonteCarloGBM.getCacheStats().size === cacheAfterFirstRun.size, "Invalidazione UI ha eliminato inutilmente la cache.");

      singleTab.click();
      assert(singleTab.classList.contains("active"), "Scheda simulazione singola non attivabile.");
      horizon.value = "50";
      horizon.dispatchEvent(new Event("blur"));
      assert(global.currentSimulation.nominalValues.length === 601, "Serie a 50 anni incompleta.");
      assert(global.currentSimulation.nominalValues.every(Number.isFinite), "Serie a 50 anni contiene valori non finiti.");
      assert(global.WealthPathCharts.chartRefs.portfolio.data.labels.length <= global.WealthPathCharts.MAX_LINE_POINTS, "Grafico lungo non campionato.");
      assert(document.querySelectorAll("#monthlyTable tbody tr").length === 601, "Tabella mensile a 50 anni incompleta.");

      root.dataset.browserRegression = "passed:4";
      return [{ name: "struttura a schede e tabelle verticali", ok: true }, { name: "controlli retirement e fiscalità", ok: true }, { name: "invalidazione Monte Carlo dopo modifica input", ok: true }, { name: "rendering orizzonte massimo", ok: true }];
    } catch (error) {
      root.dataset.browserRegression = "failed";
      root.dataset.browserRegressionError = error.message;
      console.error(error);
      return [{ name: "regressione browser", ok: false, error: error.message }];
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { runBrowserRegressionTests(); });
  } else {
    setTimeout(runBrowserRegressionTests, 0);
  }

  global.runBrowserRegressionTests = runBrowserRegressionTests;
})(window);
