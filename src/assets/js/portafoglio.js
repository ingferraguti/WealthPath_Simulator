(function (global) {
  const V = global.WealthPathValidation;
  function createPrng(seed) {
    let state = (Number(seed) || 0) >>> 0;
    return function random() {
      state += 0x6D2B79F5;
      let t = Math.imul(state ^ (state >>> 15), state | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function normalRandom(random) {
    const u1 = Math.max(random(), Number.EPSILON);
    const u2 = Math.max(random(), Number.EPSILON);
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  function macroAdjustedAnnualReturn(asset, macroState, macroEnabled) {
    const base = global.marketData.annualizedReturns[asset] || 0;
    if (!macroEnabled || !macroState) return base;
    const beta = global.marketData.assetClassSensitivities[asset] || {};
    const cfg = global.marketData.macroDriftConfig;
    const realRate = V.toNumber(macroState.realRate, V.toNumber(macroState.policyRate, 0) - V.toNumber(macroState.inflation, 0));
    return base + V.toNumber(beta.inflationBeta, 0) * V.toNumber(macroState.inflation, 0) * cfg.inflationAlpha + V.toNumber(beta.policyRateBeta, 0) * V.toNumber(macroState.policyRate, 0) * cfg.policyRateAlpha + V.toNumber(beta.realRateBeta, 0) * realRate * cfg.realRateAlpha;
  }
  function gbmMonthlyMultiplier(asset, options) {
    options = options || {};
    const sigma = global.marketData.annualizedVolatility[asset] || 0;
    const mu = macroAdjustedAnnualReturn(asset, options.macroState, options.enableMacroScenario);
    const dt = 1 / 12;
    const z = normalRandom(options.random || Math.random);
    const multiplier = Math.exp((mu - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * z);
    return Number.isFinite(multiplier) && multiplier >= 0 ? multiplier : 1;
  }
  function fixedMonthlyMultiplier(asset) {
    return global.marketData.fixedMonthlyMultipliers[asset] || Math.pow(1 + (global.marketData.annualizedReturns[asset] || 0), 1 / 12);
  }
  function rebalancePortfolio(portfolio, allocation) {
    const total = Object.keys(portfolio).reduce((sum, asset) => sum + Math.max(0, V.toNumber(portfolio[asset], 0)), 0);
    global.marketData.assetClasses.forEach((asset) => { portfolio[asset] = total * (V.toNumber(allocation[asset], 0) / 100); });
    return portfolio;
  }
  function calculateContributionsSeries(initialInvestment, monthlyContribution, months) {
    initialInvestment = Math.max(0, V.toNumber(initialInvestment, 0));
    monthlyContribution = Math.max(0, V.toNumber(monthlyContribution, 0));
    months = Math.max(0, Math.round(V.toNumber(months, 0)));
    const data = [];
    for (let month = 0; month <= months; month += 1) data.push(initialInvestment + monthlyContribution * month);
    return data;
  }
  function calculateContribValue(state, month) {
    return Math.max(0, V.toNumber(state.initialInvestment, 0)) + Math.max(0, V.toNumber(state.monthlyContribution, 0)) * Math.max(0, Math.round(Number(month) || 0));
  }
  function simulatePortfolioPath(options) {
    options = options || {};
    const suppliedRandom = typeof options.random === "function" ? options.random : null;
    const settings = V.sanitizeSettings(options);
    const validation = V.validateSettings(settings);
    if (!validation.valid) throw new Error(validation.errors.join(" "));
    const months = Math.max(0, Math.round(V.toNumber(settings.timeHorizonYears, 0) * 12));
    const random = suppliedRandom || createPrng(settings.seed);
    const rebalanceEveryMonths = settings.rebalanceFrequencyPerYear > 0 ? Math.max(1, Math.round(12 / settings.rebalanceFrequencyPerYear)) : 0;
    const macroSeries = settings.enableMacroAdjustments ? global.buildMacroScenario(settings.selectedMacroScenario, months) : [];
    const portfolio = {};
    global.marketData.assetClasses.forEach((asset) => { portfolio[asset] = V.toNumber(settings.initialInvestment, 0) * V.toNumber(settings.allocation[asset], 0) / 100; });
    const nominalValues = [Object.values(portfolio).reduce((sum, value) => sum + value, 0)];
    const contributions = calculateContributionsSeries(V.toNumber(settings.initialInvestment, 0), V.toNumber(settings.monthlyContribution, 0), months);
    const realValues = [nominalValues[0]];
    let cumulativeInflation = 1;
    for (let month = 1; month <= months; month += 1) {
      global.marketData.assetClasses.forEach((asset) => { portfolio[asset] += V.toNumber(settings.monthlyContribution, 0) * V.toNumber(settings.allocation[asset], 0) / 100; });
      if (rebalanceEveryMonths > 0 && month % rebalanceEveryMonths === 0) rebalancePortfolio(portfolio, settings.allocation);
      const macroState = macroSeries[month] || null;
      global.marketData.assetClasses.forEach((asset) => {
        const multiplier = settings.fixedReturnsMode ? fixedMonthlyMultiplier(asset) : gbmMonthlyMultiplier(asset, { random, macroState, enableMacroScenario: settings.enableMacroAdjustments });
        portfolio[asset] *= Number.isFinite(multiplier) ? multiplier : 1;
      });
       const nominal = Object.values(portfolio).reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
      nominalValues.push(nominal);
      if (settings.enableMacroAdjustments && macroState) {
        // L'inflazione annua dello scenario è trasformata in inflazione mensile composta, assumendo distribuzione uniforme nell'anno: (1 + inflazione_annua)^(1/12) - 1.
        cumulativeInflation *= Math.pow(1 + V.toNumber(macroState.inflation, 0), 1 / 12);
        realValues.push(nominal / cumulativeInflation);
      } else {
        realValues.push(nominal);
      }
    }
    return { nominalValues, contributions, realValues: settings.enableMacroAdjustments ? realValues : [], macroSeries, finalValue: nominalValues[nominalValues.length - 1], finalRealValue: settings.enableMacroAdjustments ? realValues[realValues.length - 1] : null };
  }
  function calculatePortfolioValue(state, month) {
    const months = Math.max(0, Math.round(Number(month) || 0));
    const result = simulatePortfolioPath({ ...state, timeHorizonYears: months / 12 });
    return result.nominalValues[result.nominalValues.length - 1] || 0;
  }
  function validateAllocation(allocation) { return V.validateAllocation(allocation); }
  global.createPrng = createPrng;
  global.rngNormal = function () { return normalRandom(global.randomSeedManager ? global.randomSeedManager.random : Math.random); };
  global.normalRandom = normalRandom;
  global.gbmMonthlyMultiplier = gbmMonthlyMultiplier;
  global.fixedMonthlyMultiplier = fixedMonthlyMultiplier;
  global.rebalancePortfolio = rebalancePortfolio;
  global.calculateContributionsSeries = calculateContributionsSeries;
  global.calculateContribValue = calculateContribValue;
  global.simulatePortfolioPath = simulatePortfolioPath;
  global.calculatePortfolioValue = calculatePortfolioValue;
  global.validateAllocation = validateAllocation;
})(window);
