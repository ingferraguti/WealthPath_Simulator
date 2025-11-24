//INIZIALIZZAZIONE

// Inizializzazione dello stato tramite configurazione centralizzata
const {
    priceRatios = [],
    defaults: {
        initialInvestment: defaultInitialInvestment,
        monthlyContribution: defaultMonthlyContribution,
        timeHorizonYears: defaultTimeHorizonYears,
        rebalanceFrequencyPerYear: defaultRebalanceFrequencyPerYear,
    } = {},
    allocation: defaultAllocation = {},
    currencyInfo = {},
    returnFunctions: returnFunctionDefinitions = [],
} = window.marketData || {};

const allocationLabel = (window.labels && window.labels.assets) || {};

let initialInvestment = defaultInitialInvestment ?? 0;
let monthlyContribution = defaultMonthlyContribution ?? 0;
let timeHorizon = defaultTimeHorizonYears ?? 1; // Orizzonte temporale in anni
let rebalanceFrequencyPerYear = defaultRebalanceFrequencyPerYear ?? 1; // numero di ribilanciamenti per anno
let rebalanceEveryMonths = rebalanceFrequencyPerYear === 0 ? 0 : Math.round(12 / rebalanceFrequencyPerYear); // ogni quanti mesi ribilanciare
let useFixedReturnMode = false; // Toggle di debug per applicare rendimenti costanti per asset class

const allocation = { ...defaultAllocation };

function getAllocationDisplayLabel(assetKey) {
    const baseLabel = allocationLabel[assetKey] || assetKey;
    const { currency, hedged } = currencyInfo[assetKey] || {};

    const currencySymbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : "";
    const symbolParts = [currencySymbol, hedged ? "🛡️" : null].filter(Boolean).join(" ");

    return symbolParts ? `${baseLabel} (${symbolParts})` : baseLabel;
}


function getOroPerformance() {
    // Genera un numero casuale uniforme tra 0 e 1
    const random = Math.random();

    // Trasforma il numero casuale per adattarlo all'intervallo [0.87, 1.17]
    // con una media che tende a 1.07
    const performance = 0.87 + (random ** 0.5) * (1.17 - 0.87);

    return performance;
}



const returnFunctionsConfig = returnFunctionDefinitions.map((config) => ({
    ...config,
    calculateReturn: config.calculateReturn || (() => 1),
}));

const returnFunctions = returnFunctionsConfig;

let euro = Intl.NumberFormat('en-DE', {
    style: 'currency',
    currency: 'EUR',
});
