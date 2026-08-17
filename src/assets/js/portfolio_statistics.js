(function (global) {
  function safeLast(values) { return Array.isArray(values) && values.length ? values[values.length - 1] : 0; }
  function monthlyReturns(values, contributions) {
    if (!Array.isArray(values) || values.length < 2) return [];
    const returns = [];
    for (let i = 1; i < values.length; i += 1) {
      const previous = Number(values[i - 1]);
      const current = Number(values[i]);
      const contribution = Array.isArray(contributions)
        ? Number(contributions[i]) - Number(contributions[i - 1])
        : 0;
      const investedAtStart = previous + contribution;
      if (Number.isFinite(previous) && Number.isFinite(current) && Number.isFinite(contribution) && investedAtStart > 0) {
        returns.push((current / investedAtStart) - 1);
      }
    }
    return returns;
  }
  function totalReturn(values, contributed) {
    const base = Number(contributed);
    if (!Number.isFinite(base) || base <= 0) return 0;
    return (safeLast(values) / base) - 1;
  }
  function timeWeightedAnnualizedReturn(returns) {
    const data = (returns || []).filter(Number.isFinite);
    if (!data.length) return 0;
    const growth = data.reduce((product, value) => product * Math.max(0, 1 + value), 1);
    const annualized = Math.pow(growth, 12 / data.length) - 1;
    return Number.isFinite(annualized) ? annualized : 0;
  }
  function moneyWeightedAnnualizedReturn(values, contributions) {
    if (!Array.isArray(values) || values.length < 2 || !Array.isArray(contributions) || contributions.length !== values.length) return 0;
    const cashFlows = Array.from({ length: values.length }, () => 0);
    cashFlows[0] = -Math.max(0, Number(contributions[0]) || 0);
    for (let month = 1; month < values.length; month += 1) {
      const contribution = Math.max(0, (Number(contributions[month]) || 0) - (Number(contributions[month - 1]) || 0));
      cashFlows[month - 1] -= contribution;
    }
    cashFlows[cashFlows.length - 1] += Math.max(0, Number(values[values.length - 1]) || 0);
    if (!cashFlows.some((value) => value < 0) || !cashFlows.some((value) => value > 0)) return 0;

    function npv(monthlyRate) {
      return cashFlows.reduce((sum, flow, month) => sum + flow / Math.pow(1 + monthlyRate, month), 0);
    }

    // Un limite troppo vicino a -100% porta i flussi lunghi in overflow.
    // -50% mensile copre ampiamente gli esiti plausibili del simulatore e
    // mantiene finita la valutazione anche sull'orizzonte massimo di 600 mesi.
    let low = -0.5;
    let high = 1;
    let lowValue = npv(low);
    let highValue = npv(high);
    while (Number.isFinite(highValue) && lowValue * highValue > 0 && high < 1024) {
      high *= 2;
      highValue = npv(high);
    }
    if (!Number.isFinite(lowValue) || !Number.isFinite(highValue) || lowValue * highValue > 0) return 0;

    for (let iteration = 0; iteration < 100; iteration += 1) {
      const middle = (low + high) / 2;
      const middleValue = npv(middle);
      if (!Number.isFinite(middleValue)) return 0;
      if (Math.abs(middleValue) < 1e-8) {
        low = middle;
        high = middle;
        break;
      }
      if (lowValue * middleValue <= 0) {
        high = middle;
      } else {
        low = middle;
        lowValue = middleValue;
      }
    }
    const monthlyRate = (low + high) / 2;
    const annualized = Math.pow(1 + monthlyRate, 12) - 1;
    return Number.isFinite(annualized) ? annualized : 0;
  }
  function annualizedReturn(values, contributions) {
    return timeWeightedAnnualizedReturn(monthlyReturns(values, contributions));
  }
  function annualizedVolatility(returns) {
    const data = (returns || []).filter(Number.isFinite);
    if (data.length < 2) return 0;
    const mean = data.reduce((sum, value) => sum + value, 0) / data.length;
    const variance = data.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (data.length - 1);
    return Math.sqrt(variance) * Math.sqrt(12);
  }
  function maxDrawdown(values) {
    if (!Array.isArray(values) || !values.length) return { value: 0, month: 0, maxDurationMonths: 0 };
    let peak = Number(values[0]) || 0;
    let maxDd = 0;
    let maxMonth = 0;
    let currentDuration = 0;
    let maxDuration = 0;
    values.forEach((raw, index) => {
      const value = Number(raw);
      if (!Number.isFinite(value)) return;
      if (value >= peak) { peak = value; currentDuration = 0; return; }
      currentDuration += 1;
      maxDuration = Math.max(maxDuration, currentDuration);
      const dd = peak > 0 ? (value / peak) - 1 : 0;
      if (dd < maxDd) { maxDd = dd; maxMonth = index; }
    });
    return { value: maxDd, month: maxMonth, maxDurationMonths: maxDuration };
  }
  function positiveMonths(returns) {
    const data = (returns || []).filter(Number.isFinite);
    if (!data.length) return 0;
    return data.filter((value) => value > 0).length / data.length;
  }
  function negativeMonths(returns) {
    const data = (returns || []).filter(Number.isFinite);
    if (!data.length) return 0;
    return data.filter((value) => value < 0).length / data.length;
  }
  function calculatePortfolioStatistics(values, contributions, allocation) {
    const returns = monthlyReturns(values, contributions);
    const contributed = safeLast(contributions);
    const growthIndex = returns.reduce((series, value) => {
      series.push(series[series.length - 1] * Math.max(0, 1 + value));
      return series;
    }, [1]);
    const dd = maxDrawdown(growthIndex);
    return {
      totalReturn: totalReturn(values, contributed),
      annualizedReturn: timeWeightedAnnualizedReturn(returns),
      moneyWeightedAnnualizedReturn: moneyWeightedAnnualizedReturn(values, contributions),
      annualizedVolatility: annualizedVolatility(returns),
      maxDrawdown: dd.value,
      maxDrawdownMonth: dd.month,
      maxDrawdownDurationMonths: dd.maxDurationMonths,
      bestMonthlyReturn: returns.length ? Math.max(...returns) : 0,
      worstMonthlyReturn: returns.length ? Math.min(...returns) : 0,
      positiveMonths: positiveMonths(returns),
      negativeMonths: negativeMonths(returns),
      finalToContributedRatio: contributed > 0 ? safeLast(values) / contributed : 0
    };
  }
  global.PortfolioStatistics = { monthlyReturns, totalReturn, annualizedReturn, timeWeightedAnnualizedReturn, moneyWeightedAnnualizedReturn, annualizedVolatility, maxDrawdown, positiveMonths, negativeMonths, calculatePortfolioStatistics };
})(window);
