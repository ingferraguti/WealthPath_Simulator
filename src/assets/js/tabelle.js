//TABELLE



function qaz(mese){
	if(mese==0)return 0; 
	return monthlyContribution;
}



function wsx(mese){

        const portfolioState = getPortfolioState();

        if (mese <= 0) {
                return 'NO';
        }

        const previousValue = calculatePortfolioValue(portfolioState, mese - 1);
        const currentValue = calculatePortfolioValue(portfolioState, mese);
        const monthlyContributionAmount = qaz(mese);
        const monthlyPerformanceAmount = currentValue - previousValue - monthlyContributionAmount;

        if (monthlyPerformanceAmount > monthlyContributionAmount) return 'SI';

        return 'NO';
}

function creaTabella(numeroMesi) {
            // Pulisce il contenitore prima di generare una nuova tabella mensile
            const tableContainer = document.getElementById('table-container');
            if (!tableContainer) {
                return;
            }

            const portfolioState = getPortfolioState();

            tableContainer.innerHTML = '';

            // Crea la tabella e l'intestazione
            const table = document.createElement('table');
            table.border = 1;
            table.style.width = '100%';

            const header = table.createTHead();
            const headerRow = header.insertRow();
            headerRow.insertCell().innerText = getLabel('ui.tableMonth');
            headerRow.insertCell().innerText = getLabel('ui.tableValue');
            headerRow.insertCell().innerText = getLabel('ui.tableContributions');
                        headerRow.insertCell().innerText = getLabel('ui.tableMonthlyContribution');
                        headerRow.insertCell().innerText = getLabel('ui.tableMonthlyIncrease');
                        headerRow.insertCell().innerText = getLabel('ui.tableMonthlyPerformance');
                        headerRow.insertCell().innerText = getLabel('ui.tableTotalPerformance');
                        headerRow.insertCell().innerText = getLabel('ui.tablePerformanceVsContrib');
			
			

            // Popola la tabella con i dati
            const tbody = table.createTBody();
            for (let mese = 0; mese <= numeroMesi; mese++) {
                const row = tbody.insertRow();

                const previousValue = calculatePortfolioValue(portfolioState, mese - 1);
                const currentValue = calculatePortfolioValue(portfolioState, mese);
                const monthlyContributionAmount = qaz(mese);
                const investedCapital = calculateContribValue(portfolioState, mese);
                const monthlyIncrease = currentValue - previousValue;
                const monthlyPerformance = (((monthlyIncrease - monthlyContributionAmount) / previousValue) * 100).toFixed(2);

                // Prima colonna: numero crescente del mese
                row.insertCell().innerText = mese;

                // Seconda colonna: risultato di funzione1(mese)
                row.insertCell().innerText = euro.format(currentValue);

                // Terza colonna: risultato di funzione2(mese)
                row.insertCell().innerText = euro.format(investedCapital - portfolioState.initialInvestment);

                                // Terza colonna: risultato di funzione2(mese)
                row.insertCell().innerText = euro.format(monthlyContributionAmount);

                                // Terza colonna: risultato di funzione2(mese)
                row.insertCell().innerText = euro.format(monthlyIncrease);

                                // Terza colonna: risultato di funzione2(mese)
                row.insertCell().innerText = monthlyPerformance;
				
				// Terza colonna: risultato di funzione2(mese)
                row.insertCell().innerText = (((currentValue / investedCapital)-1)*100).toFixed(2);
				
				row.insertCell().innerText = wsx(mese)  ;
            }

            // Aggiungi la tabella al contenitore esistente nel DOM
            tableContainer.appendChild(table);
        }
		
		
		
		
		
function creaTabella2(numeroAnni) {
            // Pulisce il contenitore prima di generare una nuova tabella annuale
            const annualTableContainer = document.getElementById('tablecontaineranno');
            if (!annualTableContainer) {
                return;
            }

            const portfolioState = getPortfolioState();

            annualTableContainer.innerHTML = '';

            // Crea la tabella e l'intestazione
            const table2 = document.createElement('table');
            table2.border = 1;
            table2.style.width = '100%';

            const header = table2.createTHead();
            const headerRow = header.insertRow();
            headerRow.insertCell().innerText = getLabel('ui.tableYear');
            headerRow.insertCell().innerText = getLabel('ui.tableValue');
            headerRow.insertCell().innerText = getLabel('ui.tableContributions');
                        headerRow.insertCell().innerText = getLabel('ui.tableAnnualContribution');
                        headerRow.insertCell().innerText = getLabel('ui.tableAnnualIncrease');
                        headerRow.insertCell().innerText = getLabel('ui.tableAnnualPerformance');
                        headerRow.insertCell().innerText = getLabel('ui.tableTotalPerformance');
			
			
			
			let  incremento=0;

            // Popola la tabella con i dati
            const tbody = table2.createTBody();
            for (let mese = 0; mese <= numeroAnni; mese++) {
                const row = tbody.insertRow();

                // Prima colonna: numero crescente del mese
                row.insertCell().innerText = mese;

                // Seconda colonna: risultato di funzione1(mese)
                row.insertCell().innerText = euro.format(calculatePortfolioValue(portfolioState, mese*12));

                // Terza colonna: risultato di funzione2(mese)
                row.insertCell().innerText = euro.format(calculateContribValue(portfolioState, mese*12) - portfolioState.initialInvestment);
				
				// Terza colonna: risultato di funzione2(mese)
                row.insertCell().innerText = euro.format(qaz(mese)*12);
				
				// Terza colonna: risultato di funzione2(mese)
                row.insertCell().innerText = euro.format( incremento =  calculatePortfolioValue(portfolioState, mese*12) - calculatePortfolioValue(portfolioState, (mese-1)*12 )   );
				
				// Terza colonna: risultato di performance annuale
                row.insertCell().innerText = ( ( (incremento - (qaz(mese)*12)) / (calculatePortfolioValue(portfolioState, (mese-1)*12) ))*100  ).toFixed(2);
				
				// Terza colonna: risultato di funzione2(mese)
                row.insertCell().innerText = (((calculatePortfolioValue(portfolioState, mese*12) / calculateContribValue(portfolioState, mese*12))-1)*100).toFixed(2);
				
				
            }

            // Aggiungi la tabella al contenitore esistente nel DOM
            annualTableContainer.appendChild(table2);
        }
		
		