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
function getMonthlyData(options = {}) {
    const {
        portfolioState: providedPortfolioState,
        macroScenarioByMonth = macroByMonth,
        macroEnabled = enableMacroScenario,
    } = options || {};

    const portfolioState = providedPortfolioState || getPortfolioState();
    const totalMonths = Math.max(0, Math.round(timeHorizon * 12));
    const portfolioValues = Array.from({ length: totalMonths }, (_, i) => calculatePortfolioValue(portfolioState, i));
    const contributionValues = Array.from({ length: totalMonths }, (_, i) => calculateContribValue(portfolioState, i));
    const macroPoints = macroEnabled && Array.isArray(macroScenarioByMonth)
        ? macroScenarioByMonth.slice(0, totalMonths)
        : [];

    if (portfolioValues.length > 0) {
        const years = totalMonths / 12;
        const annualReturn = Math.pow(portfolioValues[portfolioValues.length - 1] / portfolioValues[0], 1 / years) - 1;
        const annualReturnValue = document.getElementById('annualReturnValue');

        if (annualReturnValue) {
            annualReturnValue.textContent = (annualReturn * 100).toFixed(2) + "%";
        }
    }

    const datasets = [
        {
            label: 'Valore del Portafoglio',
            data: portfolioValues,
            borderColor: '#36A2EB',
            fill: false,
            yAxisID: 'valueAxis',
        },
        {
            label: 'Contributi',
            data: contributionValues,
            borderColor: '#16D2A1',
            fill: false,
            yAxisID: 'valueAxis',
        },
    ];

    if (macroPoints.length) {
        datasets.push(
            {
                label: 'Inflazione annualizzata',
                data: macroPoints.map(point => Number((point?.inflation ?? 0) * 100)),
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                pointRadius: 2,
                fill: false,
                yAxisID: 'macroAxis',
            },
            {
                label: 'Policy rate',
                data: macroPoints.map(point => Number((point?.policyRate ?? 0) * 100)),
                borderColor: 'rgba(255, 206, 86, 1)',
                backgroundColor: 'rgba(255, 206, 86, 0.1)',
                pointRadius: 2,
                fill: false,
                yAxisID: 'macroAxis',
            }
        );
    }

    return {
        labels: Array.from({ length: totalMonths }, (_, i) => `Mese ${i + 1}`),
        datasets,
    };
}



