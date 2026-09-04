(function (global) {
  const labels = {
    app: { title: "WealthPath Simulator", tagline: "Analysis and simulations for informed financial decisions" },
    ui: {
      settings: "Impostazioni", allocation: "Asset allocation", initialInvestment: "Investimento iniziale", monthlyContribution: "Contributo mensile",
      timeHorizonYears: "Orizzonte temporale", rebalance: "Ribilanciamento", fixedReturns: "Rendimenti fissi", gbmReturns: "Percorso GBM singolo",
      macroScenario: "Scenario macroeconomico", applyMacro: "Applica scenario macro", seed: "Seed", generateSeed: "Nuovo seed", applySeed: "Applica seed",
      totalContributions: "Capitale versato", finalValue: "Valore finale nominale", realFinalValue: "Valore finale reale", totalPerformance: "Performance totale",
      performancePercent: "Performance percentuale", riskMetrics: "Metriche di rischio e rendimento", monteCarlo: "Monte Carlo", scenarios: "Numero scenari",
      targetCapital: "Capitale obiettivo", runMonteCarlo: "Esegui Monte Carlo", exportPdf: "Esporta PDF", resetDefaults: "Ripristina impostazioni predefinite",
      exportConfig: "Esporta configurazione", importConfig: "Importa configurazione", monthlyTable: "Tabella mensile", annualTable: "Tabella annuale",
      mainChart: "Andamento del portafoglio", donutChart: "Composizione", validationOk: "Parametri validi", importSuccess: "Configurazione importata correttamente.",
      noMonteCarlo: "Monte Carlo non ancora eseguito.", annualizedReturn: "Rendimento TWRR annualizzato", moneyWeightedReturn: "XIRR annualizzato",
      annualizedVolatility: "Volatilità realizzata annualizzata", correlationVolatility: "Rischio ex ante correlato", diversificationBenefit: "Beneficio diversificazione", maxDrawdown: "Massimo drawdown", worstMonth: "Peggior mese", positiveMonths: "Mesi positivi"
    },
    assets: {
      azionarioGlobale: "Azionario globale", obblGovEU10: "Obbl. governative EU 10+ Y", obblGovEU3: "Obbl. governative EU 3-7 Y",
      obblEUInflLinked: "Obbl. EU inflation linked", obblCorporate: "Obbl. corporate", materiePrime: "Materie prime", oro: "Oro"
    },
    rebalance: { 0: "Mai", 1: "Annuale", 2: "Semestrale", 4: "Trimestrale", 12: "Mensile" }
  };
  function getLabel(path) {
    return String(path || "").split(".").reduce((acc, key) => acc && acc[key] !== undefined ? acc[key] : undefined, labels) || path || "";
  }
  global.labels = labels;
  global.getLabel = getLabel;
})(window);
