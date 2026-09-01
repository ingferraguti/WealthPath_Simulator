(function (global) {
  function assert(condition, message) { if (!condition) throw new Error(message); }
  function approx(a, b, epsilon) { return Math.abs(a - b) <= (epsilon || 1e-6); }
  function runSimulationTests() {
    const md = global.marketData;
    const base = global.WealthPathSettings.defaultSettings();
    const results = [];
    function test(name, fn) { fn(); results.push({ name, ok: true }); }
    test("allocazione valida al 100%", () => assert(global.WealthPathValidation.validateAllocation(base.allocation).valid, "allocazione non valida"));
    test("sanificazione blocca importi negativi e valori non finiti", () => { const s = global.WealthPathValidation.sanitizeSettings({ ...base, initialInvestment: -1, monthlyContribution: Infinity, targetCapital: -10 }); assert(s.initialInvestment === 0 && s.monthlyContribution === md.defaults.monthlyContribution && s.targetCapital === 0, "sanificazione importi errata"); });
    test("sanificazione limita orizzonte, scenari e seed", () => { const s = global.WealthPathValidation.sanitizeSettings({ ...base, timeHorizonYears: 99.4, monteCarloScenarios: 0, seed: -1 }); assert(s.timeHorizonYears === md.defaults.maxTimeHorizonYears && s.monteCarloScenarios === md.defaults.monteCarloMinScenarios && s.seed === 0, "limiti non applicati"); });
    test("validazione rifiuta NaN, orizzonti frazionari e seed non interi", () => { const r = global.WealthPathValidation.validateSettings({ ...base, initialInvestment: NaN, timeHorizonYears: 1.5, seed: 1.2 }); assert(!r.valid && r.errors.length >= 3, "valori non validi accettati"); });
    test("ridistribuzione allocazione conserva il totale", () => { const allocation = global.WealthPathValidation.redistributeAllocation(base.allocation, "azionarioGlobale", 80); assert(approx(allocation.azionarioGlobale, 80) && approx(global.WealthPathValidation.allocationTotal(allocation), 100, 0.01) && Object.values(allocation).every((value) => value >= 0), "ridistribuzione errata"); });
    test("contributi seguono una progressione mensile esatta", () => { const values = global.calculateContributionsSeries(1000, 100, 2); assert(JSON.stringify(values) === JSON.stringify([1000, 1100, 1200]), "serie contributi errata"); });
    test("ribilanciamento ripristina tutti i pesi target", () => { const p = { azionarioGlobale: 1000, obblGovEU10: 0, obblGovEU3: 0, obblEUInflLinked: 0, obblCorporate: 0, materiePrime: 0, oro: 0 }; global.rebalancePortfolio(p, md.allocation); assert(md.assetClasses.every((asset) => approx(p[asset], md.allocation[asset] * 10)) && approx(Object.values(p).reduce((sum, value) => sum + value, 0), 1000), "pesi non ripristinati"); });
    test("seed noto produce la sequenza PRNG attesa", () => { const random = global.createPrng(7); const expected = [0.011704753153026104, 0.06195825757458806, 0.97690763277933]; assert(expected.every((value) => approx(random(), value, 1e-15)), "sequenza seed modificata"); });
    test("stesso seed e stessi parametri producono stessi risultati", () => { const a = global.simulatePortfolioPath({ ...base, seed: 7 }).finalValue; const b = global.simulatePortfolioPath({ ...base, seed: 7 }).finalValue; assert(approx(a, b), "seed non riproducibile"); });
    test("seed diverso produce risultati diversi", () => { const a = global.simulatePortfolioPath({ ...base, seed: 7 }).finalValue; const b = global.simulatePortfolioPath({ ...base, seed: 8 }).finalValue; assert(!approx(a, b), "seed diversi uguali"); });
    test("percentili interpolano estremi e quartili", () => { const values = [0, 10, 20, 30]; const expected = [[0, 0], [25, 7.5], [50, 15], [75, 22.5], [100, 30]]; assert(expected.every(([p, value]) => approx(global.percentileFromSorted(values, p), value)), "percentile errato"); });
    test("capitale versato calcolato correttamente", () => assert(approx(global.calculateContribValue({ initialInvestment: 1000, monthlyContribution: 100 }, 12), 2200), "versato errato"));
    test("massimo drawdown su serie nota", () => { const dd = global.PortfolioStatistics.maxDrawdown([100, 120, 90, 150]); assert(approx(dd.value, -0.25) && dd.month === 2, "drawdown errato"); });
    test("rendimento mensile neutralizza il contributo a inizio periodo", () => { const returns = global.PortfolioStatistics.monthlyReturns([100, 121], [100, 110]); assert(approx(returns[0], 0.1), "rendimento alterato dal contributo"); });
    test("TWRR annualizza correttamente un rendimento mensile costante", () => { const annualized = global.PortfolioStatistics.timeWeightedAnnualizedReturn(Array(12).fill(0.01)); assert(approx(annualized, Math.pow(1.01, 12) - 1), "TWRR errato"); });
    test("MWRR risolve un flusso finanziario noto", () => { const values = Array(25).fill(100); values[24] = 121; const contributions = Array(25).fill(100); const annualized = global.PortfolioStatistics.moneyWeightedAnnualizedReturn(values, contributions); assert(approx(annualized, 0.1, 1e-5), "MWRR errato"); });
    test("MWRR resta finito con un PAC pluriennale", () => { const s = global.simulatePortfolioPath({ ...base, fixedReturnsMode: true }); const annualized = global.PortfolioStatistics.moneyWeightedAnnualizedReturn(s.nominalValues, s.contributions); assert(Number.isFinite(annualized) && annualized > 0, "MWRR PAC errato"); });
    test("nessun NaN con investimento iniziale zero", () => { const s = global.simulatePortfolioPath({ ...base, initialInvestment: 0, monthlyContribution: 0 }); assert(s.nominalValues.every(Number.isFinite), "NaN rilevato"); });
    test("importazione JSON valida", () => { const r = global.WealthPathSettings.importSettings(JSON.stringify(base)); assert(r.success, "import valido rifiutato"); });
    test("rifiuto configurazione JSON non valida", () => { const r = global.WealthPathSettings.importSettings(JSON.stringify({ ...base, allocation: { azionarioGlobale: 100 } })); assert(!r.success, "import non valido accettato"); });
    test("rifiuto importazione con importi negativi", () => { const r = global.WealthPathSettings.importSettings(JSON.stringify({ ...base, initialInvestment: -1 })); assert(!r.success, "import negativo accettato"); });
    test("scenario macro interpola le fasi e mantiene l'ultimo regime", () => { const rows = global.buildMacroScenario("stagflation", 600); assert(approx(rows[0].inflation, 0.055) && approx(rows[29].inflation, 0.06) && approx(rows[30].policyRate, 0.055) && approx(rows[600].inflation, 0.022) && approx(rows[600].policyRate, 0.028), "scenario macro errato"); });
    test("Monte Carlo con un solo scenario", () => { const r = global.runMonteCarloGBM({ ...base, nScenarios: 1 }); assert(r.finalValues.length === 1 && Number.isFinite(r.stats.meanFinal), "MC singolo errato"); });
    test("Monte Carlo con scenario macro attivo", () => { const r = global.runMonteCarloGBM({ ...base, enableMacroAdjustments: true, selectedMacroScenario: "baseline", nScenarios: 3 }); assert(r.bands.p50.length === base.timeHorizonYears * 12 + 1, "MC macro errato"); });
    test("Monte Carlo produce solo valori finiti", () => { const r = global.runMonteCarloGBM({ ...base, timeHorizonYears: 1, nScenarios: 20 }); assert(r.finalValues.every(Number.isFinite) && Object.values(r.stats).every(Number.isFinite), "valori Monte Carlo non finiti"); });
    return results;
  }
  global.runSimulationTests = runSimulationTests;
})(window);
