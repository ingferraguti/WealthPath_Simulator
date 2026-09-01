(function (global) {
  const V = global.WealthPathValidation;

  function createPrng(seed) {
    let state = (Number(seed) || 0) >>> 0;
    return function random() {
      state += 0x6D2B79F5;
      let value = Math.imul(state ^ (state >>> 15), state | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function normalRandom(random) {
    const u1 = Math.max(random(), Number.EPSILON);
    const u2 = Math.max(random(), Number.EPSILON);
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  function createNormalGenerator(random) {
    let spare = null;
    return function nextNormal() {
      if (spare !== null) {
        const value = spare;
        spare = null;
        return value;
      }
      const u1 = Math.max(random(), Number.EPSILON);
      const u2 = Math.max(random(), Number.EPSILON);
      const radius = Math.sqrt(-2 * Math.log(u1));
      const angle = 2 * Math.PI * u2;
      spare = radius * Math.sin(angle);
      return radius * Math.cos(angle);
    };
  }

  function choleskyDecomposition(matrix) {
    if (!Array.isArray(matrix) || !matrix.length || matrix.some((row) => !Array.isArray(row) || row.length !== matrix.length)) return null;
    const size = matrix.length;
    const lower = Array.from({ length: size }, () => new Float64Array(size));
    for (let row = 0; row < size; row += 1) {
      for (let column = 0; column <= row; column += 1) {
        const raw = Number(matrix[row][column]);
        const mirror = Number(matrix[column][row]);
        if (!Number.isFinite(raw) || !Number.isFinite(mirror) || Math.abs(raw - mirror) > 1e-10) return null;
        let residual = raw;
        for (let index = 0; index < column; index += 1) residual -= lower[row][index] * lower[column][index];
        if (row === column) {
          if (residual <= 1e-12) return null;
          lower[row][column] = Math.sqrt(residual);
        } else {
          lower[row][column] = residual / lower[column][column];
        }
      }
    }
    return lower;
  }

  function correlatedStandardNormals(nextNormal, cholesky) {
    const independent = new Float64Array(cholesky.length);
    const correlated = new Float64Array(cholesky.length);
    for (let index = 0; index < independent.length; index += 1) independent[index] = nextNormal();
    for (let row = 0; row < cholesky.length; row += 1) {
      let value = 0;
      for (let column = 0; column <= row; column += 1) value += cholesky[row][column] * independent[column];
      correlated[row] = value;
    }
    return correlated;
  }

  function macroAdjustedAnnualReturn(asset, macroState, macroEnabled) {
    const base = global.marketData.annualizedReturns[asset] || 0;
    if (!macroEnabled || !macroState) return base;
    const beta = global.marketData.assetClassSensitivities[asset] || {};
    const config = global.marketData.macroDriftConfig;
    const realRate = V.toNumber(macroState.realRate, V.toNumber(macroState.policyRate, 0) - V.toNumber(macroState.inflation, 0));
    return base
      + V.toNumber(beta.inflationBeta, 0) * V.toNumber(macroState.inflation, 0) * config.inflationAlpha
      + V.toNumber(beta.policyRateBeta, 0) * V.toNumber(macroState.policyRate, 0) * config.policyRateAlpha
      + V.toNumber(beta.realRateBeta, 0) * realRate * config.realRateAlpha;
  }

  function gbmMonthlyMultiplier(asset, options) {
    options = options || {};
    const sigma = global.marketData.annualizedVolatility[asset] || 0;
    const mu = macroAdjustedAnnualReturn(asset, options.macroState, options.enableMacroScenario);
    const z = Number.isFinite(options.standardNormal) ? options.standardNormal : normalRandom(options.random || Math.random);
    const multiplier = Math.exp((mu - 0.5 * sigma * sigma) / 12 + sigma / Math.sqrt(12) * z);
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
    const initial = Math.max(0, V.toNumber(initialInvestment, 0));
    const monthly = Math.max(0, V.toNumber(monthlyContribution, 0));
    const count = Math.max(0, Math.round(V.toNumber(months, 0)));
    return Array.from({ length: count + 1 }, (_, month) => initial + monthly * month);
  }

  function calculateContribValue(state, month) {
    return Math.max(0, V.toNumber(state.initialInvestment, 0)) + Math.max(0, V.toNumber(state.monthlyContribution, 0)) * Math.max(0, Math.round(Number(month) || 0));
  }

  function prepareSimulation(options) {
    options = options || {};
    const suppliedRandom = typeof options.random === "function" ? options.random : null;
    const settings = V.sanitizeSettings(options);
    const validation = V.validateSettings(settings);
    if (!validation.valid) throw new Error(validation.errors.join(" "));
    const assets = global.marketData.assetClasses.slice();
    const assetCount = assets.length;
    const months = settings.timeHorizonYears * 12;
    const weights = Float64Array.from(assets, (asset) => V.toNumber(settings.allocation[asset], 0) / 100);
    const volatilities = Float64Array.from(assets, (asset) => Math.max(0, V.toNumber(global.marketData.annualizedVolatility[asset], 0)));
    const fixedMultipliers = Float64Array.from(assets, fixedMonthlyMultiplier);
    const macroSeries = settings.enableMacroAdjustments ? global.buildMacroScenario(settings.selectedMacroScenario, months) : [];
    const monthlyDrifts = new Float64Array((months + 1) * assetCount);
    for (let month = 1; month <= months; month += 1) {
      for (let assetIndex = 0; assetIndex < assetCount; assetIndex += 1) {
        monthlyDrifts[month * assetCount + assetIndex] = macroAdjustedAnnualReturn(assets[assetIndex], macroSeries[month] || null, settings.enableMacroAdjustments);
      }
    }
    const correlationMatrix = global.marketData.correlationMatrix;
    const isCorrelationMatrix = Array.isArray(correlationMatrix)
      && correlationMatrix.length === assetCount
      && correlationMatrix.every((row, rowIndex) => Array.isArray(row)
        && row.length === assetCount
        && row.every((value) => Number.isFinite(Number(value)) && Number(value) >= -1 && Number(value) <= 1)
        && Math.abs(Number(row[rowIndex]) - 1) < 1e-10);
    const correlationCholesky = isCorrelationMatrix ? choleskyDecomposition(correlationMatrix) : null;
    if (!correlationCholesky) throw new Error("La matrice di correlazione deve essere simmetrica e definita positiva.");
    return {
      settings,
      suppliedRandom,
      assets,
      assetCount,
      months,
      weights,
      volatilities,
      fixedMultipliers,
      monthlyDrifts,
      macroSeries,
      correlationCholesky,
      rebalanceEveryMonths: settings.rebalanceFrequencyPerYear > 0 ? Math.max(1, Math.round(12 / settings.rebalanceFrequencyPerYear)) : 0
    };
  }

  function simulateNominalPath(prepared, random) {
    const settings = prepared.settings;
    const portfolio = new Float64Array(prepared.assetCount);
    for (let assetIndex = 0; assetIndex < prepared.assetCount; assetIndex += 1) portfolio[assetIndex] = settings.initialInvestment * prepared.weights[assetIndex];
    const nominalValues = new Float64Array(prepared.months + 1);
    const realValues = settings.enableMacroAdjustments ? new Float64Array(prepared.months + 1) : null;
    nominalValues[0] = settings.initialInvestment;
    if (realValues) realValues[0] = settings.initialInvestment;
    const nextNormal = createNormalGenerator(random || prepared.suppliedRandom || createPrng(settings.seed));
    let cumulativeInflation = 1;
    for (let month = 1; month <= prepared.months; month += 1) {
      let total = 0;
      for (let assetIndex = 0; assetIndex < prepared.assetCount; assetIndex += 1) {
        portfolio[assetIndex] += settings.monthlyContribution * prepared.weights[assetIndex];
        total += portfolio[assetIndex];
      }
      if (prepared.rebalanceEveryMonths > 0 && month % prepared.rebalanceEveryMonths === 0) {
        for (let assetIndex = 0; assetIndex < prepared.assetCount; assetIndex += 1) portfolio[assetIndex] = total * prepared.weights[assetIndex];
      }
      const shocks = settings.fixedReturnsMode ? null : correlatedStandardNormals(nextNormal, prepared.correlationCholesky);
      total = 0;
      for (let assetIndex = 0; assetIndex < prepared.assetCount; assetIndex += 1) {
        let multiplier = prepared.fixedMultipliers[assetIndex];
        if (!settings.fixedReturnsMode) {
          const sigma = prepared.volatilities[assetIndex];
          const mu = prepared.monthlyDrifts[month * prepared.assetCount + assetIndex];
          multiplier = Math.exp((mu - 0.5 * sigma * sigma) / 12 + sigma / Math.sqrt(12) * shocks[assetIndex]);
        }
        portfolio[assetIndex] *= Number.isFinite(multiplier) && multiplier >= 0 ? multiplier : 1;
        total += Number.isFinite(portfolio[assetIndex]) ? portfolio[assetIndex] : 0;
      }
      nominalValues[month] = total;
      if (realValues) {
        const inflation = Math.max(-0.999999, V.toNumber(prepared.macroSeries[month] && prepared.macroSeries[month].inflation, 0));
        cumulativeInflation *= Math.pow(1 + inflation, 1 / 12);
        realValues[month] = total / cumulativeInflation;
      }
    }
    return { nominalValues, realValues, finalValue: nominalValues[prepared.months], finalRealValue: realValues ? realValues[prepared.months] : null };
  }

  function simulatePortfolioPath(options) {
    const prepared = prepareSimulation(options);
    const path = simulateNominalPath(prepared, prepared.suppliedRandom || createPrng(prepared.settings.seed));
    return {
      nominalValues: Array.from(path.nominalValues),
      contributions: calculateContributionsSeries(prepared.settings.initialInvestment, prepared.settings.monthlyContribution, prepared.months),
      realValues: path.realValues ? Array.from(path.realValues) : [],
      macroSeries: prepared.macroSeries,
      finalValue: path.finalValue,
      finalRealValue: path.finalRealValue
    };
  }

  function calculatePortfolioValue(state, month) {
    const months = Math.max(0, Math.round(Number(month) || 0));
    const result = simulatePortfolioPath({ ...state, timeHorizonYears: Math.max(1, Math.ceil(months / 12)) });
    return result.nominalValues[Math.min(months, result.nominalValues.length - 1)] || 0;
  }

  function validateAllocation(allocation) { return V.validateAllocation(allocation); }

  global.createPrng = createPrng;
  global.rngNormal = function () { return normalRandom(global.randomSeedManager ? global.randomSeedManager.random : Math.random); };
  global.normalRandom = normalRandom;
  global.createNormalGenerator = createNormalGenerator;
  global.choleskyDecomposition = choleskyDecomposition;
  global.correlatedStandardNormals = correlatedStandardNormals;
  global.gbmMonthlyMultiplier = gbmMonthlyMultiplier;
  global.fixedMonthlyMultiplier = fixedMonthlyMultiplier;
  global.rebalancePortfolio = rebalancePortfolio;
  global.calculateContributionsSeries = calculateContributionsSeries;
  global.calculateContribValue = calculateContribValue;
  global.prepareSimulation = prepareSimulation;
  global.simulateNominalPath = simulateNominalPath;
  global.simulatePortfolioPath = simulatePortfolioPath;
  global.calculatePortfolioValue = calculatePortfolioValue;
  global.validateAllocation = validateAllocation;
})(window);
