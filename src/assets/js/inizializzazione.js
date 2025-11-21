//INIZIALIZZAZIONE

// Stato centrale alimentato dalla configurazione remota o di fallback
const appState = {
    priceRatios: [],
    defaults: {
        initialInvestment: 0,
        monthlyContribution: 0,
        timeHorizonYears: 1,
    },
    allocation: {},
    currencyInfo: {},
    allocationLabel: {},
    returnFunctions: [],
    error: null,
};

let priceRatios = [];
let initialInvestment = 0;
let monthlyContribution = 0;
let timeHorizon = 1; // Orizzonte temporale in anni

let allocation = {};
let currencyInfo = {};
let allocationLabel = {};
let returnFunctions = [];

function normalizeReturnFunctions(definitions = []) {
    return definitions.map((config) => {
        const { assetClass, calculateReturn, constantReturn = 1 } = config || {};

        const returnCalculator =
            typeof calculateReturn === "function" ? calculateReturn : () => constantReturn;

        return {
            assetClass,
            calculateReturn: returnCalculator,
        };
    });
}

function applyConfig(config = {}) {
    const {
        priceRatios: newPriceRatios = [],
        defaults: {
            initialInvestment: defaultInitialInvestment = 0,
            monthlyContribution: defaultMonthlyContribution = 0,
            timeHorizonYears: defaultTimeHorizonYears = 1,
        } = {},
        allocation: defaultAllocation = {},
        currencyInfo: defaultCurrencyInfo = {},
        allocationLabel: defaultAllocationLabel = {},
        returnFunctions: returnFunctionDefinitions = [],
    } = config || {};

    appState.priceRatios = Array.isArray(newPriceRatios) ? newPriceRatios : [];
    appState.defaults = {
        initialInvestment: defaultInitialInvestment,
        monthlyContribution: defaultMonthlyContribution,
        timeHorizonYears: defaultTimeHorizonYears,
    };
    appState.allocation = { ...defaultAllocation };
    appState.currencyInfo = { ...defaultCurrencyInfo };
    appState.allocationLabel = { ...defaultAllocationLabel };
    appState.returnFunctions = normalizeReturnFunctions(returnFunctionDefinitions);

    // Propagazione verso le variabili globali già utilizzate dal resto del codice
    priceRatios = [...appState.priceRatios];
    allocation = { ...appState.allocation };
    currencyInfo = { ...appState.currencyInfo };
    allocationLabel = { ...appState.allocationLabel };
    returnFunctions = [...appState.returnFunctions];

    initialInvestment = appState.defaults.initialInvestment ?? 0;
    monthlyContribution = appState.defaults.monthlyContribution ?? 0;
    timeHorizon = appState.defaults.timeHorizonYears ?? 1;
}

function renderConfigError(message) {
    const container = document.getElementById("contenutopagina");
    if (!container) return;

    let alert = document.getElementById("config-error-alert");
    if (!alert) {
        alert = document.createElement("div");
        alert.id = "config-error-alert";
        alert.className = "alert alert-warning";
        container.prepend(alert);
    }

    alert.textContent = message;
}

async function loadConfig(configUrl = "assets/js/config/marketData.json") {
    try {
        const response = await fetch(configUrl, { cache: "no-cache" });
        if (!response.ok) {
            throw new Error(`Impossibile caricare la configurazione (${response.status})`);
        }

        const parsedConfig = await response.json();
        applyConfig(parsedConfig);
        appState.error = null;

        return appState;
    } catch (error) {
        console.error("Errore nel caricamento della configurazione:", error);

        // Fallback: utilizza eventuale configurazione iniettata via marketData.js
        if (window.marketData) {
            applyConfig(window.marketData);
            appState.error = null;
            return appState;
        }

        appState.error =
            "Impossibile caricare la configurazione. Sono stati applicati i valori di emergenza.";
        renderConfigError(appState.error);
        applyConfig();

        return appState;
    }
}

// Inizializza lo stato usando la configurazione iniettata tramite marketData.js,
// così che le variabili globali siano popolate anche prima di eventuali fetch.
applyConfig(window.marketData || {});

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



let euro = Intl.NumberFormat('en-DE', {
    style: 'currency',
    currency: 'EUR',
});
