(function (global) {
  const V = global.WealthPathValidation;
  const MAX_CACHE_ENTRIES = 3;
  const cache = new Map();
  const cacheMetrics = { hits: 0, misses: 0, preparations: 0 };

  function percentileFromSorted(values, percentile) {
    if (!values.length) return 0;
    const index = (percentile / 100) * (values.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return values[lower];
    return values[lower] * (1 - (index - lower)) + values[upper] * (index - lower);
  }

  function formatCompact(value) {
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return `${Math.round(value)}`;
  }

  function buildHistogram(values) {
    const data = Array.from(values || []).filter(Number.isFinite);
    if (!data.length) return { labels: [], counts: [] };
    let min = Infinity;
    let max = -Infinity;
    data.forEach((value) => {
      min = Math.min(min, value);
      max = Math.max(max, value);
    });
    const bins = Math.max(5, Math.min(40, Math.round(Math.sqrt(data.length))));
    if (min === max) return { labels: [formatCompact(min)], counts: [data.length] };
    const width = (max - min) / bins;
    const counts = Array.from({ length: bins }, () => 0);
    data.forEach((value) => { counts[Math.min(bins - 1, Math.floor((value - min) / width))] += 1; });
    const labels = counts.map((_, index) => `${formatCompact(min + index * width)}-${formatCompact(min + (index + 1) * width)}`);
    return { labels, counts };
  }

  function aggregateBands(paths, contributions, targetCapital) {
    const months = paths[0] ? paths[0].length : 0;
    const sample = new Float64Array(paths.length);
    const bands = { labels: [], p5: [], p25: [], p50: [], p75: [], p95: [], contributions, target: [] };
    for (let month = 0; month < months; month += 1) {
      for (let scenario = 0; scenario < paths.length; scenario += 1) sample[scenario] = paths[scenario][month];
      sample.sort();
      bands.labels.push(`M${month}`);
      bands.p5.push(percentileFromSorted(sample, 5));
      bands.p25.push(percentileFromSorted(sample, 25));
      bands.p50.push(percentileFromSorted(sample, 50));
      bands.p75.push(percentileFromSorted(sample, 75));
      bands.p95.push(percentileFromSorted(sample, 95));
      bands.target.push(targetCapital > 0 ? targetCapital : null);
    }
    return bands;
  }

  function cacheKey(settings) {
    const marketModel = {
      schemaVersion: global.marketData.schemaVersion,
      annualizedReturns: global.marketData.annualizedReturns,
      annualizedVolatility: global.marketData.annualizedVolatility,
      fixedMonthlyMultipliers: global.marketData.fixedMonthlyMultipliers,
      correlationMatrix: global.marketData.correlationMatrix,
      macroDriftConfig: global.marketData.macroDriftConfig,
      macroScenario: global.marketData.macroScenarioPresets[settings.selectedMacroScenario]
    };
    return JSON.stringify({ settings, marketModel });
  }

  function readCache(key) {
    if (!cache.has(key)) return null;
    const result = cache.get(key);
    cache.delete(key);
    cache.set(key, result);
    cacheMetrics.hits += 1;
    return { ...result, performance: { ...result.performance, cacheHit: true } };
  }

  function writeCache(key, result) {
    cache.set(key, result);
    while (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
  }

  function runMonteCarloGBM(options) {
    options = options || {};
    const settings = V.sanitizeSettings({
      ...options,
      monteCarloScenarios: options.nScenarios !== undefined ? options.nScenarios : options.monteCarloScenarios
    });
    const validation = V.validateSettings(settings);
    if (!validation.valid) throw new Error(validation.errors.join(" "));
    const key = cacheKey(settings);
    const cached = readCache(key);
    if (cached) return cached;
    cacheMetrics.misses += 1;
    const startedAt = global.performance && typeof global.performance.now === "function" ? global.performance.now() : Date.now();
    const prepared = global.prepareSimulation(settings);
    cacheMetrics.preparations += 1;
    const paths = new Array(settings.monteCarloScenarios);
    const finalValues = new Float64Array(settings.monteCarloScenarios);
    const totalWithdrawals = new Float64Array(settings.monteCarloScenarios);
    const totalRebalanceTaxes = new Float64Array(settings.monteCarloScenarios);
    for (let scenario = 0; scenario < settings.monteCarloScenarios; scenario += 1) {
      const random = global.createPrng((settings.seed + scenario * 7919) >>> 0);
      const path = global.simulateNominalPath(prepared, random);
      paths[scenario] = path.nominalValues;
      finalValues[scenario] = path.finalValue;
      totalWithdrawals[scenario] = path.totalWithdrawals;
      totalRebalanceTaxes[scenario] = path.totalRebalanceTaxes;
    }
    const sorted = finalValues.slice();
    sorted.sort();
    let sumFinal = 0;
    let sumWithdrawals = 0;
    let sumTaxes = 0;
    let successCount = 0;
    let lossCount = 0;
    const contributions = global.calculateContributionsSeries(settings.initialInvestment, settings.monthlyContribution, prepared.months);
    const totalContributed = contributions[contributions.length - 1] || 0;
    const target = settings.targetCapital;
    finalValues.forEach((value, scenario) => {
      sumFinal += value;
      sumWithdrawals += totalWithdrawals[scenario];
      sumTaxes += totalRebalanceTaxes[scenario];
      if (target > 0 && value >= target) successCount += 1;
      if (value + totalWithdrawals[scenario] < totalContributed) lossCount += 1;
    });
    const median = percentileFromSorted(sorted, 50);
    const stats = {
      meanFinal: sumFinal / finalValues.length,
      meanTotalWithdrawals: sumWithdrawals / finalValues.length,
      meanRebalanceTaxes: sumTaxes / finalValues.length,
      medianFinal: median,
      p5: percentileFromSorted(sorted, 5),
      p25: percentileFromSorted(sorted, 25),
      p75: percentileFromSorted(sorted, 75),
      p95: percentileFromSorted(sorted, 95),
      targetProbability: target > 0 ? successCount / finalValues.length : 0,
      lossProbability: lossCount / finalValues.length,
      totalContributed,
      medianMinusContributed: median - totalContributed
    };
    const elapsedMs = (global.performance && typeof global.performance.now === "function" ? global.performance.now() : Date.now()) - startedAt;
    const result = {
      pathsCount: settings.monteCarloScenarios,
      finalValues: Array.from(finalValues),
      stats,
      bands: aggregateBands(paths, contributions, target),
      histogram: buildHistogram(finalValues),
      seed: settings.seed,
      performance: { elapsedMs, cacheHit: false, preparedSimulations: 1 }
    };
    writeCache(key, result);
    return result;
  }

  function clearCache() {
    cache.clear();
    cacheMetrics.hits = 0;
    cacheMetrics.misses = 0;
    cacheMetrics.preparations = 0;
  }

  function getCacheStats() {
    return { size: cache.size, maxEntries: MAX_CACHE_ENTRIES, ...cacheMetrics };
  }

  global.percentileFromSorted = percentileFromSorted;
  global.runMonteCarloGBM = runMonteCarloGBM;
  global.MonteCarloGBM = { runMonteCarloGBM, percentileFromSorted, buildHistogram, aggregateBands, clearCache, getCacheStats };
})(window);
