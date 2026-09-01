(function (global) {
  const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  let currentSettings = null;
  let currentSimulation = null;
  let currentStatistics = null;
  let currentMonteCarlo = null;
  let pendingAllocationRender = null;
  function pct(value) { return `${((Number(value) || 0) * 100).toFixed(2)}%`; }
  function money(value) { return euro.format(Number(value) || 0); }
  function byId(id) { return document.getElementById(id); }
  function setStatus(message, type) {
    const el = byId("statusMessage"); if (!el) return;
    el.className = `alert alert-${type || "info"} py-2`;
    el.textContent = message;
    el.classList.toggle("d-none", !message);
  }
  function renderAllocationControls() {
    const box = byId("allocationControls"); if (!box) return;
    box.innerHTML = "";
    global.marketData.assetClasses.forEach((asset) => {
      const group = document.createElement("div"); group.className = "form-group";
      group.innerHTML = `<label class="font-weight-bold" for="alloc-${asset}">${global.labels.assets[asset]} <span id="alloc-label-${asset}">${currentSettings.allocation[asset]}%</span></label><input id="alloc-${asset}" class="custom-range" type="range" min="0" max="100" step="0.01" value="${currentSettings.allocation[asset]}"><input id="alloc-number-${asset}" class="form-control form-control-sm mt-1" type="number" inputmode="decimal" min="0" max="100" step="0.01" value="${currentSettings.allocation[asset]}" required>`;
      box.appendChild(group);
      [group.querySelector(`#alloc-${asset}`), group.querySelector(`#alloc-number-${asset}`)].forEach((input) => input.addEventListener("input", (event) => updateAllocation(asset, Number(event.target.value))));
    });
  }
  function updateAllocation(changedAsset, value) {
    currentSettings.allocation = global.WealthPathValidation.redistributeAllocation(currentSettings.allocation, changedAsset, value);
    clearMonteCarloState();
    syncFormValues();
    if (pendingAllocationRender !== null) return;
    const schedule = typeof global.requestAnimationFrame === "function" ? global.requestAnimationFrame.bind(global) : (callback) => global.setTimeout(callback, 0);
    pendingAllocationRender = schedule(() => {
      pendingAllocationRender = null;
      renderDashboard({ rerunMonteCarlo: false, preserveControls: true });
    });
  }
  function syncFormValues() {
    if (!currentSettings) return;
    [["initialInvestment", "initialInvestment"], ["monthlyContribution", "monthlyContribution"], ["timeHorizonYears", "timeHorizonYears"], ["rebalanceFrequencyPerYear", "rebalanceFrequencyPerYear"], ["monteCarloScenarios", "monteCarloScenarios"], ["targetCapital", "targetCapital"], ["simulationSeed", "seed"], ["macroScenarioSelect", "selectedMacroScenario"]].forEach(([id, key]) => { const el = byId(id); if (el) el.value = currentSettings[key]; });
    ["fixedReturnsMode", "enableMacroAdjustments", "enableRetirement"].forEach((key) => { const el = byId(key); if (el) el.checked = Boolean(currentSettings[key]); });
    const withdrawalRate = byId("retirementWithdrawalRate"); if (withdrawalRate) withdrawalRate.value = (currentSettings.annualWithdrawalRate * 100).toFixed(2);
    const taxRate = byId("rebalanceTaxRate"); if (taxRate) taxRate.value = (currentSettings.capitalGainsTaxRate * 100).toFixed(2);
    const retirementSettings = byId("retirementSettings"); if (retirementSettings) retirementSettings.classList.toggle("d-none", !currentSettings.enableRetirement);
    global.marketData.assetClasses.forEach((asset) => {
      const range = byId(`alloc-${asset}`); const number = byId(`alloc-number-${asset}`); const label = byId(`alloc-label-${asset}`);
      if (range) range.value = currentSettings.allocation[asset]; if (number) number.value = currentSettings.allocation[asset]; if (label) label.textContent = `${currentSettings.allocation[asset]}%`;
    });
  }
  function readSettingsFromForm() {
    currentSettings.initialInvestment = Number(byId("initialInvestment").value);
    currentSettings.monthlyContribution = Number(byId("monthlyContribution").value);
    currentSettings.timeHorizonYears = Number(byId("timeHorizonYears").value);
    currentSettings.rebalanceFrequencyPerYear = Number(byId("rebalanceFrequencyPerYear").value);
    currentSettings.fixedReturnsMode = byId("fixedReturnsMode").checked;
    currentSettings.enableMacroAdjustments = byId("enableMacroAdjustments").checked;
    currentSettings.enableRetirement = byId("enableRetirement").checked;
    currentSettings.annualWithdrawalRate = Number(byId("retirementWithdrawalRate").value) / 100;
    currentSettings.capitalGainsTaxRate = Number(byId("rebalanceTaxRate").value) / 100;
    currentSettings.selectedMacroScenario = byId("macroScenarioSelect").value;
    currentSettings.monteCarloScenarios = Number(byId("monteCarloScenarios").value);
    currentSettings.targetCapital = Number(byId("targetCapital").value);
    currentSettings.seed = Number(byId("simulationSeed").value);
    return global.WealthPathValidation.sanitizeSettings(currentSettings);
  }
  function updateKpis() {
    byId("kpiFinalValue").textContent = money(currentSimulation.finalValue);
    byId("kpiContributions").textContent = money(currentSimulation.contributions[currentSimulation.contributions.length - 1]);
    byId("kpiWithdrawals").textContent = money(currentStatistics.totalWithdrawals);
    byId("kpiRebalanceTaxes").textContent = money(currentStatistics.totalRebalanceTaxes);
    byId("kpiPerformance").textContent = money(currentStatistics.netProfit);
    byId("kpiPerformancePct").textContent = pct(currentStatistics.totalReturn);
    byId("kpiRealFinalValue").textContent = currentSimulation.finalRealValue === null ? "Scenario macro disattivato" : money(currentSimulation.finalRealValue);
    byId("riskAnnualizedReturn").textContent = pct(currentStatistics.annualizedReturn);
    byId("riskAnnualizedVolatility").textContent = pct(currentStatistics.annualizedVolatility);
    byId("riskCorrelationVolatility").textContent = pct(currentStatistics.correlationAdjustedVolatility);
    byId("riskDiversificationBenefit").textContent = pct(currentStatistics.diversificationBenefit);
    byId("riskMaxDrawdown").textContent = `${pct(currentStatistics.maxDrawdown)} (mese ${currentStatistics.maxDrawdownMonth})`;
    byId("riskWorstMonth").textContent = pct(currentStatistics.worstMonthlyReturn);
    byId("riskPositiveMonths").textContent = pct(currentStatistics.positiveMonths);
    byId("riskMoneyWeightedReturn").textContent = pct(currentStatistics.xirr);
    byId("simulationModeLabel").textContent = currentSettings.fixedReturnsMode ? global.labels.ui.fixedReturns : global.labels.ui.gbmReturns;
    byId("macroSelectedLabel").textContent = global.marketData.macroScenarioPresets[currentSettings.selectedMacroScenario].label;
    byId("seedUsedLabel").textContent = currentSettings.seed;
  }
  function renderMonteCarloKpis() {
    const box = byId("monteCarloKpis"); if (!box) return;
    if (!currentMonteCarlo) { box.innerHTML = `<div class="col-12 text-muted">${global.labels.ui.noMonteCarlo}</div>`; return; }
    const s = currentMonteCarlo.stats;
    const items = [["Valore finale medio", money(s.meanFinal)], ["Valore finale mediano", money(s.medianFinal)], ["P5", money(s.p5)], ["P25", money(s.p25)], ["P75", money(s.p75)], ["P95", money(s.p95)], ["Probabilità obiettivo", pct(s.targetProbability)], ["Probabilità sotto versato", pct(s.lossProbability)], ["Capitale versato", money(s.totalContributed)], ["Prelievi medi", money(s.meanTotalWithdrawals)], ["Tasse medie da ribilanciamento", money(s.meanRebalanceTaxes)], ["Mediana - versato", money(s.medianMinusContributed)]];
    box.innerHTML = items.map(([label, value]) => `<div class="col-sm-6 col-lg-3 mb-3"><div class="border rounded p-3 h-100"><div class="small text-muted">${label}</div><div class="h5 mb-0">${value}</div></div></div>`).join("");
  }
  function clearMonteCarloState(options) {
    options = options || {};
    currentMonteCarlo = null;
    global.currentMonteCarlo = null;
    if (options.clearCache && global.MonteCarloGBM && typeof global.MonteCarloGBM.clearCache === "function") global.MonteCarloGBM.clearCache();
    if (global.WealthPathCharts && typeof global.WealthPathCharts.clearMonteCarloCharts === "function") global.WealthPathCharts.clearMonteCarloCharts();
    const status = byId("monteCarloStatus");
    if (status) status.textContent = global.labels.ui.noMonteCarlo;
    renderMonteCarloKpis();
  }
  function nextPaint() {
    return new Promise((resolve) => {
      if (typeof global.requestAnimationFrame === "function") global.requestAnimationFrame(() => resolve());
      else global.setTimeout(resolve, 0);
    });
  }
  async function runMonteCarloFromUi() {
    const status = byId("monteCarloStatus"); if (status) status.textContent = "Elaborazione in corso...";
    const button = byId("runMonteCarloButton");
    if (button) button.disabled = true;
    currentSettings = readSettingsFromForm();
    const validation = global.WealthPathValidation.validateSettings(currentSettings);
    if (!validation.valid) {
      if (status) status.textContent = validation.errors.join(" ");
      setStatus(validation.errors.join(" "), "danger");
      if (button) button.disabled = false;
      return null;
    }
    await nextPaint();
    try {
      currentMonteCarlo = global.runMonteCarloGBM({ ...currentSettings, nScenarios: currentSettings.monteCarloScenarios });
      global.currentMonteCarlo = currentMonteCarlo;
      renderMonteCarloKpis();
      global.WealthPathCharts.renderMonteCarloChart(currentMonteCarlo);
      global.WealthPathCharts.renderHistogramChart(currentMonteCarlo);
      const cacheLabel = currentMonteCarlo.performance && currentMonteCarlo.performance.cacheHit ? " (cache)" : "";
      if (status) status.textContent = `Monte Carlo completato con ${currentMonteCarlo.pathsCount} scenari${cacheLabel}.`;
      global.WealthPathSettings.saveSettings(currentSettings);
      return currentMonteCarlo;
    } catch (error) {
      clearMonteCarloState();
      const message = error && error.message ? error.message : "Errore durante la simulazione Monte Carlo.";
      if (status) status.textContent = message;
      setStatus(message, "danger");
      return null;
    } finally {
      if (button) button.disabled = false;
    }
  }
  function renderDashboard(options) {
    options = options || {};
    if (!currentSettings) currentSettings = global.WealthPathSettings.loadSettings();
    if (!options.preserveControls) renderAllocationControls();
    currentSettings = global.WealthPathValidation.sanitizeSettings(currentSettings);
    const validation = global.WealthPathValidation.validateSettings(currentSettings);
    if (!validation.valid) { setStatus(validation.errors.join(" "), "danger"); return; }
    setStatus(global.labels.ui.validationOk, "success");
    global.randomSeedManager.setSeed(currentSettings.seed);
    global.setMacroScenario(currentSettings.selectedMacroScenario); global.setMacroEnabled(currentSettings.enableMacroAdjustments); global.rebuildMacroScenario(currentSettings.timeHorizonYears * 12);
    currentSimulation = global.simulatePortfolioPath(currentSettings);
    currentStatistics = global.PortfolioStatistics.calculatePortfolioStatistics(currentSimulation.nominalValues, currentSimulation.contributions, currentSettings.allocation, currentSimulation.withdrawals, currentSimulation.rebalanceTaxes);
    global.currentSettings = currentSettings; global.currentSimulation = currentSimulation; global.currentStatistics = currentStatistics;
    syncFormValues(); updateKpis();
    global.WealthPathCharts.renderAllocationChart(currentSettings.allocation);
    global.WealthPathCharts.renderPortfolioChart(currentSimulation, currentSettings.enableMacroAdjustments);
    global.renderMonthlyTable(currentSimulation); global.renderAnnualTable(currentSimulation);
    global.WealthPathSettings.saveSettings(currentSettings);
    if (options.rerunMonteCarlo && currentMonteCarlo) runMonteCarloFromUi(); else renderMonteCarloKpis();
  }
  function resetDefaults() { currentSettings = global.WealthPathSettings.defaultSettings(); clearMonteCarloState(); renderDashboard(); }
  function exportConfig() { global.WealthPathSettings.downloadConfig(currentSettings); }
  function importConfigFile(file) {
    const reader = new FileReader();
    reader.onload = function () { const result = global.WealthPathSettings.importSettings(String(reader.result || "")); if (result.success) { currentSettings = result.settings; clearMonteCarloState(); renderDashboard(); setStatus(global.labels.ui.importSuccess, "success"); } else setStatus(result.errors.join(" "), "danger"); };
    reader.readAsText(file);
  }
  function randomizePerformance() { currentSettings.seed = global.randomSeedManager.regenerateSeed(); clearMonteCarloState(); renderDashboard({ rerunMonteCarlo: false }); }
  function setupEvents() {
    currentSettings = global.WealthPathSettings.loadSettings();
    const applySimulationSettings = () => { currentSettings = readSettingsFromForm(); clearMonteCarloState(); renderDashboard(); };
    const applyMonteCarloSettings = () => { currentSettings = readSettingsFromForm(); syncFormValues(); clearMonteCarloState(); global.WealthPathSettings.saveSettings(currentSettings); };
    ["initialInvestment", "monthlyContribution", "timeHorizonYears", "simulationSeed", "retirementWithdrawalRate", "rebalanceTaxRate"].forEach((id) => byId(id).addEventListener("blur", applySimulationSettings));
    ["rebalanceFrequencyPerYear", "fixedReturnsMode", "enableMacroAdjustments", "macroScenarioSelect", "enableRetirement"].forEach((id) => byId(id).addEventListener("change", applySimulationSettings));
    ["monteCarloScenarios", "targetCapital"].forEach((id) => byId(id).addEventListener("blur", applyMonteCarloSettings));
    byId("runMonteCarloButton").addEventListener("click", runMonteCarloFromUi);
    byId("resetDefaultsButton").addEventListener("click", resetDefaults);
    byId("exportConfigButton").addEventListener("click", exportConfig);
    byId("importConfigButton").addEventListener("click", () => byId("importConfigInput").click());
    byId("importConfigInput").addEventListener("change", (event) => { if (event.target.files[0]) importConfigFile(event.target.files[0]); event.target.value = ""; });
    byId("generateSeedButton").addEventListener("click", () => { currentSettings.seed = global.randomSeedManager.regenerateSeed(); clearMonteCarloState(); renderDashboard(); });
    byId("applySeedButton").addEventListener("click", () => { currentSettings.seed = Number(byId("simulationSeed").value); clearMonteCarloState(); renderDashboard(); });
    byId("downloadPdfButton").addEventListener("click", () => global.downloadPDF());
    renderDashboard();
  }
  document.addEventListener("DOMContentLoaded", setupEvents);
  global.renderDashboard = renderDashboard;
  global.runMonteCarloFromUi = runMonteCarloFromUi;
  global.clearMonteCarloState = clearMonteCarloState;
  global.randomizePerformance = randomizePerformance;
})(window);
