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
let useFixedReturnMode = false; // Toggle di debug per applicare rendimenti costanti per asset class
let enableMacroScenario = defaultEnableMacroAdjustments ?? false; // Flag principale per includere o escludere la traiettoria macro.
let enableMacroAdjustments = enableMacroScenario; // Manteniamo l'alias per compatibilità con la logica esistente sugli aggiustamenti.
let selectedMacroScenario = "baseline";
let macroByMonth = []; // Monthly macro snapshot (inflation/policy rates), kept in sync with the time horizon e ricostruito quando il flag cambia.

const macroScenarioPresets = {
    neutral: { label: "Neutro (flat)", macroPhases: [] },
    baseline: { label: "Scenario base", macroPhases: [] },
    ...defaultMacroScenarioPresets,
};

// Identifica lo scenario di default: se la configurazione ne fornisce uno, usiamo quello,
// altrimenti ricadiamo su baseline o neutral.
const availableScenarioKeys = Object.keys(macroScenarioPresets);
selectedMacroScenario = macroScenarioPresets.baseline
    ? "baseline"
    : availableScenarioKeys.find(key => key !== "neutral") || availableScenarioKeys[0] || "neutral";

let macroPhases = macroScenarioPresets[selectedMacroScenario]?.macroPhases || macroScenarioPresets.neutral.macroPhases || [];
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
