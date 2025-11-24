//INIZIALIZZAZIONE

// Inizializzazione dello stato tramite configurazione centralizzata
const {
    priceRatios = [],
    defaults: {
        initialInvestment: defaultInitialInvestment,
        monthlyContribution: defaultMonthlyContribution,
        timeHorizonYears: defaultTimeHorizonYears,
        rebalanceFrequencyPerYear: defaultRebalanceFrequencyPerYear,
        enableMacroAdjustments: defaultEnableMacroAdjustments = false,
    } = {},
    allocation: defaultAllocation = {},
    currencyInfo = {},
    returnFunctions: returnFunctionDefinitions = [],
    macroScenarioPresets: defaultMacroScenarioPresets = {},
    assetClassSensitivities: defaultAssetClassSensitivities = {},
    macroTiltConfig = {},
    macroDriftConfig = {},
} = window.marketData || {};

const allocationLabel = (window.labels && window.labels.assets) || {};

let initialInvestment = defaultInitialInvestment ?? 0;
let monthlyContribution = defaultMonthlyContribution ?? 0;
let timeHorizon = defaultTimeHorizonYears ?? 1; // Orizzonte temporale in anni
let rebalanceFrequencyPerYear = defaultRebalanceFrequencyPerYear ?? 1; // numero di ribilanciamenti per anno
let rebalanceEveryMonths = rebalanceFrequencyPerYear === 0 ? 0 : Math.round(12 / rebalanceFrequencyPerYear); // ogni quanti mesi ribilanciare
// Disabilitiamo per impostazione predefinita la simulazione Monte Carlo e gli scenari macro.
let useFixedReturnMode = true; // Toggle di debug per applicare rendimenti costanti per asset class
let enableMacroScenario = false; // Switch di UI per applicare gli scenari macro ai rendimenti
let enableMacroAdjustments = enableMacroScenario; // Alias compatibile con il resto della logica di simulazione
const macroScenarioKeys = Object.keys(defaultMacroScenarioPresets);
let selectedMacroScenario = macroScenarioKeys.includes("baseline")
    ? "baseline"
    : macroScenarioKeys[0] || "custom"; // Identifica il preset scelto dalla UI
let macroByMonth = []; // Monthly macro snapshot (inflation/policy rates), kept in sync with the time horizon

const defaultMacroPhases = defaultMacroScenarioPresets?.[selectedMacroScenario]?.macroPhases || [];
let macroPhases = (window.cloneMacroPhases
    ? window.cloneMacroPhases(defaultMacroPhases)
    : [...defaultMacroPhases]);
const assetClassSensitivities = { ...defaultAssetClassSensitivities };
const macroTilt = { ...macroTiltConfig };
const macroDrift = { ...macroDriftConfig };

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
    const random = window.randomSeedManager?.random() ?? Math.random();

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
