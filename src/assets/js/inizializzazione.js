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

const MAX_SIMULATION_YEARS = 50;

function normalizeFiniteNumber(value, options = {}) {
    const {
        fallback = 0,
        min = 0,
        max = Number.MAX_SAFE_INTEGER,
        integer = false,
    } = options;
    const parsedValue = Number(value);
    const parsedFallback = Number(fallback);
    const safeFallback = Number.isFinite(parsedFallback) ? parsedFallback : min;
    const finiteValue = Number.isFinite(parsedValue) ? parsedValue : safeFallback;
    const normalizedValue = integer ? Math.round(finiteValue) : finiteValue;

    return Math.min(Math.max(normalizedValue, min), max);
}

function normalizeMoneyInput(value, fallback = 0) {
    return normalizeFiniteNumber(value, { fallback, min: 0 });
}

function normalizeTimeHorizon(value, fallback = 1) {
    return normalizeFiniteNumber(value, {
        fallback,
        min: 1,
        max: MAX_SIMULATION_YEARS,
        integer: true,
    });
}

function safeDivide(numerator, denominator, fallback = 0) {
    const safeNumerator = Number(numerator);
    const safeDenominator = Number(denominator);

    if (!Number.isFinite(safeNumerator) || !Number.isFinite(safeDenominator) || safeDenominator === 0) {
        return fallback;
    }

    const result = safeNumerator / safeDenominator;
    return Number.isFinite(result) ? result : fallback;
}

function safePercentage(numerator, denominator, fallback = 0) {
    return safeDivide(numerator, denominator, fallback / 100) * 100;
}

function normalizeAllocationPercentages(rawAllocation = {}) {
    const entries = Object.entries(rawAllocation);
    if (!entries.length) {
        return {};
    }

    const safeEntries = entries.map(([asset, value]) => [
        asset,
        normalizeFiniteNumber(value, { fallback: 0, min: 0, max: 100 }),
    ]);
    const total = safeEntries.reduce((sum, [, value]) => sum + value, 0);
    const exactShares = total > 0
        ? safeEntries.map(([asset, value]) => [asset, (value / total) * 100])
        : safeEntries.map(([asset]) => [asset, 100 / safeEntries.length]);
    const normalized = Object.fromEntries(exactShares.map(([asset, value]) => [asset, Math.floor(value)]));
    let remainder = 100 - Object.values(normalized).reduce((sum, value) => sum + value, 0);

    exactShares
        .map(([asset, value]) => ({ asset, fraction: value - Math.floor(value) }))
        .sort((a, b) => b.fraction - a.fraction)
        .forEach(({ asset }) => {
            if (remainder > 0) {
                normalized[asset] += 1;
                remainder -= 1;
            }
        });

    return normalized;
}

let initialInvestment = normalizeMoneyInput(defaultInitialInvestment, 0);
let monthlyContribution = normalizeMoneyInput(defaultMonthlyContribution, 0);
let timeHorizon = normalizeTimeHorizon(defaultTimeHorizonYears, 1); // Orizzonte temporale in anni
let rebalanceFrequencyPerYear = defaultRebalanceFrequencyPerYear ?? 1; // numero di ribilanciamenti per anno
let rebalanceEveryMonths = rebalanceFrequencyPerYear === 0 ? 0 : Math.round(12 / rebalanceFrequencyPerYear); // ogni quanti mesi ribilanciare
// Disabilitiamo per impostazione predefinita la simulazione Monte Carlo e gli scenari macro.
let useFixedReturnMode = true; // Toggle di debug per applicare rendimenti costanti per asset class
let enableMonteCarlo = false; // Switch dedicato per attivare la simulazione Monte Carlo
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

const allocation = normalizeAllocationPercentages(defaultAllocation);

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
