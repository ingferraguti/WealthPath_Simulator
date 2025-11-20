//TABELLE



function qaz(mese){
	if(mese==0)return 0; 
	return monthlyContribution;
}



function wsx(mese){
	
	if( qaz(mese) > (calculatePortfolioValue(mese) - calculatePortfolioValue(mese -1 ))) return 'SI';
	
	return 'NO';
}

function creaTabella(numeroMesi) {
            // Pulisce il contenitore prima di generare una nuova tabella mensile
            const tableContainer = document.getElementById('table-container');
            if (!tableContainer) {
                return;
            }

            tableContainer.innerHTML = '';

            // Crea la tabella e l'intestazione
            const table = document.createElement('table');
            table.border = 1;
            table.style.width = '100%';

            const header = table.createTHead();
            const headerRow = header.insertRow();
            headerRow.insertCell().innerText = 'Mese';
            headerRow.insertCell().innerText = 'valore';
            headerRow.insertCell().innerText = 'contributi';
			headerRow.insertCell().innerText = 'contributo mensile';
			headerRow.insertCell().innerText = 'incremento mensile';
			headerRow.insertCell().innerText = 'performance mensile';
			headerRow.insertCell().innerText = 'performance totale';
			headerRow.insertCell().innerText = 'performance > contrib';
			
			

            // Popola la tabella con i dati
            const tbody = table.createTBody();
            for (let mese = 0; mese <= numeroMesi; mese++) {
                const row = tbody.insertRow();

                // Prima colonna: numero crescente del mese
                row.insertCell().innerText = mese;

                // Seconda colonna: risultato di funzione1(mese)
                row.insertCell().innerText = euro.format(calculatePortfolioValue(mese));

                // Terza colonna: risultato di funzione2(mese)
                row.insertCell().innerText = euro.format(calculateContribValue(mese));
				
				// Terza colonna: risultato di funzione2(mese)
                row.insertCell().innerText = euro.format(qaz(mese));
				
				// Terza colonna: risultato di funzione2(mese)
                row.insertCell().innerText = euro.format(   calculatePortfolioValue(mese) - calculatePortfolioValue(mese -1 )   );
				
				// Terza colonna: risultato di funzione2(mese)
                row.insertCell().innerText = ( ( (calculatePortfolioValue(mese) - calculatePortfolioValue(mese -1 )) / calculatePortfolioValue(mese-1) )*100  ).toFixed(2);
				
				// Terza colonna: risultato di funzione2(mese)
                row.insertCell().innerText = (((calculatePortfolioValue(mese) / calculateContribValue(mese))-1)*100).toFixed(2);
				
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

            annualTableContainer.innerHTML = '';

            // Crea la tabella e l'intestazione
            const table2 = document.createElement('table');
            table2.border = 1;
            table2.style.width = '100%';

            const header = table2.createTHead();
            const headerRow = header.insertRow();
            headerRow.insertCell().innerText = 'Anno';
            headerRow.insertCell().innerText = 'valore';
            headerRow.insertCell().innerText = 'contributi';
			headerRow.insertCell().innerText = 'contributo annuale';
			headerRow.insertCell().innerText = 'incremento annuale';
			headerRow.insertCell().innerText = 'performance annuale';
			headerRow.insertCell().innerText = 'performance totale';
			
			
			
			let  incremento=0;

            // Popola la tabella con i dati
            const tbody = table2.createTBody();
            for (let mese = 0; mese <= numeroAnni; mese++) {
                const row = tbody.insertRow();

                // Prima colonna: numero crescente del mese
                row.insertCell().innerText = mese;

                // Seconda colonna: risultato di funzione1(mese)
                row.insertCell().innerText = euro.format(calculatePortfolioValue(mese*12));

                // Terza colonna: risultato di funzione2(mese)
                row.insertCell().innerText = euro.format(calculateContribValue(mese*12));
				
				// Terza colonna: risultato di funzione2(mese)
                row.insertCell().innerText = euro.format(qaz(mese)*12);
				
				// Terza colonna: risultato di funzione2(mese)
                row.insertCell().innerText = euro.format( incremento =  calculatePortfolioValue(mese*12) - calculatePortfolioValue((mese-1)*12 )   );
				
				// Terza colonna: risultato di performance annuale
                row.insertCell().innerText = ( ( (incremento - (qaz(mese)*12)) / (calculatePortfolioValue((mese-1)*12) ))*100  ).toFixed(2);
				
				// Terza colonna: risultato di funzione2(mese)
                row.insertCell().innerText = (((calculatePortfolioValue(mese*12) / calculateContribValue(mese*12))-1)*100).toFixed(2);
				
				
            }

            // Aggiungi la tabella al contenitore esistente nel DOM
            annualTableContainer.appendChild(table2);
        }
		
		