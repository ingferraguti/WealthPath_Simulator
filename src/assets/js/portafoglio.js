// FUNZIONI CALCOLO PORTAFOGLIO
// Questo file raccoglie funzioni di supporto per simulare l'evoluzione di un
// portafoglio in base a contributi periodici e rendimenti mensili.

// Sequenza di rendimenti simulati utilizzata da calculateReturnsByMonth.
// Viene generata al primo renderDashboard, poi riutilizzata finché non
// viene chiesto esplicitamente di creare una nuova simulazione. Quando il
// debug è disattivato, l'assegnazione avviene tramite un percorso GBM
// monoscenario; in caso contrario vengono usati moltiplicatori deterministici.
let gbmReturnsByMonth = {};
let macroDataMissingLogged = false;
// Parametri annualizzati (media e volatilità) per il GBM per asset class note.
// Se un'asset class non compare, la simulazione ricadrà su un comportamento
// deterministico, mantenendo l'attuale fallback mock/statico.
const gbmParams = {
    azionarioGlobale: { muAnn: 0.07, sigmaAnn: 0.15 },
    obblGovEU10: { muAnn: 0.02, sigmaAnn: 0.05 },
    obblGovEU3: { muAnn: 0.015, sigmaAnn: 0.03 },
    obblEUInflLinked: { muAnn: 0.02, sigmaAnn: 0.04 },
    obblCorporate: { muAnn: 0.03, sigmaAnn: 0.07 },
    materiePrime: { muAnn: 0.04, sigmaAnn: 0.20 },
    oro: { muAnn: 0.03, sigmaAnn: 0.18 }
};
const fixedReturnByAsset = {
    azionarioGlobale: 1.0125,
    obblGovEU10: 1.0035,
    obblGovEU3: 1.0025,
    obblEUInflLinked: 1.002,
    obblCorporate: 1.0045,
    materiePrime: 1.008,
    oro: 1.006,
};

// Generatore Box-Muller per z ~ N(0,1), utilizzato dal modello GBM mensile.
function rngNormal() {
    const u1 = window.randomSeedManager?.random() ?? Math.random();
    const u2 = window.randomSeedManager?.random() ?? Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0;
}

// Calcola il moltiplicatore mensile GBM per l'asset indicato.
// Se l'asset non è parametrizzato, restituisce null così che il chiamante
// possa usare la logica deterministica esistente.
function gbmMonthlyMultiplier(assetClass, options = {}) {
    const params = gbmParams[assetClass];
    if (!params) {
        return null;
    }

    const { muAnn, sigmaAnn } = params;
    const {
        macroState,
        sensitivitiesForAsset = {},
        enableMacroScenario = false,
        macroDriftConfig = {},
    } = options || {};

    const { inflationBeta = 0, policyRateBeta = 0, realRateBeta = 0 } = sensitivitiesForAsset || {};
    const { inflationAlpha, policyRateAlpha, realRateAlpha } = {
        ...defaultMacroDriftConfig,
        ...macroDriftConfig,
    };

    let adjustedMu = muAnn;

    if (enableMacroScenario && macroState) {
        const inflationImpact = (macroState.inflation ?? 0) * inflationBeta * inflationAlpha;
        const policyRateImpact = (macroState.policyRate ?? 0) * policyRateBeta * policyRateAlpha;
        const realRateValue = macroState.realRate ?? ((macroState.policyRate ?? 0) - (macroState.inflation ?? 0));
        const realRateImpact = realRateValue * realRateBeta * realRateAlpha;

        adjustedMu += inflationImpact + policyRateImpact + realRateImpact;
    }

    const dt = 1 / 12;
    const z = rngNormal();
    const logReturn = (adjustedMu - 0.5 * Math.pow(sigmaAnn, 2)) * dt + sigmaAnn * Math.sqrt(dt) * z;
    return Math.exp(logReturn);
}

const defaultMacroTiltConfig = {
    additiveScale: 0.05,
    multiplicativeScale: 0.5,
};

const defaultMacroDriftConfig = {
    inflationAlpha: 0.5,
    policyRateAlpha: 0.5,
    realRateAlpha: 0.25,
};

function applyMacroTilt(baseReturn, macroState, sensitivitiesForAsset = {}, macroTilt = {}) {
    // Defensive fallback: if any of the inputs is missing or not a finite number, keep
    // the original return. This preserves backward compatibility when the macro
    // scenario is disabled or when legacy call sites don't provide sensitivities
    // or macro tilt settings.
    if (!macroState || !sensitivitiesForAsset || !macroTilt) {
        return baseReturn;
    }
    if (!isFinite(baseReturn)) {
        return baseReturn;
    }

    // Extract betas: they describe how the asset reacts to macro factors. Defaults
    // are zero to avoid accidental amplification when sensitivities are missing.
    const { inflationBeta = 0, policyRateBeta = 0, realRateBeta = 0 } = sensitivitiesForAsset || {};

    // Extract tilt scales with conservative defaults. The additive scale keeps the
    // macro contribution small (a “tilt”, not a full re-pricing), while the
    // multiplicative scale attenuates the effect further to avoid overpowering the
    // base simulation.
    const {
        additiveScale = defaultMacroTiltConfig.additiveScale,
        multiplicativeScale = defaultMacroTiltConfig.multiplicativeScale,
    } = macroTilt || {};

    // Combine macro factors into a single signal. Inflation and rates influence
    // returns differently across asset classes; multiplying by betas captures that
    // directional sensitivity while remaining linear and easy to tune.
    const signal =
        (macroState?.inflation ?? 0) * inflationBeta +
        (macroState?.policyRate ?? 0) * policyRateBeta +
        (macroState?.realRate ?? 0) * realRateBeta;

    // Translate the macro signal into a small additive tilt. This is intentionally
    // lightweight to avoid double-counting returns already produced by the base
    // model (including inflation effects baked into certain asset classes).
    const additiveTilt = signal * additiveScale;

    // Apply the tilt as a mild multiplicative adjustment. Taxes/inflation can erode
    // returns, while favorable macro winds can slightly enhance them; scaling keeps
    // this effect subtle and easy to calibrate.
    const adjusted = baseReturn * (1 + additiveTilt * multiplicativeScale);

    return adjusted;
}

function getPortfolioState(overrides = {}) {
    return {
        allocation,
        initialInvestment,
        monthlyContribution,
        timeHorizon,
        rebalanceFrequencyPerYear,
        rebalanceEveryMonths,
        returnFunctions,
        priceRatios,
        gbmReturnsByMonth,
        macroPhases,
        macroByMonth,
        useFixedReturnMode,
        assetClassSensitivities,
        macroTilt,
        macroDrift,
        enableMacroScenario,
        enableMacroAdjustments,
        selectedMacroScenario,
        ...overrides,
    };
}

// Calcola il capitale totale dopo "i" mesi sommando al capitale iniziale la
// contribuzione mensile utilizzando i valori forniti nello stato.
function calculateContribValue(state, i) {
        const { initialInvestment, monthlyContribution } = state;
        return initialInvestment + (monthlyContribution * i);
}


// Distribuisce la contribuzione mensile in base all'allocazione percentuale
// dell'asset class specificata, leggendo i valori dallo stato fornito.
function dumbMCA (state, assetClass){
        const { allocation, monthlyContribution } = state;
        return monthlyContribution * (allocation[assetClass] / 100);
}



/* calculateInvestmentComponents
   Suddivide l'investimento iniziale fra le asset class indicate in `allocation`.
   Controlla che la somma delle percentuali sia esattamente 100 e restituisce un
   array di oggetti { assetClass, investment } che rappresentano il portafoglio
   allocato. Può essere richiamata sia per inizializzare sia per ribilanciare.
*/
function calculateInvestmentComponents(allocation, initialInvestment) {
    // Verifica che la somma delle allocazioni sia pari a 100
    const totalAllocation = Object.values(allocation).reduce((sum, percentage) => sum + percentage, 0);
    if (totalAllocation !== 100) {
        throw new Error("La somma delle allocazioni deve essere pari a 100.");
    }

    // Creazione del portafoglio con le allocazioni calcolate
    const portafoglio = Object.entries(allocation).map(([assetClass, percentage]) => ({
        assetClass: assetClass,
        investment: (percentage / 100) * initialInvestment
    }));

    return portafoglio;
}


// Genera una sequenza congelata di rendimenti mensili per ogni asset class.
// Ad ogni renderDashboard viene creato un singolo percorso GBM completo per gli
// asset parametrizzati, così che calculatePortfolioValue condivida lo stesso
// scenario stocastico in tutte le chiamate. Gli asset non parametrizzati
// continuano a usare il fallback deterministico (mock) per mantenere la
// compatibilità con il comportamento precedente e per future estensioni
// multi-scenario.
function generateSimulatedReturns(state) {
    const { allocation, timeHorizon, useFixedReturnMode } = state;
    const macroByMonth = state.macroByMonth;
    const sensitivities = state.assetClassSensitivities || {};
    const macroDrift = state.macroDrift || defaultMacroDriftConfig;
    const enableMacroScenario = state.enableMacroScenario ?? state.enableMacroAdjustments ?? false;
    const numeroMesi = timeHorizon * 12;
    const simulatedReturns = [];

    for (let mese = 0; mese <= numeroMesi; mese++) {
        simulatedReturns[mese] = {};

        const macroState = enableMacroScenario ? macroByMonth?.[mese] : undefined;

        Object.keys(allocation).forEach(assetClass => {
            if (useFixedReturnMode) {
                simulatedReturns[mese][assetClass] = fixedReturnByAsset[assetClass] ?? 1;
            } else {
                // Prima tentiamo il GBM: se esistono parametri generiamo un moltiplicatore
                // stocastico; altrimenti applichiamo il vecchio comportamento deterministico
                // (mock) per mantenere coerenza con asset non coperti.
                const sensitivitiesForAsset = enableMacroScenario ? sensitivities[assetClass] : undefined;
                const gbmOptions =
                    enableMacroScenario && macroState
                        ? { macroState, sensitivitiesForAsset, enableMacroScenario, macroDriftConfig: macroDrift }
                        : undefined;
                const gbmValue = gbmOptions
                    ? gbmMonthlyMultiplier(assetClass, gbmOptions)
                    : gbmMonthlyMultiplier(assetClass);
                if (gbmValue !== null && gbmValue !== undefined) {
                    simulatedReturns[mese][assetClass] = gbmValue;
                } else if (assetClass === 'azionarioGlobale') {
                    simulatedReturns[mese][assetClass] = 1.01;
                } else {
                    simulatedReturns[mese][assetClass] = 1.0;
                }
            }
        });
    }

    gbmReturnsByMonth = simulatedReturns;
    state.gbmReturnsByMonth = simulatedReturns;
}


/* calculateReturnsByMonth
   Riceve un indice di mese e un array di oggetti { assetClass, calculateReturn }
   e costruisce i rendimenti chiamando `calculateReturn(mese)` per ogni asset
   class. I valori prodotti alimentano calculatePortfolioReturns.
*/
function calculateReturnsByMonth(state, mese, returnFunctions) {
    // Calcola i rendimenti per ciascun asset class utilizzando le funzioni fornite
    const returnsByMonth = state.gbmReturnsByMonth || {};
    const returnFunctionsToUse = returnFunctions || state.returnFunctions || [];
    const macroByMonth = state.macroByMonth;
    const sensitivities = state.assetClassSensitivities || {};
    const macroTilt = state.macroTilt;
    const enableMacroAdjustments = state.enableMacroScenario ?? state.enableMacroAdjustments ?? false;
    const macroState = enableMacroAdjustments ? macroByMonth?.[mese] : undefined;

    if (enableMacroAdjustments && !macroState && !macroDataMissingLogged) {
        console.debug("Macro scenario non disponibile: i rendimenti verranno calcolati senza aggiustamenti macro.");
        macroDataMissingLogged = true;
    }

    const returns = returnFunctionsToUse.map(func => {
        const { assetClass, calculateReturn } = func;
        const sensitivitiesForAsset = sensitivities[assetClass];

        // Calcola il rendimento per l'asset class utilizzando il mese come input
        const simulatedReturn = returnsByMonth?.[mese]?.[assetClass];
        const baseReturn =
            simulatedReturn !== undefined
                ? simulatedReturn
                : calculateReturn(mese, { macroState, sensitivitiesForAsset, baseReturn: simulatedReturn });

        const returnValue = enableMacroAdjustments
            ? applyMacroTilt(baseReturn, macroState, sensitivitiesForAsset, macroTilt)
            : baseReturn;

        return {
            assetClass: assetClass,
            return: returnValue
        };
    });

    return returns;
}







/* addMonthlyContribution
   Aggiunge la contribuzione mensile agli asset già presenti in `portafoglio`.
   La quota da distribuire su ogni asset class dipende dall'allocazione
   percentuale definita in `allocation`. Lavora in-place aggiornando
   direttamente le proprietà `investment`.
*/
function addMonthlyContribution(portafoglio, allocation, monthlyContribution) {
    // Calcola la somma totale delle allocazioni nell'oggetto allocation
    const totalAllocation = Object.values(allocation).reduce((sum, percentage) => sum + percentage, 0);
    if (totalAllocation !== 100) {
        throw new Error("La somma delle allocazioni deve essere pari a 100.");
    }

    // Modifica direttamente il valore di investment nel portafoglio
    portafoglio.forEach(asset => {
        // Trova la percentuale di allocazione per l'asset class
        const assetAllocation = allocation[asset.assetClass] || 0;

        // Calcola la quota mensile da aggiungere all'investment
        const contribution = (assetAllocation / 100) * monthlyContribution;

        // Aggiorna direttamente il valore di investment
        asset.investment += contribution;
    });

    return portafoglio; // Restituisce il portafoglio aggiornato (modificato in-place)
}











/* calculatePortfolioReturns
   Combina il portafoglio corrente con i rendimenti calcolati per ciascuna
   asset class. Crea un nuovo array in cui `investment` è aggiornato
   moltiplicando il capitale attuale per il rendimento del mese.

// Esempio di utilizzo
const portafoglio = [
    { assetClass: "Azioni", investment: 5000 },
    { assetClass: "Obbligazioni", investment: 3000 },
    { assetClass: "Oro", investment: 1000 },
    { assetClass: "Cash", investment: 1000 }
];

const returns = [
    { assetClass: "Azioni", return: 0.08 },  // 8% di rendimento
    { assetClass: "Obbligazioni", return: 0.03 }, // 3% di rendimento
    { assetClass: "Oro", return: 0.05 }, // 5% di rendimento
    { assetClass: "Cash", return: 0.01 } // 1% di rendimento
];

// Calcolo del portafoglio con i rendimenti
const updatedPortafoglio = calculatePortfolioReturns(portafoglio, returns);


ritorno:
[
    { assetClass: "Azioni", investment: 5000, rendimentoTotale: "400.00" },
    { assetClass: "Obbligazioni", investment: 3000, rendimentoTotale: "90.00" },
    { assetClass: "Oro", investment: 1000, rendimentoTotale: "50.00" },
    { assetClass: "Cash", investment: 1000, rendimentoTotale: "10.00" }
]

*/

function calculatePortfolioReturns(portafoglio, returns) {
    // Creazione di un nuovo portafoglio con i rendimenti calcolati
    const updatedPortafoglio = portafoglio.map(asset => {
        // Trova il rendimento corrispondente per l'asset class
        const assetReturn = returns.find(r => r.assetClass === asset.assetClass);
        if (!assetReturn) {
            throw new Error(`Rendimento non trovato per l'asset class: ${asset.assetClass}`);
        }

        // Calcola il rendimento totale per l'asset
        const rendimentoTotale = asset.investment * assetReturn.return;
		

        return {
            ...asset,
            investment: rendimentoTotale // Arrotonda a due decimali
        };
    });

    return updatedPortafoglio;
}

function calculateTotalInvestment(portafoglio) {
    // Utilizza reduce per sommare tutti gli investimenti
	console.log(portafoglio.reduce((sum, asset) => sum + asset.investment, 0));
    return portafoglio.reduce((sum, asset) => sum + asset.investment, 0);
   
}


// Simula mese per mese l'andamento del portafoglio applicando contributi e rendimenti
// calcolati da `returnFunctions` presenti nello stato fornito.
function calculatePortfolioValue(state, mese) {

        const { allocation, initialInvestment, monthlyContribution, returnFunctions, rebalanceEveryMonths } = state;

        let portafoglio = calculateInvestmentComponents(allocation, initialInvestment);

        if (mese <= 0) {
                return initialInvestment;
        }

        for (let i = 1; i <= mese; i++)  {
                //rendimenti di questo mese
                let returns = calculateReturnsByMonth(state, i, returnFunctions);

                portafoglio = addMonthlyContribution(portafoglio, allocation, monthlyContribution);

                // Il ribilanciamento è opzionale: la frequenza, espressa in mesi, proviene da state.rebalanceEveryMonths
                if (rebalanceEveryMonths > 0 && i > 0 && i % rebalanceEveryMonths === 0) {
                        const total = calculateTotalInvestment(portafoglio);
                        portafoglio = calculateInvestmentComponents(allocation, total);
                }

                //applichiamo i rendimenti al portafoglio
                portafoglio = calculatePortfolioReturns(portafoglio, returns)


        }
	return calculateTotalInvestment(portafoglio);
	
}





// Funzione per calcolare il valore del portafoglio considerando le performance precedenti
// calculatePortfolioValue( MESE )
// Variante semplificata che separa componente azionaria, oro e obbligazionaria
// e applica i rapporti di prezzo mensili alla sola parte azionaria.

function calculatePortfolioValue2(state, i) {

                const { allocation, initialInvestment, monthlyContribution, priceRatios } = state;

                // Calcola il valore iniziale della parte azionaria del portafoglio in base all'allocazione azionaria
                let azionariaValue = initialInvestment * (allocation['azionarioGlobale'] / 100);
		
		let oroValue = initialInvestment * (allocation['oro'] / 100);
	
		// Calcola il valore iniziale della parte obbligazionaria del portafoglio in base all'allocazione obbligazionaria
		let obbligazionariaValue = initialInvestment * ((100 - (allocation['azionarioGlobale']+allocation['oro'])) / 100);
	
		// Calcola il valore totale iniziale del portafoglio come somma delle parti azionaria e obbligazionaria
		//let totalValue = azionariaValue + obbligazionariaValue;
		let totalValue = initialInvestment;
	
	if (i<=0){
	
		return initialInvestment;
	}
    
	else{
		
                        // Itera fino al mese 'i' per calcolare il valore del portafoglio mese per mese
                        for (let month = 0; month <= i; month++) {
		
			// Aggiorna il valore della parte azionaria del portafoglio applicando il rendimento del mese corrente
			azionariaValue *= priceRatios[month % priceRatios.length];
		
			// Calcola il contributo mensile per la parte azionaria del portafoglio, tenendo conto del rendimento del mese corrente
			let monthlyAzionariaContribution = monthlyContribution * (allocation['azionarioGlobale'] / 100) * priceRatios[month % priceRatios.length];
        
			// Calcola il contributo mensile per la parte obbligazionaria del portafoglio
			let monthlyObbligazionariaContribution = monthlyContribution * ((100 - allocation['azionarioGlobale']) / 100);
       
			// Aggiorna il valore totale del portafoglio sommando i valori azionari, obbligazionari e i contributi mensili
			totalValue = azionariaValue + obbligazionariaValue + monthlyAzionariaContribution + monthlyObbligazionariaContribution;

			// Accumula i contributi mensili sulle rispettive componenti per il mese successivo
			azionariaValue += monthlyAzionariaContribution;
			obbligazionariaValue += monthlyObbligazionariaContribution
		}
	
		
		
	}
    
    // Ritorna il valore totale del portafoglio dopo aver applicato tutti i rendimenti e contributi fino al mese 'i'
    return totalValue;
}
