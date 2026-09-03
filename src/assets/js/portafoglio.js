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

  function totalPortfolioValue(portfolio) {
    return portfolio.reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  }

  function withdrawProRata(portfolio, costBasis, requestedAmount) {
    const total = totalPortfolioValue(portfolio);
    const withdrawal = Math.min(Math.max(0, Number(requestedAmount) || 0), total);
    if (withdrawal === 0 || total === 0) return 0;
    const proportion = withdrawal / total;
    for (let assetIndex = 0; assetIndex < portfolio.length; assetIndex += 1) {
      portfolio[assetIndex] *= 1 - proportion;
      costBasis[assetIndex] *= 1 - proportion;
    }
    return withdrawal;
  }

  function rebalancePortfolioWithTaxes(portfolio, costBasis, weights, capitalGainsTaxRate) {
    const total = totalPortfolioValue(portfolio);
    if (total === 0) return 0;
    const taxRate = Math.max(0, Math.min(1, Number(capitalGainsTaxRate) || 0));
    let taxes = 0;
    for (let assetIndex = 0; assetIndex < portfolio.length; assetIndex += 1) {
      const currentValue = portfolio[assetIndex];
      const targetValue = total * weights[assetIndex];
      if (currentValue > targetValue && currentValue > 0) {
        const sale = currentValue - targetValue;
        const costBasisSold = costBasis[assetIndex] * (sale / currentValue);
        taxes += Math.max(0, sale - costBasisSold) * taxRate;
        costBasis[assetIndex] = Math.max(0, costBasis[assetIndex] - costBasisSold);
      } else if (targetValue > currentValue) {
        costBasis[assetIndex] += targetValue - currentValue;
      }
      portfolio[assetIndex] = targetValue;
    }
    const scaleAfterTaxes = Math.max(0, total - taxes) / total;
    for (let assetIndex = 0; assetIndex < portfolio.length; assetIndex += 1) {
      portfolio[assetIndex] *= scaleAfterTaxes;
      costBasis[assetIndex] *= scaleAfterTaxes;
    }
    return taxes;
  }

  function lombardCollateralValue(portfolio, usage) {
    if (usage === "equity-leverage") return Math.max(0, Number(portfolio[0]) || 0);
    return totalPortfolioValue(portfolio);
  }

  function lombardLtv(debt, portfolio, usage) {
    if (debt <= 0) return 0;
    const collateral = lombardCollateralValue(portfolio, usage);
    return collateral > 0 ? debt / collateral : Infinity;
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
    const costBasis = new Float64Array(prepared.assetCount);
    for (let assetIndex = 0; assetIndex < prepared.assetCount; assetIndex += 1) {
      portfolio[assetIndex] = settings.initialInvestment * prepared.weights[assetIndex];
      costBasis[assetIndex] = portfolio[assetIndex];
    }
    const lombardEnabled = settings.enableLombard && settings.lombardLeverage > 0;
    const initialLoan = lombardEnabled ? settings.initialInvestment * settings.lombardLeverage : 0;
    let lombardDebt = initialLoan;
    let lombardCashReserve = 0;
    if (lombardEnabled && settings.lombardUsage === "liquidity") {
      lombardCashReserve = initialLoan;
    } else if (lombardEnabled && settings.lombardUsage === "equity-leverage") {
      portfolio[0] += initialLoan;
      costBasis[0] += initialLoan;
    } else if (lombardEnabled) {
      for (let assetIndex = 0; assetIndex < prepared.assetCount; assetIndex += 1) {
        const loanAllocation = initialLoan * prepared.weights[assetIndex];
        portfolio[assetIndex] += loanAllocation;
        costBasis[assetIndex] += loanAllocation;
      }
    }
    const nominalValues = new Float64Array(prepared.months + 1);
    const realValues = settings.enableMacroAdjustments ? new Float64Array(prepared.months + 1) : null;
    const withdrawals = new Float64Array(prepared.months + 1);
    const rebalanceTaxes = new Float64Array(prepared.months + 1);
    const lombardDebts = new Float64Array(prepared.months + 1);
    const lombardCashReserves = new Float64Array(prepared.months + 1);
    const lombardCollateral = new Float64Array(prepared.months + 1);
    const lombardLtvs = new Float64Array(prepared.months + 1);
    const lombardInterests = new Float64Array(prepared.months + 1);
    const marginCalls = new Uint8Array(prepared.months + 1);
    lombardDebts[0] = lombardDebt;
    lombardCashReserves[0] = lombardCashReserve;
    lombardCollateral[0] = lombardEnabled ? lombardCollateralValue(portfolio, settings.lombardUsage) : 0;
    lombardLtvs[0] = lombardEnabled ? lombardLtv(lombardDebt, portfolio, settings.lombardUsage) : 0;
    if (lombardEnabled && lombardLtvs[0] >= settings.lombardMarginCallLtv) marginCalls[0] = 1;
    nominalValues[0] = totalPortfolioValue(portfolio) + lombardCashReserve - lombardDebt;
    if (realValues) realValues[0] = nominalValues[0];
    const nextNormal = createNormalGenerator(random || prepared.suppliedRandom || createPrng(settings.seed));
    let cumulativeInflation = 1;
    let marginCallMonth = marginCalls[0] ? 0 : null;
    for (let month = 1; month <= prepared.months; month += 1) {
      let total = 0;
      for (let assetIndex = 0; assetIndex < prepared.assetCount; assetIndex += 1) {
        const contribution = settings.monthlyContribution * prepared.weights[assetIndex];
        portfolio[assetIndex] += contribution;
        costBasis[assetIndex] += contribution;
        total += portfolio[assetIndex];
      }
      const monthlyWithdrawal = settings.enableRetirement ? total * settings.annualWithdrawalRate / 12 : 0;
      const reserveWithdrawal = lombardEnabled && settings.lombardUsage === "liquidity"
        ? Math.min(lombardCashReserve, monthlyWithdrawal)
        : 0;
      lombardCashReserve -= reserveWithdrawal;
      const withdrawn = reserveWithdrawal + withdrawProRata(portfolio, costBasis, monthlyWithdrawal - reserveWithdrawal);
      withdrawals[month] = withdrawals[month - 1] + withdrawn;
      if (prepared.rebalanceEveryMonths > 0 && month % prepared.rebalanceEveryMonths === 0) {
        const taxes = rebalancePortfolioWithTaxes(portfolio, costBasis, prepared.weights, settings.capitalGainsTaxRate);
        rebalanceTaxes[month] = rebalanceTaxes[month - 1] + taxes;
      } else {
        rebalanceTaxes[month] = rebalanceTaxes[month - 1];
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
      const monthlyInterest = lombardEnabled ? lombardDebt * settings.lombardInterestRate / 12 : 0;
      lombardDebt += monthlyInterest;
      lombardDebts[month] = lombardDebt;
      lombardCashReserves[month] = lombardCashReserve;
      lombardCollateral[month] = lombardEnabled ? lombardCollateralValue(portfolio, settings.lombardUsage) : 0;
      lombardLtvs[month] = lombardEnabled ? lombardLtv(lombardDebt, portfolio, settings.lombardUsage) : 0;
      if (lombardEnabled && lombardLtvs[month] >= settings.lombardMarginCallLtv) {
        marginCalls[month] = 1;
        if (marginCallMonth === null) marginCallMonth = month;
      }
      lombardInterests[month] = lombardInterests[month - 1] + monthlyInterest;
      nominalValues[month] = total + lombardCashReserve - lombardDebt;
      if (realValues) {
        const inflation = Math.max(-0.999999, V.toNumber(prepared.macroSeries[month] && prepared.macroSeries[month].inflation, 0));
        cumulativeInflation *= Math.pow(1 + inflation, 1 / 12);
        realValues[month] = nominalValues[month] / cumulativeInflation;
      }
    }
    return {
      nominalValues,
      realValues,
      withdrawals,
      rebalanceTaxes,
      lombardDebts,
      lombardCashReserves,
      lombardCollateral,
      lombardLtvs,
      lombardInterests,
      marginCalls,
      finalValue: nominalValues[prepared.months],
      finalRealValue: realValues ? realValues[prepared.months] : null,
      totalWithdrawals: withdrawals[prepared.months],
      totalRebalanceTaxes: rebalanceTaxes[prepared.months],
      lombardEnabled,
      lombardUsage: settings.lombardUsage,
      initialLombardLoan: initialLoan,
      totalLombardInterest: lombardInterests[prepared.months],
      marginCallOccurred: marginCallMonth !== null,
      marginCallMonth
    };
  }

  function simulatePortfolioPath(options) {
    const prepared = prepareSimulation(options);
    const path = simulateNominalPath(prepared, prepared.suppliedRandom || createPrng(prepared.settings.seed));
    return {
      nominalValues: Array.from(path.nominalValues),
      contributions: calculateContributionsSeries(prepared.settings.initialInvestment, prepared.settings.monthlyContribution, prepared.months),
      withdrawals: Array.from(path.withdrawals),
      rebalanceTaxes: Array.from(path.rebalanceTaxes),
      lombardDebts: Array.from(path.lombardDebts),
      lombardCashReserves: Array.from(path.lombardCashReserves),
      lombardCollateral: Array.from(path.lombardCollateral),
      lombardLtvs: Array.from(path.lombardLtvs),
      lombardInterests: Array.from(path.lombardInterests),
      marginCalls: Array.from(path.marginCalls),
      realValues: path.realValues ? Array.from(path.realValues) : [],
      macroSeries: prepared.macroSeries,
      finalValue: path.finalValue,
      finalRealValue: path.finalRealValue,
      totalWithdrawals: path.totalWithdrawals,
      totalRebalanceTaxes: path.totalRebalanceTaxes,
      lombardEnabled: path.lombardEnabled,
      lombardUsage: path.lombardUsage,
      initialLombardLoan: path.initialLombardLoan,
      totalLombardInterest: path.totalLombardInterest,
      marginCallOccurred: path.marginCallOccurred,
      marginCallMonth: path.marginCallMonth
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
  global.withdrawProRata = withdrawProRata;
  global.rebalancePortfolioWithTaxes = rebalancePortfolioWithTaxes;
  global.lombardCollateralValue = lombardCollateralValue;
  global.lombardLtv = lombardLtv;
  global.prepareSimulation = prepareSimulation;
  global.simulateNominalPath = simulateNominalPath;
  global.simulatePortfolioPath = simulatePortfolioPath;
  global.calculatePortfolioValue = calculatePortfolioValue;
  global.validateAllocation = validateAllocation;
})(window);
