// FUNZIONI CALCOLO PORTAFOGLIO
// Questo file raccoglie funzioni di supporto per simulare l'evoluzione di un
// portafoglio in base a contributi periodici e rendimenti mensili.

// Sequenza di rendimenti simulati utilizzata da calculateReturnsByMonth.
// Viene rigenerata ad ogni renderDashboard per congelare un percorso unico
// (mock) di rendimenti mensili per asset class; in seguito verrà sostituita dal
// moltiplicatore GBM reale.
let gbmReturnsByMonth = {};

function getPortfolioState(overrides = {}) {
    return {
        allocation,
        initialInvestment,
        monthlyContribution,
        timeHorizon,
        returnFunctions,
        priceRatios,
        gbmReturnsByMonth,
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


// Genera una sequenza congelata di rendimenti mensili (mock) per ogni asset class.
// La sequenza è indicizzata per mese e asset e viene letta da calculateReturnsByMonth
// così che tutte le chiamate a calculatePortfolioValue condividano lo stesso percorso
// durante un renderDashboard. In questa fase i moltiplicatori sono statici; il GBM
// reale sostituirà la logica di assegnazione dei valori mock.
function generateSimulatedReturns(state) {
    const { allocation, timeHorizon } = state;
    const numeroMesi = timeHorizon * 12;
    const simulatedReturns = [];

    for (let mese = 0; mese <= numeroMesi; mese++) {
        simulatedReturns[mese] = {};

        Object.keys(allocation).forEach(assetClass => {
            const mockReturn = assetClass === 'azionarioGlobale' ? 1.01 : 1.00;
            simulatedReturns[mese][assetClass] = mockReturn;
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
    const returns = returnFunctionsToUse.map(func => {
        const { assetClass, calculateReturn } = func;

        // Calcola il rendimento per l'asset class utilizzando il mese come input
        const returnValue =
            returnsByMonth?.[mese]?.[assetClass] !== undefined
                ? returnsByMonth[mese][assetClass]
                : calculateReturn(mese);

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

        const { allocation, initialInvestment, monthlyContribution, returnFunctions } = state;

        let portafoglio = calculateInvestmentComponents(allocation, initialInvestment);

        for (let i = 0; i <= mese; i++)  {
                //rendimenti di questo mese
                let returns = calculateReturnsByMonth(state, i, returnFunctions);

                portafoglio = addMonthlyContribution(portafoglio, allocation, monthlyContribution);
		
		//bilanciamento annuale
		//if (i % 12 === 0) {portafoglio = calculateInvestmentComponents(allocation, calculateTotalInvestment(portafoglio));}
		
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
