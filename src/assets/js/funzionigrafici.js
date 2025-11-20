//FUNZIONI PER GRAFICI


// Funzione per calcolare i dati del grafico a ciambella
function getDoughnutData() {
    return {
        labels: Object.keys(allocation).map(assetKey => getAllocationDisplayLabel(assetKey)),
        datasets: [
            {
                data: Object.values(allocation),
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF',
                    '#FF9F40',
                    '#C9CBCF',
                ],
            },
        ],
    };
}




// Funzione per calcolare i dati del grafico mensile dell'andamento del portafoglio
function getMonthlyData() {
    return {
        labels: Array.from({ length: timeHorizon * 12 }, (_, i) => `Mese ${i + 1}`),
        datasets: [
            {
                label: 'Valore del Portafoglio',
                data: Array.from({ length: timeHorizon * 12 }, (_, i) => calculatePortfolioValue(i)),
                borderColor: '#36A2EB',
                fill: false,
            },
			{
                label: 'Contributi',
                data: Array.from({ length: timeHorizon * 12 }, (_, i) => calculateContribValue(i)),
                borderColor: '#16D2A1',
                fill: false,
            },
        ],
    };
}



