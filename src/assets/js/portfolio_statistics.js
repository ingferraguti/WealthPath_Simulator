(function (global) {
  const DAYS_PER_YEAR = 365;

  function safeLast(values) {
    return Array.isArray(values) && values.length ? Number(values[values.length - 1]) || 0 : 0;
  }

  function monthlyReturns(values, contributions, withdrawals) {
    if (!Array.isArray(values) || values.length < 2) return [];
    const returns = [];
    for (let month = 1; month < values.length; month += 1) {
      const previous = Number(values[month - 1]);
      const current = Number(values[month]);
      const previousContribution = Array.isArray(contributions) ? Number(contributions[month - 1]) : 0;
      const currentContribution = Array.isArray(contributions) ? Number(contributions[month]) : 0;
      const contribution = currentContribution - previousContribution;
      const previousWithdrawal = Array.isArray(withdrawals) ? Number(withdrawals[month - 1]) : 0;
      const currentWithdrawal = Array.isArray(withdrawals) ? Number(withdrawals[month]) : 0;
      const withdrawal = currentWithdrawal - previousWithdrawal;
      const investedAtStart = previous + contribution - withdrawal;
      if (![previous, current, contribution, withdrawal].every(Number.isFinite)) continue;
      if (investedAtStart > 0) returns.push((current / investedAtStart) - 1);
      else if (current === 0) returns.push(0);
    }
    return returns;
  }

  function totalReturn(values, contributed, withdrawn) {
    const base = Number(contributed);
    if (!Number.isFinite(base) || base <= 0) return 0;
    return ((safeLast(values) + Math.max(0, Number(withdrawn) || 0)) / base) - 1;
  }

  function timeWeightedAnnualizedReturn(returns) {
    const data = (returns || []).filter(Number.isFinite);
    if (!data.length) return 0;
    if (data.some((value) => value <= -1)) return -1;
    const averageAnnualLogReturn = data.reduce((sum, value) => sum + Math.log1p(value), 0) * 12 / data.length;
    const annualized = Math.expm1(averageAnnualLogReturn);
    return Number.isFinite(annualized) ? annualized : 0;
  }

  function xnpv(rate, cashFlows, dates) {
    if (!Number.isFinite(rate) || rate <= -1 || !Array.isArray(cashFlows) || !Array.isArray(dates) || cashFlows.length !== dates.length || !cashFlows.length) return NaN;
    const firstDate = new Date(dates[0]).getTime();
    if (!Number.isFinite(firstDate)) return NaN;
    return cashFlows.reduce((sum, rawFlow, index) => {
      const flow = Number(rawFlow);
      const timestamp = new Date(dates[index]).getTime();
      if (!Number.isFinite(flow) || !Number.isFinite(timestamp)) return NaN;
      const years = (timestamp - firstDate) / (DAYS_PER_YEAR * 24 * 60 * 60 * 1000);
      return sum + flow / Math.pow(1 + rate, years);
    }, 0);
  }

  function xirr(cashFlows, dates, guess) {
    if (!Array.isArray(cashFlows) || !Array.isArray(dates) || cashFlows.length !== dates.length || cashFlows.length < 2) return 0;
    const flows = cashFlows.map(Number);
    if (!flows.every(Number.isFinite) || !flows.some((value) => value < 0) || !flows.some((value) => value > 0)) return 0;
    const candidates = [-0.999999, -0.99, -0.9, -0.75, -0.5, -0.25, 0];
    const initialGuess = Number.isFinite(guess) && guess > -1 ? guess : 0.1;
    candidates.push(initialGuess, 0.25, 0.5, 1, 2, 5, 10, 100, 1000, 10000);
    const ordered = Array.from(new Set(candidates)).sort((a, b) => a - b);
    let low = null;
    let high = null;
    let lowValue = null;
    for (let index = 0; index < ordered.length - 1; index += 1) {
      const left = ordered[index];
      const right = ordered[index + 1];
      const leftValue = xnpv(left, flows, dates);
      const rightValue = xnpv(right, flows, dates);
      if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) continue;
      if (Math.abs(leftValue) < 1e-10) return left;
      if (leftValue * rightValue <= 0) {
        low = left;
        high = right;
        lowValue = leftValue;
        break;
      }
    }
    if (low === null || high === null) return 0;
    for (let iteration = 0; iteration < 160; iteration += 1) {
      const middle = (low + high) / 2;
      const middleValue = xnpv(middle, flows, dates);
      if (!Number.isFinite(middleValue)) return 0;
      if (Math.abs(middleValue) < 1e-9 || Math.abs(high - low) < 1e-12) return middle;
      if (lowValue * middleValue <= 0) high = middle;
      else {
        low = middle;
        lowValue = middleValue;
      }
    }
    const rate = (low + high) / 2;
    return Number.isFinite(rate) ? rate : 0;
  }

  function monthlyDates(length, startDate) {
    const base = startDate ? new Date(startDate) : new Date(Date.UTC(2000, 0, 1));
    if (!Number.isFinite(base.getTime())) return [];
    return Array.from({ length }, (_, month) => new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + month, base.getUTCDate())));
  }

  function portfolioCashFlows(values, contributions, withdrawals, startDate) {
    if (startDate === undefined && (withdrawals instanceof Date || typeof withdrawals === "string" || typeof withdrawals === "number")) {
      startDate = withdrawals;
      withdrawals = null;
    }
    if (!Array.isArray(values) || values.length < 2 || !Array.isArray(contributions) || contributions.length !== values.length) return { cashFlows: [], dates: [] };
    const cashFlows = Array.from({ length: values.length }, () => 0);
    cashFlows[0] = -Math.max(0, Number(contributions[0]) || 0);
    for (let month = 1; month < values.length; month += 1) {
      const contribution = Math.max(0, (Number(contributions[month]) || 0) - (Number(contributions[month - 1]) || 0));
      cashFlows[month - 1] -= contribution;
      const withdrawal = Array.isArray(withdrawals) ? Math.max(0, (Number(withdrawals[month]) || 0) - (Number(withdrawals[month - 1]) || 0)) : 0;
      cashFlows[month - 1] += withdrawal;
    }
    cashFlows[cashFlows.length - 1] += Math.max(0, Number(values[values.length - 1]) || 0);
    return { cashFlows, dates: monthlyDates(values.length, startDate) };
  }

  function moneyWeightedAnnualizedReturn(values, contributions, withdrawals, startDate) {
    if (startDate === undefined && (withdrawals instanceof Date || typeof withdrawals === "string" || typeof withdrawals === "number")) {
      startDate = withdrawals;
      withdrawals = null;
    }
    const flows = portfolioCashFlows(values, contributions, withdrawals, startDate);
    return flows.cashFlows.length ? xirr(flows.cashFlows, flows.dates, 0.1) : 0;
  }

  function annualizedReturn(values, contributions, withdrawals) {
    return timeWeightedAnnualizedReturn(monthlyReturns(values, contributions, withdrawals));
  }

  function annualizedVolatility(returns) {
    const data = (returns || []).filter(Number.isFinite);
    if (data.length < 2) return 0;
    let mean = 0;
    let sumSquaredDifferences = 0;
    data.forEach((value, index) => {
      const delta = value - mean;
      mean += delta / (index + 1);
      sumSquaredDifferences += delta * (value - mean);
    });
    return Math.sqrt(Math.max(0, sumSquaredDifferences / (data.length - 1)) * 12);
  }

  function maxDrawdown(values) {
    if (!Array.isArray(values) || !values.length) return { value: 0, month: 0, peakMonth: 0, recoveryMonth: null, maxDurationMonths: 0 };
    let peak = Number(values[0]) || 0;
    let peakMonth = 0;
    let maxDrawdownValue = 0;
    let troughMonth = 0;
    let maxPeakMonth = 0;
    let maxPeakValue = peak;
    let currentUnderwaterStart = null;
    let maxDurationMonths = 0;
    values.forEach((rawValue, month) => {
      const value = Number(rawValue);
      if (!Number.isFinite(value)) return;
      if (value >= peak) {
        if (currentUnderwaterStart !== null) {
          maxDurationMonths = Math.max(maxDurationMonths, month - currentUnderwaterStart);
        }
        peak = value;
        peakMonth = month;
        currentUnderwaterStart = null;
        return;
      }
      if (currentUnderwaterStart === null) currentUnderwaterStart = peakMonth;
      maxDurationMonths = Math.max(maxDurationMonths, month - currentUnderwaterStart);
      const drawdown = peak > 0 ? (value / peak) - 1 : 0;
      if (drawdown < maxDrawdownValue) {
        maxDrawdownValue = drawdown;
        troughMonth = month;
        maxPeakMonth = peakMonth;
        maxPeakValue = peak;
      }
    });
    let recoveryMonth = null;
    if (maxDrawdownValue < 0) {
      for (let month = troughMonth + 1; month < values.length; month += 1) {
        const value = Number(values[month]);
        if (Number.isFinite(value) && value >= maxPeakValue) {
          recoveryMonth = month;
          break;
        }
      }
    }
    return { value: maxDrawdownValue, month: troughMonth, peakMonth: maxPeakMonth, recoveryMonth, maxDurationMonths };
  }

  function correlationAdjustedVolatility(allocation, volatilities, correlationMatrix, assets) {
    const names = Array.isArray(assets) ? assets : Object.keys(allocation || {});
    if (!names.length || !Array.isArray(correlationMatrix) || correlationMatrix.length !== names.length) return 0;
    const weights = names.map((asset) => Math.max(0, Number(allocation && allocation[asset]) || 0) / 100);
    const sigmas = names.map((asset) => Math.max(0, Number(volatilities && volatilities[asset]) || 0));
    let variance = 0;
    for (let row = 0; row < names.length; row += 1) {
      if (!Array.isArray(correlationMatrix[row]) || correlationMatrix[row].length !== names.length) return 0;
      for (let column = 0; column < names.length; column += 1) {
        const correlation = Number(correlationMatrix[row][column]);
        if (!Number.isFinite(correlation)) return 0;
        variance += weights[row] * weights[column] * sigmas[row] * sigmas[column] * correlation;
      }
    }
    return Math.sqrt(Math.max(0, variance));
  }

  function positiveMonths(returns) {
    const data = (returns || []).filter(Number.isFinite);
    return data.length ? data.filter((value) => value > 0).length / data.length : 0;
  }

  function negativeMonths(returns) {
    const data = (returns || []).filter(Number.isFinite);
    return data.length ? data.filter((value) => value < 0).length / data.length : 0;
  }

  function calculatePortfolioStatistics(values, contributions, allocation, withdrawals, rebalanceTaxes) {
    const returns = monthlyReturns(values, contributions, withdrawals);
    const contributed = safeLast(contributions);
    const totalWithdrawals = safeLast(withdrawals);
    const totalRebalanceTaxes = safeLast(rebalanceTaxes);
    const growthIndex = returns.reduce((series, value) => {
      series.push(series[series.length - 1] * Math.max(0, 1 + value));
      return series;
    }, [1]);
    const drawdown = maxDrawdown(growthIndex);
    const marketData = global.marketData || {};
    const exAnteVolatility = correlationAdjustedVolatility(allocation, marketData.annualizedVolatility, marketData.correlationMatrix, marketData.assetClasses);
    const weightedAverageVolatility = (marketData.assetClasses || []).reduce((sum, asset) => sum + Math.max(0, Number(allocation && allocation[asset]) || 0) / 100 * Math.max(0, Number(marketData.annualizedVolatility && marketData.annualizedVolatility[asset]) || 0), 0);
    const xirrValue = moneyWeightedAnnualizedReturn(values, contributions, withdrawals);
    return {
      totalReturn: totalReturn(values, contributed, totalWithdrawals),
      annualizedReturn: timeWeightedAnnualizedReturn(returns),
      xirr: xirrValue,
      moneyWeightedAnnualizedReturn: xirrValue,
      annualizedVolatility: annualizedVolatility(returns),
      correlationAdjustedVolatility: exAnteVolatility,
      diversificationBenefit: weightedAverageVolatility > 0 ? Math.max(0, 1 - exAnteVolatility / weightedAverageVolatility) : 0,
      maxDrawdown: drawdown.value,
      maxDrawdownMonth: drawdown.month,
      maxDrawdownPeakMonth: drawdown.peakMonth,
      maxDrawdownRecoveryMonth: drawdown.recoveryMonth,
      maxDrawdownDurationMonths: drawdown.maxDurationMonths,
      bestMonthlyReturn: returns.length ? Math.max(...returns) : 0,
      worstMonthlyReturn: returns.length ? Math.min(...returns) : 0,
      positiveMonths: positiveMonths(returns),
      negativeMonths: negativeMonths(returns),
      totalWithdrawals,
      totalRebalanceTaxes,
      netWealth: safeLast(values) + totalWithdrawals,
      netProfit: safeLast(values) + totalWithdrawals - contributed,
      finalToContributedRatio: contributed > 0 ? (safeLast(values) + totalWithdrawals) / contributed : 0
    };
  }

  global.PortfolioStatistics = { monthlyReturns, totalReturn, annualizedReturn, timeWeightedAnnualizedReturn, xnpv, xirr, portfolioCashFlows, moneyWeightedAnnualizedReturn, annualizedVolatility, maxDrawdown, correlationAdjustedVolatility, positiveMonths, negativeMonths, calculatePortfolioStatistics };
})(window);
