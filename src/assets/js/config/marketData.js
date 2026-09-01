(function (global) {
  const marketData = {
    schemaVersion: 1,
    assetClasses: ["azionarioGlobale", "obblGovEU10", "obblGovEU3", "obblEUInflLinked", "obblCorporate", "materiePrime", "oro"],
    defaults: {
      initialInvestment: 10000,
      monthlyContribution: 200,
      timeHorizonYears: 10,
      maxTimeHorizonYears: 50,
      rebalanceFrequencyPerYear: 1,
      fixedReturnsMode: false,
      enableMacroAdjustments: false,
      selectedMacroScenario: "baseline",
      monteCarloScenarios: 1000,
      monteCarloMinScenarios: 1,
      monteCarloMaxScenarios: 5000,
      targetCapital: 100000,
      seed: 123456789
    },
    allowedRebalanceFrequencies: [0, 1, 2, 4, 12],
    allocation: {
      azionarioGlobale: 30,
      obblGovEU10: 15,
      obblGovEU3: 15,
      obblEUInflLinked: 15,
      obblCorporate: 10,
      materiePrime: 5,
      oro: 10
    },
    annualizedReturns: {
      azionarioGlobale: 0.07,
      obblGovEU10: 0.02,
      obblGovEU3: 0.015,
      obblEUInflLinked: 0.02,
      obblCorporate: 0.03,
      materiePrime: 0.04,
      oro: 0.03
    },
    annualizedVolatility: {
      azionarioGlobale: 0.15,
      obblGovEU10: 0.05,
      obblGovEU3: 0.03,
      obblEUInflLinked: 0.04,
      obblCorporate: 0.07,
      materiePrime: 0.20,
      oro: 0.18
    },
    // Matrice di correlazione strutturale, simmetrica e definita positiva.
    // L'ordine di righe e colonne coincide con assetClasses.
    correlationMatrix: [
      [1.00, -0.15, -0.05, 0.05, 0.55, 0.25, 0.05],
      [-0.15, 1.00, 0.75, 0.55, 0.35, -0.15, 0.10],
      [-0.05, 0.75, 1.00, 0.50, 0.45, -0.10, 0.05],
      [0.05, 0.55, 0.50, 1.00, 0.40, 0.30, 0.35],
      [0.55, 0.35, 0.45, 0.40, 1.00, 0.15, 0.10],
      [0.25, -0.15, -0.10, 0.30, 0.15, 1.00, 0.30],
      [0.05, 0.10, 0.05, 0.35, 0.10, 0.30, 1.00]
    ],
    fixedMonthlyMultipliers: {
      azionarioGlobale: 1.0125,
      obblGovEU10: 1.0035,
      obblGovEU3: 1.0025,
      obblEUInflLinked: 1.002,
      obblCorporate: 1.0045,
      materiePrime: 1.008,
      oro: 1.006
    },
    macroDriftConfig: {
      inflationAlpha: 0.5,
      policyRateAlpha: 0.5,
      realRateAlpha: 0.25
    },
    assetClassSensitivities: {
      azionarioGlobale: { realRateBeta: -0.6, policyRateBeta: -0.2 },
      obblGovEU10: { policyRateBeta: -1.1, realRateBeta: -0.4 },
      obblGovEU3: { policyRateBeta: -0.45, realRateBeta: -0.2 },
      obblEUInflLinked: { inflationBeta: 0.7, policyRateBeta: -0.35 },
      obblCorporate: { policyRateBeta: -0.55, realRateBeta: -0.25 },
      materiePrime: { inflationBeta: 0.8, realRateBeta: -0.15 },
      oro: { inflationBeta: 0.55, realRateBeta: -0.7 }
    },
    macroScenarioPresets: {
      baseline: {
        label: "Scenario base",
        description: "Inflazione moderata con normalizzazione graduale dei tassi.",
        macroPhases: [
          { name: "Normalizzazione", startMonth: 0, duration: 36, inflationFrom: 0.025, inflationTo: 0.022, rateFrom: 0.035, rateTo: 0.028, regimeTag: "normal" },
          { name: "Equilibrio", startMonth: 36, duration: 240, inflationFrom: 0.022, inflationTo: 0.02, rateFrom: 0.028, rateTo: 0.025, regimeTag: "equilibrium" }
        ]
      },
      stagflation: {
        label: "Stagflazione moderata",
        description: "Inflazione persistente e tassi elevati prima della normalizzazione.",
        macroPhases: [
          { name: "Inflazione persistente", startMonth: 0, duration: 30, inflationFrom: 0.055, inflationTo: 0.06, rateFrom: 0.045, rateTo: 0.055, regimeTag: "stagflation" },
          { name: "Rientro lento", startMonth: 30, duration: 60, inflationFrom: 0.06, inflationTo: 0.03, rateFrom: 0.055, rateTo: 0.035, regimeTag: "disinflation" },
          { name: "Equilibrio", startMonth: 90, duration: 240, inflationFrom: 0.03, inflationTo: 0.022, rateFrom: 0.035, rateTo: 0.028, regimeTag: "equilibrium" }
        ]
      },
      neutral: {
        label: "Neutro (flat)",
        description: "Inflazione e tassi costanti su ipotesi neutra.",
        macroPhases: [
          { name: "Neutro", startMonth: 0, duration: 360, inflationFrom: 0.02, inflationTo: 0.02, rateFrom: 0.025, rateTo: 0.025, regimeTag: "neutral" }
        ]
      }
    },
    futureIntegrations: {
      historicalMonthlyReturns: null,
      optimization: null,
      decumulation: null,
      taxation: null
    }
  };

  // TOBE: inserire qui le serie storiche mensili reali per ciascuna asset class.
  // Fonte attesa: dataset validato o servizio esterno scelto dal progetto.
  // Formato atteso: { assetClass: [{ date: "YYYY-MM", multiplier: 1.0123 }] }.
  marketData.futureIntegrations.historicalMonthlyReturns = null;

  // TOBE: definire l’obiettivo di ottimizzazione e i vincoli ammessi.
  // Fonte attesa: decisione di prodotto su rendimento, rischio, pesi minimi e pesi massimi.
  // Formato atteso: { objective, constraints, boundsByAsset }.
  marketData.futureIntegrations.optimization = null;

  // TOBE: definire le regole della fase di decumulo.
  // Fonte attesa: decisione di prodotto su prelievo iniziale, indicizzazione, durata e gestione dei fallimenti.
  // Formato atteso: { initialWithdrawal, inflationLinked, durationYears, withdrawalFrequency }.
  marketData.futureIntegrations.decumulation = null;

  // TOBE: definire il modello fiscale applicabile alle diverse asset class e al regime dell’utente.
  // Fonte attesa: specifiche fiscali validate.
  // Formato atteso: { assetClass: { capitalGainRate, incomeRate, notes } }.
  marketData.futureIntegrations.taxation = null;

  global.marketData = marketData;
})(window);
