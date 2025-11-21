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
    const portfolioState = getPortfolioState();
    const totalMonths = timeHorizon * 12;
    const portfolioValues = Array.from({ length: totalMonths }, (_, i) => calculatePortfolioValue(portfolioState, i));
    const contributionValues = Array.from({ length: totalMonths }, (_, i) => calculateContribValue(portfolioState, i));

    if (portfolioValues.length > 0) {
        const years = totalMonths / 12;
        const annualReturn = Math.pow(portfolioValues[portfolioValues.length - 1] / portfolioValues[0], 1 / years) - 1;
        const annualReturnValue = document.getElementById('annualReturnValue');

        if (annualReturnValue) {
            annualReturnValue.textContent = (annualReturn * 100).toFixed(2) + "%";
        }
    }

    return {
        labels: Array.from({ length: timeHorizon * 12 }, (_, i) => `Mese ${i + 1}`),
        datasets: [
            {
                label: 'Valore del Portafoglio',
                data: portfolioValues,
                borderColor: '#36A2EB',
                fill: false,
            },
                        {
                label: 'Contributi',
                data: contributionValues,
                borderColor: '#16D2A1',
                fill: false,
            },
        ],
    };
}



