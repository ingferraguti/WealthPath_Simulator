(function (global) {
  function assert(condition, message) { if (!condition) throw new Error(message); }
  function approx(a, b, epsilon) { return Math.abs(a - b) <= (epsilon || 1e-6); }
  function runSimulationTests() {
    const md = global.marketData;
    const base = global.WealthPathSettings.defaultSettings();
    const results = [];
    function test(name, fn) { fn(); results.push({ name, ok: true }); }
    test("allocazione valida al 100%", () => assert(global.WealthPathValidation.validateAllocation(base.allocation).valid, "allocazione non valida"));
    test("ribilanciamento ripristina i pesi target", () => { const p = { azionarioGlobale: 100, obblGovEU10: 0, obblGovEU3: 0, obblEUInflLinked: 0, obblCorporate: 0, materiePrime: 0, oro: 0 }; global.rebalancePortfolio(p, md.allocation); assert(approx(p.azionarioGlobale, 30), "peso non ripristinato"); });
    test("stesso seed e stessi parametri producono stessi risultati", () => { const a = global.simulatePortfolioPath({ ...base, seed: 7 }).finalValue; const b = global.simulatePortfolioPath({ ...base, seed: 7 }).finalValue; assert(approx(a, b), "seed non riproducibile"); });
    test("seed diverso produce risultati diversi", () => { const a = global.simulatePortfolioPath({ ...base, seed: 7 }).finalValue; const b = global.simulatePortfolioPath({ ...base, seed: 8 }).finalValue; assert(!approx(a, b), "seed diversi uguali"); });
    test("percentile calcolato correttamente", () => assert(approx(global.percentileFromSorted([0, 10, 20, 30], 50), 15), "percentile errato"));
    test("capitale versato calcolato correttamente", () => assert(approx(global.calculateContribValue({ initialInvestment: 1000, monthlyContribution: 100 }, 12), 2200), "versato errato"));
    test("massimo drawdown su serie nota", () => { const dd = global.PortfolioStatistics.maxDrawdown([100, 120, 90, 150]); assert(approx(dd.value, -0.25) && dd.month === 2, "drawdown errato"); });
    test("nessun NaN con investimento iniziale zero", () => { const s = global.simulatePortfolioPath({ ...base, initialInvestment: 0, monthlyContribution: 0 }); assert(s.nominalValues.every(Number.isFinite), "NaN rilevato"); });
    test("importazione JSON valida", () => { const r = global.WealthPathSettings.importSettings(JSON.stringify(base)); assert(r.success, "import valido rifiutato"); });
    test("rifiuto configurazione JSON non valida", () => { const r = global.WealthPathSettings.importSettings(JSON.stringify({ ...base, allocation: { azionarioGlobale: 100 } })); assert(!r.success, "import non valido accettato"); });
    test("Monte Carlo con un solo scenario", () => { const r = global.runMonteCarloGBM({ ...base, nScenarios: 1 }); assert(r.finalValues.length === 1 && Number.isFinite(r.stats.meanFinal), "MC singolo errato"); });
    test("Monte Carlo con scenario macro attivo", () => { const r = global.runMonteCarloGBM({ ...base, enableMacroAdjustments: true, selectedMacroScenario: "baseline", nScenarios: 3 }); assert(r.bands.p50.length === base.timeHorizonYears * 12 + 1, "MC macro errato"); });
    return results;
  }
  global.runSimulationTests = runSimulationTests;
})(window);
