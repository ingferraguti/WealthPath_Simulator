(function (global) {
  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }
  function toNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  function clampNumber(value, fallback, min, max, integer) {
    const parsed = toNumber(value, fallback);
    const bounded = Math.min(Math.max(parsed, min), max);
    return integer ? Math.round(bounded) : bounded;
  }
  function toBoolean(value) {
    return value === true || value === 1 || value === "1" || value === "true";
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
    const initialInvestment = Number(settings.initialInvestment);
    const monthlyContribution = Number(settings.monthlyContribution);
    const years = Number(settings.timeHorizonYears);
    if (!Number.isFinite(initialInvestment) || initialInvestment < 0) errors.push("L'investimento iniziale deve essere maggiore o uguale a zero.");
    if (!Number.isFinite(monthlyContribution) || monthlyContribution < 0) errors.push("Il contributo mensile deve essere maggiore o uguale a zero.");
    if (!Number.isInteger(years) || years < 1 || years > md.defaults.maxTimeHorizonYears) errors.push(`L'orizzonte deve essere un numero intero compreso tra 1 e ${md.defaults.maxTimeHorizonYears} anni.`);
    const rebalance = Number(settings.rebalanceFrequencyPerYear);
    if (!md.allowedRebalanceFrequencies.includes(rebalance)) errors.push("La frequenza di ribilanciamento non è ammessa.");
    const mc = Number(settings.monteCarloScenarios);
    const targetCapital = Number(settings.targetCapital);
    if (!Number.isInteger(mc) || mc < md.defaults.monteCarloMinScenarios || mc > md.defaults.monteCarloMaxScenarios) errors.push(`Gli scenari Monte Carlo devono essere un numero intero tra ${md.defaults.monteCarloMinScenarios} e ${md.defaults.monteCarloMaxScenarios}.`);
    if (!Number.isFinite(targetCapital) || targetCapital < 0) errors.push("Il capitale obiettivo deve essere maggiore o uguale a zero.");
    if (!Number.isInteger(Number(settings.seed)) || Number(settings.seed) < 0 || Number(settings.seed) > 0xFFFFFFFF) errors.push("Il seed deve essere un intero compreso tra 0 e 4294967295.");
    if (!md.macroScenarioPresets[settings.selectedMacroScenario]) errors.push("Lo scenario macro selezionato non è valido.");
    const allocationValidation = validateAllocation(settings.allocation || {});
    errors.push(...allocationValidation.errors);
    return { valid: errors.length === 0, errors };
  }
  function sanitizeSettings(raw) {
    const md = global.marketData;
    raw = raw || {};
    const result = {
      schemaVersion: md.schemaVersion,
      allocation: {},
      initialInvestment: clampNumber(raw.initialInvestment, md.defaults.initialInvestment, 0, Number.MAX_SAFE_INTEGER, false),
      monthlyContribution: clampNumber(raw.monthlyContribution, md.defaults.monthlyContribution, 0, Number.MAX_SAFE_INTEGER, false),
      timeHorizonYears: clampNumber(raw.timeHorizonYears, md.defaults.timeHorizonYears, 1, md.defaults.maxTimeHorizonYears, true),
      rebalanceFrequencyPerYear: Number(raw.rebalanceFrequencyPerYear),
      fixedReturnsMode: toBoolean(raw.fixedReturnsMode),
      enableMacroAdjustments: toBoolean(raw.enableMacroAdjustments),
      selectedMacroScenario: md.macroScenarioPresets[raw.selectedMacroScenario] ? raw.selectedMacroScenario : md.defaults.selectedMacroScenario,
      monteCarloScenarios: clampNumber(raw.monteCarloScenarios, md.defaults.monteCarloScenarios, md.defaults.monteCarloMinScenarios, md.defaults.monteCarloMaxScenarios, true),
      targetCapital: clampNumber(raw.targetCapital, md.defaults.targetCapital, 0, Number.MAX_SAFE_INTEGER, false),
      seed: clampNumber(raw.seed, md.defaults.seed, 0, 0xFFFFFFFF, true)
    };
    md.assetClasses.forEach((asset) => {
      result.allocation[asset] = round2(clampNumber(
        raw.allocation && raw.allocation[asset] !== undefined ? raw.allocation[asset] : md.allocation[asset],
        md.allocation[asset],
        0,
        100,
        false
      ));
    });
    if (!md.allowedRebalanceFrequencies.includes(result.rebalanceFrequencyPerYear)) result.rebalanceFrequencyPerYear = md.defaults.rebalanceFrequencyPerYear;
    return result;
  }
  function redistributeAllocation(allocation, changedAsset, value) {
    const assets = global.marketData.assetClasses;
    const result = {};
    const changedValue = round2(clampNumber(value, 0, 0, 100, false));
    const otherAssets = assets.filter((asset) => asset !== changedAsset);
    const remaining = round2(100 - changedValue);
    const otherTotal = otherAssets.reduce((sum, asset) => sum + clampNumber(allocation && allocation[asset], 0, 0, 100, false), 0);
    let assigned = 0;

    result[changedAsset] = changedValue;
    otherAssets.forEach((asset, index) => {
      const isLast = index === otherAssets.length - 1;
      const weight = otherTotal > 0
        ? clampNumber(allocation && allocation[asset], 0, 0, 100, false) / otherTotal
        : 1 / otherAssets.length;
      const share = isLast ? round2(remaining - assigned) : round2(remaining * weight);
      result[asset] = Math.max(0, share);
      assigned = round2(assigned + result[asset]);
    });

    return result;
  }
  function isSafeSeries(values) {
    return Array.isArray(values) && values.every((value) => Number.isFinite(value));
  }
  global.WealthPathValidation = { isFiniteNumber, toNumber, clampNumber, toBoolean, round2, allocationTotal, validateAllocation, validateSettings, sanitizeSettings, redistributeAllocation, isSafeSeries };
})(window);
