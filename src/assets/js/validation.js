(function (global) {
  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }
  function toNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }
  function allocationTotal(allocation) {
    return Object.keys(allocation || {}).reduce((sum, key) => sum + toNumber(allocation[key], 0), 0);
  }
  function validateAllocation(allocation) {
    const errors = [];
    const assets = global.marketData.assetClasses;
    assets.forEach((asset) => {
      const value = toNumber(allocation && allocation[asset], NaN);
      if (!Number.isFinite(value) || value < 0 || value > 100) errors.push(`${global.labels.assets[asset]} deve essere tra 0 e 100%.`);
    });
    if (Math.abs(allocationTotal(allocation) - 100) > 0.01) errors.push("La somma dell'asset allocation deve essere pari al 100%.");
    return { valid: errors.length === 0, errors };
  }
  function validateSettings(settings) {
    const md = global.marketData;
    const errors = [];
    if (toNumber(settings.initialInvestment, NaN) < 0) errors.push("L'investimento iniziale deve essere maggiore o uguale a zero.");
    if (toNumber(settings.monthlyContribution, NaN) < 0) errors.push("Il contributo mensile deve essere maggiore o uguale a zero.");
    const years = toNumber(settings.timeHorizonYears, NaN);
    if (!Number.isFinite(years) || years <= 0 || years > md.defaults.maxTimeHorizonYears) errors.push(`L'orizzonte deve essere compreso tra 1 e ${md.defaults.maxTimeHorizonYears} anni.`);
    const rebalance = Number(settings.rebalanceFrequencyPerYear);
    if (!md.allowedRebalanceFrequencies.includes(rebalance)) errors.push("La frequenza di ribilanciamento non è ammessa.");
    const mc = toNumber(settings.monteCarloScenarios, NaN);
    if (!Number.isFinite(mc) || mc < md.defaults.monteCarloMinScenarios || mc > md.defaults.monteCarloMaxScenarios) errors.push(`Gli scenari Monte Carlo devono essere tra ${md.defaults.monteCarloMinScenarios} e ${md.defaults.monteCarloMaxScenarios}.`);
    if (toNumber(settings.targetCapital, NaN) < 0) errors.push("Il capitale obiettivo deve essere maggiore o uguale a zero.");
    if (!md.macroScenarioPresets[settings.selectedMacroScenario]) errors.push("Lo scenario macro selezionato non è valido.");
    const allocationValidation = validateAllocation(settings.allocation || {});
    errors.push(...allocationValidation.errors);
    return { valid: errors.length === 0, errors };
  }
  function sanitizeSettings(raw) {
    const md = global.marketData;
    const result = {
      schemaVersion: md.schemaVersion,
      allocation: {},
      initialInvestment: toNumber(raw.initialInvestment, md.defaults.initialInvestment),
      monthlyContribution: toNumber(raw.monthlyContribution, md.defaults.monthlyContribution),
      timeHorizonYears: Math.round(toNumber(raw.timeHorizonYears, md.defaults.timeHorizonYears)),
      rebalanceFrequencyPerYear: Number(raw.rebalanceFrequencyPerYear),
      fixedReturnsMode: Boolean(raw.fixedReturnsMode),
      enableMacroAdjustments: Boolean(raw.enableMacroAdjustments),
      selectedMacroScenario: raw.selectedMacroScenario || md.defaults.selectedMacroScenario,
      monteCarloScenarios: Math.round(toNumber(raw.monteCarloScenarios, md.defaults.monteCarloScenarios)),
      targetCapital: toNumber(raw.targetCapital, md.defaults.targetCapital),
      seed: Math.max(0, Math.floor(toNumber(raw.seed, md.defaults.seed)))
    };
    md.assetClasses.forEach((asset) => { result.allocation[asset] = round2(raw.allocation && raw.allocation[asset] !== undefined ? raw.allocation[asset] : md.allocation[asset]); });
    if (!md.allowedRebalanceFrequencies.includes(result.rebalanceFrequencyPerYear)) result.rebalanceFrequencyPerYear = md.defaults.rebalanceFrequencyPerYear;
    return result;
  }
  function isSafeSeries(values) {
    return Array.isArray(values) && values.every((value) => Number.isFinite(value));
  }
  global.WealthPathValidation = { isFiniteNumber, toNumber, round2, allocationTotal, validateAllocation, validateSettings, sanitizeSettings, isSafeSeries };
})(window);
