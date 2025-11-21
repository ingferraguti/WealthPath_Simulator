(function (global) {
  const labels = {
    ui: {
      riskLevel: "Livello di Rischio",
      initialInvestment: "Investimento Iniziale",
      monthlyContribution: "Contributo Mensile",
      timeHorizonYears: "Orizzonte Temporale (anni)",
      totalContributions: "Contributi Totali",
      portfolioPerformance: "Andamento del Portafoglio",
      tableMonth: "Mese",
      tableValue: "valore",
      tableContributions: "contributi",
      tableMonthlyContribution: "contributo mensile",
      tableMonthlyIncrease: "incremento mensile",
      tableMonthlyPerformance: "performance mensile",
      tableTotalPerformance: "performance totale",
      tablePerformanceVsContrib: "performance > contrib",
      tableYear: "Anno",
      tableAnnualContribution: "contributo annuale",
      tableAnnualIncrease: "incremento annuale",
      tableAnnualPerformance: "performance annuale",
    },
    assets: {
      azionarioGlobale: "Azionario Globale",
      obblGovEU10: "Obbl. GOV EU 10+ Y",
      obblGovEU3: "Obbl. GOV EU 3-7 Y",
      obblEUInflLinked: "Obbl. EU infl. linked",
      obblCorporate: "Obbl. corporate",
      materiePrime: "Materie Prime",
      oro: "Oro",
    },
  };

  function getLabel(path) {
    if (!path) return "";

    return path.split(".").reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, labels) ?? path;
  }

  global.labels = labels;
  global.getLabel = getLabel;
})(window);
