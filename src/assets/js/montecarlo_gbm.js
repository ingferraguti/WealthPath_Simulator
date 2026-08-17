(function (global) {
  const cache = { key: null, result: null };
  const V = global.WealthPathValidation;
  function percentileFromSorted(arr, p) {
    if (!arr.length) return 0;
    const index = (p / 100) * (arr.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return arr[lower];
    return arr[lower] * (1 - (index - lower)) + arr[upper] * (index - lower);
  }
  function buildHistogram(values) {
    const data = values.filter(Number.isFinite);
    if (!data.length) return { labels: [], counts: [] };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const bins = Math.max(5, Math.min(40, Math.round(Math.sqrt(data.length))));
    if (min === max) return { labels: [formatCompact(min)], counts: [data.length] };
    const width = (max - min) / bins;
    const counts = Array.from({ length: bins }, () => 0);
    data.forEach((value) => { counts[Math.min(bins - 1, Math.floor((value - min) / width))] += 1; });
    const labels = counts.map((_, index) => `${formatCompact(min + index * width)}-${formatCompact(min + (index + 1) * width)}`);
    return { labels, counts };
  }
  function formatCompact(value) {
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return `${Math.round(value)}`;
  }
  function aggregateBands(paths, contributions, targetCapital) {
    const months = paths[0] ? paths[0].length : 0;
    const bands = { labels: [], p5: [], p25: [], p50: [], p75: [], p95: [], contributions, target: [] };
    for (let month = 0; month < months; month += 1) {
      const sorted = paths.map((path) => path[month]).sort((a, b) => a - b);
      bands.labels.push(`M${month}`);
      bands.p5.push(percentileFromSorted(sorted, 5));
      bands.p25.push(percentileFromSorted(sorted, 25));
      bands.p50.push(percentileFromSorted(sorted, 50));
      bands.p75.push(percentileFromSorted(sorted, 75));
      bands.p95.push(percentileFromSorted(sorted, 95));
      bands.target.push(targetCapital > 0 ? targetCapital : null);
    }
    return bands;
  }
  function runMonteCarloGBM(options) {
    options = options || {};
    const settings = V.sanitizeSettings({
      ...options,
      monteCarloScenarios: options.nScenarios !== undefined ? options.nScenarios : options.monteCarloScenarios
    });
    const validation = V.validateSettings(settings);
    if (!validation.valid) throw new Error(validation.errors.join(" "));
    const key = JSON.stringify(settings);
    if (cache.key === key && cache.result) return cache.result;
    const nScenarios = settings.monteCarloScenarios;
    const paths = [];
    const finalValues = [];
    for (let i = 0; i < nScenarios; i += 1) {
      const random = global.createPrng((settings.seed + i * 7919) >>> 0);
      const result = global.simulatePortfolioPath({ ...settings, random });
      paths.push(result.nominalValues);
      finalValues.push(result.finalValue);
    }
    const sorted = finalValues.slice().sort((a, b) => a - b);
    const meanFinal = finalValues.reduce((sum, value) => sum + value, 0) / finalValues.length;
    const contributions = global.calculateContributionsSeries(settings.initialInvestment, settings.monthlyContribution, settings.timeHorizonYears * 12);
    const totalContributed = contributions[contributions.length - 1] || 0;
    const target = settings.targetCapital;
    const stats = {
      meanFinal,
      medianFinal: percentileFromSorted(sorted, 50),
      p5: percentileFromSorted(sorted, 5),
      p25: percentileFromSorted(sorted, 25),
      p75: percentileFromSorted(sorted, 75),
      p95: percentileFromSorted(sorted, 95),
      targetProbability: target > 0 ? finalValues.filter((value) => value >= target).length / finalValues.length : 0,
      lossProbability: finalValues.filter((value) => value < totalContributed).length / finalValues.length,
      totalContributed,
      medianMinusContributed: percentileFromSorted(sorted, 50) - totalContributed
    };
    const result = { pathsCount: nScenarios, finalValues, stats, bands: aggregateBands(paths, contributions, target), histogram: buildHistogram(finalValues), seed: settings.seed };
    cache.key = key;
    cache.result = result;
    return result;
  }
  function clearCache() { cache.key = null; cache.result = null; }
  global.percentileFromSorted = percentileFromSorted;
  global.runMonteCarloGBM = runMonteCarloGBM;
  global.MonteCarloGBM = { runMonteCarloGBM, percentileFromSorted, buildHistogram, aggregateBands, clearCache };
})(window);
