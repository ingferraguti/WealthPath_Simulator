// FUNZIONI CALCOLO PORTAFOGLIO


function calculateContribValue(i) {
	return initialInvestment + (monthlyContribution * i);
}


//dumbMonthlyContributionAllocation
function dumbMCA (assetClass){
	return monthlyContribution * (allocation[assetClass] / 100);
}



/*    calculateInvestmentComponents

// Esempio di utilizzo
const allocation = {
    azionarioGlobale: 30,
    obblGovEU10: 20,
    obblGovEU3: 20,
    obblEUInflLinked: 15,
    obblCorporate: 10,
    materiePrime: 5,
    oro: 10,
};

const initialInvestment = 10000;

// Calcolo del portafoglio
const portafoglio = calculateInvestmentComponents(allocation, initialInvestment);


OUT: 
[
    { assetClass: "Azioni", investment: 5000 },
    { assetClass: "Obbligazioni", investment: 3000 },
    { assetClass: "Oro", investment: 1000 },
    { assetClass: "Cash", investment: 1000 }
]

si può usare per la allocazione iniziale e per simulare un ribilanciamento

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



/*   calculateReturnsByMonth

// Esempio di utilizzo
const mese = 6; 

// Array di funzioni per calcolare i rendimenti
const returnFunctions = [
   ...
];

// Calcolo dei rendimenti
const returns = calculateReturnsByMonth(mese, returnFunctions);

OUT:
[
    { assetClass: "Azioni", return: 0.0594 },
    { assetClass: "Obbligazioni", return: 0.0249 },
    { assetClass: "Oro", return: 0.0335 },
    { assetClass: "Cash", return: 0.01 }
]

*/

function calculateReturnsByMonth(mese, returnFunctions) {
    // Calcola i rendimenti per ciascun asset class utilizzando le funzioni fornite
    const returns = returnFunctions.map(func => {
        const { assetClass, calculateReturn } = func;

        // Calcola il rendimento per l'asset class utilizzando il mese come input
        const returnValue = calculateReturn(mese);

        return {
            assetClass: assetClass,
            return: returnValue
        };
    });

    return returns;
}







/*   addMonthlyContribution


// Esempio di utilizzo
const portafoglio = [
    { assetClass: "azionarioGlobale", investment: 5000 },
    { assetClass: "obblGovEU10", investment: 3000 },
    { assetClass: "oro", investment: 1000 },
    { assetClass: "cash", investment: 1000 }
];

const allocation = {
    azionarioGlobale: 30,
    obblGovEU10: 20,
    obblGovEU3: 20,
    obblEUInflLinked: 15,
    obblCorporate: 10,
    materiePrime: 5,
    oro: 10,
};

const monthlyContribution = 1000;

// Aggiorna il portafoglio con la contribuzione mensile
const updatedPortafoglio = addMonthlyContribution(portafoglio, allocation, monthlyContribution);

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
        const assetAllocation = allocation[asset.assetClass.toLowerCase()] || 0;

        // Calcola la quota mensile da aggiungere all'investment
        const contribution = (assetAllocation / 100) * monthlyContribution;

        // Aggiorna direttamente il valore di investment
        asset.investment += contribution;
    });

    return portafoglio; // Restituisce il portafoglio aggiornato (modificato in-place)
}











/*



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


function calculatePortfolioValue(mese) {
	
	
	let portafoglio = calculateInvestmentComponents(allocation, initialInvestment);
    
	for (let i = 0; i <= mese; i++)  {
		//rendimenti di questo mese
		let returns = calculateReturnsByMonth(i, returnFunctions);
		
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


function calculatePortfolioValue2(i) {
	
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
		
			azionariaValue += monthlyAzionariaContribution;
			obbligazionariaValue += monthlyObbligazionariaContribution
		}
	
		
		
	}
    
    // Ritorna il valore totale del portafoglio dopo aver applicato tutti i rendimenti e contributi fino al mese 'i'
    return totalValue;
}
