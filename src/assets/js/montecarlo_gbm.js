/**
 * =============================================================================
 *  Monte Carlo GBM per simulazione di portafoglio
 * =============================================================================
 *
 * SCOPO
 * -----
 * Questo modulo fornisce una piccola "API interna" per eseguire simulazioni
 * Monte Carlo di un portafoglio usando un modello GBM (Geometric Brownian
 * Motion) per i rendimenti delle singole asset class.
 * Tutti i parametri vengono passati come
 * argomenti e il modulo non dipende da variabili globali esterne.
 *
 *
 * COME VIENE USATO
 * ----------------------------
 * 1) incluso nel index.html
 *
 *    <script src="montecarlo_gbm.js"></script>
 *
 * 2) chiamata:
 *
 *    const mcResult = runMonteCarloGBM({
 *      allocation: allocation,                 // oggetto che già usi, es: { azionarioGlobale: 30, ... }
 *      initialInvestment: initialInvestment,   // variabile globale che già usi
 *      monthlyContribution: monthlyContribution,
 *      timeHorizonYears: timeHorizon,          // orizzonte in anni della tua dashboard
 *      rebalanceEveryMonths: 12,               // ribilanciamento annuale (puoi cambiarlo o metterlo a 0 per disattivarlo)
 *      nScenarios: 500                         // numero di scenari Monte Carlo (es. 200–1000)
 *    });
 *
 * 4) Il risultato "mcResult" contiene:
 *
 *    mcResult.paths        -> array di scenari, uno per simulazione:
 *                             paths[i] è un array [valoreMese0, valoreMese1, ..., valoreMeseN]
 *
 *    mcResult.finalValues  -> array dei valori finali (uno per scenario)
 *
 *    mcResult.stats        -> oggetto con statistiche riassuntive:
 *                             {
 *                               meanFinal,    // media dei valori finali
 *                               medianFinal,  // mediana
 *                               p5,           // 5° percentile (scenario pessimistico)
 *                               p25,          // 25° percentile
 *                               p75,          // 75° percentile
 *                               p95           // 95° percentile (scenario molto positivo)
 *                             }
 *
 *
 * ESEMPI DI UTILIZZO 
 * ----------------------------------
 * Esempio 1: mostrare i risultati in alcuni box informativi
 *
 *    const mc = runMonteCarloGBM({
 *      allocation,
 *      initialInvestment,
 *      monthlyContribution,
 *      timeHorizonYears: timeHorizon,
 *      rebalanceEveryMonths: 12,
 *      nScenarios: 500
 *    });
 *
 *    // Puoi usare mc.stats per popolare box nella UI:
 *    // - "Valore finale mediano (Monte Carlo)": mc.stats.medianFinal
 *    // - "Scenario pessimistico (5° percentile)": mc.stats.p5
 *    // - "Scenario ottimistico (95° percentile)": mc.stats.p95
 *
 *
 * Esempio 2: calcolare la probabilità di raggiungere un obiettivo
 *
 *    const target = 250000; // ad esempio, obiettivo a 20 anni
 *    const successes = mc.finalValues.filter(v => v >= target).length;
 *    const probability = (successes / mc.finalValues.length) * 100;
 *    // probability = % di scenari in cui il portafoglio supera il target
 *
 *
 * Esempio 3: usare le "paths" per creare bande di confidenza nel grafico
 *
 *    - Puoi costruire, per ogni mese, il 5° / 50° / 95° percentile dei valori
 *      su tutti gli scenari, ottenendo tre serie:
 *      * serie P5  (banda bassa)
 *      * serie P50 (mediana)
 *      * serie P95 (banda alta)
 *    - Queste serie possono essere mostrate in un nuovo grafico lineare
 *      (Chart.js) come "area di incertezza" attorno al percorso mediano.
 *
 *
 * NOTA SUL MODELLO GBM
 * --------------------
 * Per ogni asset class il modello usa un GBM classico:
 *
 *    logReturn = (muAnn - 0.5 * sigmaAnn^2) * dt + sigmaAnn * sqrt(dt) * Z
 *
 * dove:
 *  - muAnn     = rendimento medio atteso annuo dell'asset
 *  - sigmaAnn  = volatilità annua dell'asset
 *  - dt        = 1/12 (passo temporale di un mese)
 *  - Z         = variabile casuale ~ N(0,1)
 *
 * Il moltiplicatore mensile è:
 *
 *    multiplier = exp(logReturn)
 *
 * che viene applicato al valore dell'asset per quel mese.
 *
 * Il portafoglio:
 *  - parte da initialInvestment ripartito secondo allocation,
 *  - aggiunge monthlyContribution ogni mese secondo allocation,
 *  - opzionalmente ribilancia ogni X mesi,
 *  - applica i rendimenti GBM per ciascuna asset class.
 *
 * =============================================================================
 *  IMPLEMENTAZIONE
 * =============================================================================
 */

/**
 * Parametri GBM annuali per ciascuna asset class.
 * Puoi modificare questi valori in base alle tue ipotesi di rendimento e
 * volatilità nel lungo periodo.
 * Si ipotizza di rendere queste impostazioni modificambili in una futura sezione "impostazioni avanzate"
 */
const gbmParams = {
  azionarioGlobale:   { muAnn: 0.07,  sigmaAnn: 0.15 }, // 7% rendimento atteso, 15% vol annua
  obblGovEU10:        { muAnn: 0.02,  sigmaAnn: 0.05 },
  obblGovEU3:         { muAnn: 0.015, sigmaAnn: 0.03 },
  obblEUInflLinked:   { muAnn: 0.02,  sigmaAnn: 0.04 },
  obblCorporate:      { muAnn: 0.03,  sigmaAnn: 0.07 },
  materiePrime:       { muAnn: 0.04,  sigmaAnn: 0.20 },
  oro:                { muAnn: 0.03,  sigmaAnn: 0.18 }
};

/**
 * Generatore di variabili N(0,1) con metodo Box–Muller.
 * Ritorna un numero casuale z ~ Normale(0,1).
 */
function rngNormal() {
  const random = window.randomSeedManager?.random
    ? () => window.randomSeedManager.random()
    : Math.random;
  let u1 = random();
  let u2 = random();
  let z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z;
}

/**
 * Restituisce il moltiplicatore mensile per una data assetClass usando il
 * modello GBM.
 *
 * Se per l'assetClass non sono definiti parametri in gbmParams, ritorna 1
 * (niente rendimento).
 */
function gbmMonthlyMultiplier(assetClass) {
  const p = gbmParams[assetClass];
  if (!p) return 1;

  const dt = 1.0 / 12.0; // passo temporale: 1 mese
  const mu = p.muAnn;
  const sigma = p.sigmaAnn;

  const z = rngNormal();
  const logReturn = (mu - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * z;

  return Math.exp(logReturn); // es. 1.02 = +2%
}

/**
 * Simula un singolo percorso di portafoglio con GBM.
 *
 * options = {
 *   allocation,              // oggetto { azionarioGlobale: 30, ... } che somma a 100
 *   initialInvestment,       // capitale iniziale
 *   monthlyContribution,     // PAC mensile
 *   timeHorizonYears,        // orizzonte in anni
 *   rebalanceEveryMonths     // opzionale, es. 12 per ribilanciamento annuale, null/0 per disattivare
 * }
 *
 * Ritorna un array di numeri:
 *   [valoreMese0, valoreMese1, ..., valoreMeseN]
 */
function simulatePortfolioPathGBM(options) {
  const {
    allocation,
    initialInvestment,
    monthlyContribution,
    timeHorizonYears,
    rebalanceEveryMonths = 12
  } = options;

  const months = Math.round(timeHorizonYears * 12);
  const assetClasses = Object.keys(allocation);

  // Inizializza il portafoglio per assetClass
  let portfolio = {};
  assetClasses.forEach(asset => {
    const weight = allocation[asset] / 100;
    portfolio[asset] = initialInvestment * weight;
  });

  const valuesByMonth = [];

  for (let m = 0; m <= months; m++) {
    // 1) Valore totale all'inizio del mese
    let totalValue = 0;
    assetClasses.forEach(asset => {
      totalValue += portfolio[asset];
    });
    valuesByMonth.push(totalValue);

    // Se siamo all'ultimo mese non proseguiamo oltre
    if (m === months) break;

    // 2) Aggiungi contributo mensile secondo allocation
    if (monthlyContribution > 0) {
      assetClasses.forEach(asset => {
        const weight = allocation[asset] / 100;
        portfolio[asset] += monthlyContribution * weight;
      });
    }

    // 3) Ribilanciamento opzionale
    if (rebalanceEveryMonths && rebalanceEveryMonths > 0 && m > 0 && (m % rebalanceEveryMonths === 0)) {
      let currentTotal = 0;
      assetClasses.forEach(asset => {
        currentTotal += portfolio[asset];
      });
      assetClasses.forEach(asset => {
        const weight = allocation[asset] / 100;
        portfolio[asset] = currentTotal * weight;
      });
    }

    // 4) Applica i rendimenti GBM per questo mese
    assetClasses.forEach(asset => {
      const multiplier = gbmMonthlyMultiplier(asset);
      portfolio[asset] *= multiplier;
    });
  }

  return valuesByMonth;
}

/**
 * Funzione di supporto per il calcolo dei percentili su un array ordinato.
 * arr  -> array di numeri ORDINATO in senso crescente
 * p    -> percentile desiderato (0–100)
 */
function percentileFromSorted(arr, p) {
  if (!arr.length) return null;
  const index = (p / 100) * (arr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return arr[lower];
  const weight = index - lower;
  return arr[lower] * (1 - weight) + arr[upper] * weight;
}

/**
 * Esegue una simulazione Monte Carlo GBM con N scenari.
 *
 * options = {
 *   allocation,
 *   initialInvestment,
 *   monthlyContribution,
 *   timeHorizonYears,
 *   rebalanceEveryMonths,
 *   nScenarios           // quante simulazioni (es. 500 o 1000)
 * }
 *
 * Ritorna:
 * {
 *   paths: [ [..valoriMese..], [..valoriMese..], ... ],
 *   finalValues: [v1, v2, ...],
 *   stats: {
 *     meanFinal,
 *     medianFinal,
 *     p5,
 *     p25,
 *     p75,
 *     p95
 *   }
 * }
 */
function runMonteCarloGBM(options) {
  const {
    allocation,
    initialInvestment,
    monthlyContribution,
    timeHorizonYears,
    rebalanceEveryMonths = 12,
    nScenarios = 1000
  } = options;

  const paths = [];
  const finalValues = [];

  for (let i = 0; i < nScenarios; i++) {
    const path = simulatePortfolioPathGBM({
      allocation,
      initialInvestment,
      monthlyContribution,
      timeHorizonYears,
      rebalanceEveryMonths
    });
    paths.push(path);
    finalValues.push(path[path.length - 1]);
  }

  // Calcolo statistiche sui valori finali
  const sorted = [...finalValues].sort((a, b) => a - b);
  const meanFinal = finalValues.reduce((a, b) => a + b, 0) / finalValues.length;

  const medianFinal = percentileFromSorted(sorted, 50);
  const p5         = percentileFromSorted(sorted, 5);
  const p25        = percentileFromSorted(sorted, 25);
  const p75        = percentileFromSorted(sorted, 75);
  const p95        = percentileFromSorted(sorted, 95);

  return {
    paths,
    finalValues,
    stats: {
      meanFinal,
      medianFinal,
      p5,
      p25,
      p75,
      p95
    }
  };
}
