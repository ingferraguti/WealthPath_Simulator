(function (global) {
  const V = global.WealthPathValidation;
  function safeLast(values) { return Array.isArray(values) && values.length ? values[values.length - 1] : 0; }
  function monthlyReturns(values) {
    if (!Array.isArray(values) || values.length < 2) return [];
    const returns = [];
    for (let i = 1; i < values.length; i += 1) {
      const previous = Number(values[i - 1]);
      const current = Number(values[i]);
      if (Number.isFinite(previous) && Number.isFinite(current) && previous > 0) returns.push((current / previous) - 1);
    }
    return returns;
  }
  function totalReturn(values, contributed) {
    const base = Number(contributed);
    if (!Number.isFinite(base) || base <= 0) return 0;
    return (safeLast(values) / base) - 1;
  }
  function annualizedReturn(values, contributed, months) {
    const total = totalReturn(values, contributed);
    const m = Number(months);
    if (!Number.isFinite(total) || !Number.isFinite(m) || m <= 0) return 0;
    return Math.pow(Math.max(0, 1 + total), 12 / m) - 1;
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
  function riskScore(allocation) {
    const weights = global.marketData.riskWeights;
    return global.marketData.assetClasses.reduce((score, asset) => score + (V.toNumber(allocation[asset], 0) / 100) * V.toNumber(weights[asset], 0), 0);
  }
  function calculatePortfolioStatistics(values, contributions, allocation) {
    const returns = monthlyReturns(values);
    const contributed = safeLast(contributions);
    const dd = maxDrawdown(values);
    return {
      totalReturn: totalReturn(values, contributed),
      annualizedReturn: annualizedReturn(values, contributed, Math.max(0, (values || []).length - 1)),
      annualizedVolatility: annualizedVolatility(returns),
      maxDrawdown: dd.value,
      maxDrawdownMonth: dd.month,
      maxDrawdownDurationMonths: dd.maxDurationMonths,
      bestMonthlyReturn: returns.length ? Math.max(...returns) : 0,
      worstMonthlyReturn: returns.length ? Math.min(...returns) : 0,
      positiveMonths: positiveMonths(returns),
      negativeMonths: negativeMonths(returns),
      finalToContributedRatio: contributed > 0 ? safeLast(values) / contributed : 0,
      riskScore: riskScore(allocation || {})
    };
  }
  global.PortfolioStatistics = { monthlyReturns, totalReturn, annualizedReturn, annualizedVolatility, maxDrawdown, positiveMonths, negativeMonths, riskScore, calculatePortfolioStatistics };
})(window);
