(function (global) {
  const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  let currentSettings = null;
  let currentSimulation = null;
  let currentStatistics = null;
  let currentMonteCarlo = null;
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
      group.innerHTML = `<label class="font-weight-bold" for="alloc-${asset}">${global.labels.assets[asset]} <span id="alloc-label-${asset}">${currentSettings.allocation[asset]}%</span></label><input id="alloc-${asset}" class="custom-range" type="range" min="0" max="100" step="1" value="${currentSettings.allocation[asset]}"><input id="alloc-number-${asset}" class="form-control form-control-sm mt-1" type="number" min="0" max="100" step="1" value="${currentSettings.allocation[asset]}">`;
      box.appendChild(group);
      [group.querySelector(`#alloc-${asset}`), group.querySelector(`#alloc-number-${asset}`)].forEach((input) => input.addEventListener("input", (event) => updateAllocation(asset, Number(event.target.value), event.target.id)));
    });
  }
  function updateAllocation(changedAsset, value, sourceId) {
    const assets = global.marketData.assetClasses;
    const clamped = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    const previous = currentSettings.allocation[changedAsset];
    currentSettings.allocation[changedAsset] = clamped;
    const delta = clamped - previous;
    const others = assets.filter((asset) => asset !== changedAsset);
    const otherTotal = others.reduce((sum, asset) => sum + currentSettings.allocation[asset], 0);
    if (otherTotal <= 0 && delta > 0) {
      currentSettings.allocation[changedAsset] = previous;
    } else {
      let remainingDelta = delta;
      others.forEach((asset, index) => {
        const share = index === others.length - 1 ? remainingDelta : Math.round((delta * (currentSettings.allocation[asset] / otherTotal)) || 0);
        currentSettings.allocation[asset] = Math.max(0, currentSettings.allocation[asset] - share);
        remainingDelta -= share;
      });
    }
    const total = global.WealthPathValidation.allocationTotal(currentSettings.allocation);
    const last = others[others.length - 1] || changedAsset;
    currentSettings.allocation[last] += Math.round(100 - total);
    syncFormValues();
    renderDashboard({ rerunMonteCarlo: false, preserveControls: true });
  }
  function syncFormValues() {
    if (!currentSettings) return;
    [["initialInvestment", "initialInvestment"], ["monthlyContribution", "monthlyContribution"], ["timeHorizonYears", "timeHorizonYears"], ["rebalanceFrequencyPerYear", "rebalanceFrequencyPerYear"], ["monteCarloScenarios", "monteCarloScenarios"], ["targetCapital", "targetCapital"], ["simulationSeed", "seed"], ["macroScenarioSelect", "selectedMacroScenario"]].forEach(([id, key]) => { const el = byId(id); if (el) el.value = currentSettings[key]; });
    ["fixedReturnsMode", "enableMacroAdjustments"].forEach((key) => { const el = byId(key); if (el) el.checked = Boolean(currentSettings[key]); });
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
    currentSettings.selectedMacroScenario = byId("macroScenarioSelect").value;
    currentSettings.monteCarloScenarios = Number(byId("monteCarloScenarios").value);
    currentSettings.targetCapital = Number(byId("targetCapital").value);
    currentSettings.seed = Number(byId("simulationSeed").value);
    return global.WealthPathValidation.sanitizeSettings(currentSettings);
  }
  function updateKpis() {
    byId("kpiFinalValue").textContent = money(currentSimulation.finalValue);
    byId("kpiContributions").textContent = money(currentSimulation.contributions[currentSimulation.contributions.length - 1]);
    byId("kpiPerformance").textContent = money(currentSimulation.finalValue - currentSimulation.contributions[currentSimulation.contributions.length - 1]);
    byId("kpiPerformancePct").textContent = pct(currentStatistics.totalReturn);
    byId("kpiRealFinalValue").textContent = currentSimulation.finalRealValue === null ? "Scenario macro disattivato" : money(currentSimulation.finalRealValue);
    byId("riskAnnualizedReturn").textContent = pct(currentStatistics.annualizedReturn);
    byId("riskAnnualizedVolatility").textContent = pct(currentStatistics.annualizedVolatility);
    byId("riskMaxDrawdown").textContent = `${pct(currentStatistics.maxDrawdown)} (mese ${currentStatistics.maxDrawdownMonth})`;
    byId("riskWorstMonth").textContent = pct(currentStatistics.worstMonthlyReturn);
    byId("riskPositiveMonths").textContent = pct(currentStatistics.positiveMonths);
    byId("riskScore").textContent = `${currentStatistics.riskScore.toFixed(2)} / 5`;
    byId("simulationModeLabel").textContent = currentSettings.fixedReturnsMode ? global.labels.ui.fixedReturns : global.labels.ui.gbmReturns;
    byId("macroSelectedLabel").textContent = global.marketData.macroScenarioPresets[currentSettings.selectedMacroScenario].label;
    byId("seedUsedLabel").textContent = currentSettings.seed;
  }
  function renderMonteCarloKpis() {
    const box = byId("monteCarloKpis"); if (!box) return;
    if (!currentMonteCarlo) { box.innerHTML = `<div class="col-12 text-muted">${global.labels.ui.noMonteCarlo}</div>`; return; }
    const s = currentMonteCarlo.stats;
    const items = [["Valore finale medio", money(s.meanFinal)], ["Valore finale mediano", money(s.medianFinal)], ["P5", money(s.p5)], ["P25", money(s.p25)], ["P75", money(s.p75)], ["P95", money(s.p95)], ["Probabilità obiettivo", pct(s.targetProbability)], ["Probabilità sotto versato", pct(s.lossProbability)], ["Capitale versato", money(s.totalContributed)], ["Mediana - versato", money(s.medianMinusContributed)]];
    box.innerHTML = items.map(([label, value]) => `<div class="col-sm-6 col-lg-3 mb-3"><div class="border rounded p-3 h-100"><div class="small text-muted">${label}</div><div class="h5 mb-0">${value}</div></div></div>`).join("");
  }
  function runMonteCarloFromUi() {
    const status = byId("monteCarloStatus"); if (status) status.textContent = "Elaborazione in corso...";
    currentSettings = readSettingsFromForm();
    const validation = global.WealthPathValidation.validateSettings(currentSettings);
    if (!validation.valid) { if (status) status.textContent = validation.errors.join(" "); setStatus(validation.errors.join(" "), "danger"); return; }
    currentMonteCarlo = global.runMonteCarloGBM({ ...currentSettings, nScenarios: currentSettings.monteCarloScenarios });
    global.currentMonteCarlo = currentMonteCarlo;
    renderMonteCarloKpis();
    global.WealthPathCharts.renderMonteCarloChart(currentMonteCarlo);
    global.WealthPathCharts.renderHistogramChart(currentMonteCarlo);
    if (status) status.textContent = `Monte Carlo completato con ${currentMonteCarlo.pathsCount} scenari.`;
    global.WealthPathSettings.saveSettings(currentSettings);
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
    currentStatistics = global.PortfolioStatistics.calculatePortfolioStatistics(currentSimulation.nominalValues, currentSimulation.contributions, currentSettings.allocation);
    global.currentSettings = currentSettings; global.currentSimulation = currentSimulation; global.currentStatistics = currentStatistics;
    syncFormValues(); updateKpis();
    global.WealthPathCharts.renderAllocationChart(currentSettings.allocation);
    global.WealthPathCharts.renderPortfolioChart(currentSimulation, currentSettings.enableMacroAdjustments);
    global.renderMonthlyTable(currentSimulation); global.renderAnnualTable(currentSimulation);
    global.WealthPathSettings.saveSettings(currentSettings);
    if (options.rerunMonteCarlo && currentMonteCarlo) runMonteCarloFromUi(); else renderMonteCarloKpis();
  }
  function resetDefaults() { currentSettings = global.WealthPathSettings.defaultSettings(); currentMonteCarlo = null; renderDashboard(); }
  function exportConfig() { global.WealthPathSettings.downloadConfig(currentSettings); }
  function importConfigFile(file) {
    const reader = new FileReader();
    reader.onload = function () { const result = global.WealthPathSettings.importSettings(String(reader.result || "")); if (result.success) { currentSettings = result.settings; currentMonteCarlo = null; renderDashboard(); setStatus(global.labels.ui.importSuccess, "success"); } else setStatus(result.errors.join(" "), "danger"); };
    reader.readAsText(file);
  }
  function randomizePerformance() { currentSettings.seed = global.randomSeedManager.regenerateSeed(); renderDashboard({ rerunMonteCarlo: false }); }
  function setupEvents() {
    currentSettings = global.WealthPathSettings.loadSettings();
    ["initialInvestment", "monthlyContribution", "timeHorizonYears", "rebalanceFrequencyPerYear", "fixedReturnsMode", "enableMacroAdjustments", "macroScenarioSelect", "simulationSeed"].forEach((id) => byId(id).addEventListener("change", () => { currentSettings = readSettingsFromForm(); currentMonteCarlo = null; renderDashboard(); }));
    ["monteCarloScenarios", "targetCapital"].forEach((id) => byId(id).addEventListener("change", () => { currentSettings = readSettingsFromForm(); currentMonteCarlo = null; renderMonteCarloKpis(); global.WealthPathSettings.saveSettings(currentSettings); }));
    byId("runMonteCarloButton").addEventListener("click", runMonteCarloFromUi);
    byId("resetDefaultsButton").addEventListener("click", resetDefaults);
    byId("exportConfigButton").addEventListener("click", exportConfig);
    byId("importConfigButton").addEventListener("click", () => byId("importConfigInput").click());
    byId("importConfigInput").addEventListener("change", (event) => { if (event.target.files[0]) importConfigFile(event.target.files[0]); event.target.value = ""; });
    byId("generateSeedButton").addEventListener("click", () => { currentSettings.seed = global.randomSeedManager.regenerateSeed(); renderDashboard(); });
    byId("applySeedButton").addEventListener("click", () => { currentSettings.seed = Number(byId("simulationSeed").value); renderDashboard(); });
    byId("downloadPdfButton").addEventListener("click", () => global.downloadPDF());
    renderDashboard();
  }
  document.addEventListener("DOMContentLoaded", setupEvents);
  global.renderDashboard = renderDashboard;
  global.runMonteCarloFromUi = runMonteCarloFromUi;
  global.randomizePerformance = randomizePerformance;
})(window);
