# Configurazioni front-end

`marketData.js` raccoglie in un unico oggetto le costanti di mercato utilizzate dai vari script front-end. Il file espone `window.marketData` con i campi descritti di seguito, così da poter aggiornare i parametri senza dover modificare più file JS.

`labels.js` centralizza le etichette UI e le descrizioni delle asset class. Espone `window.labels` e l'helper `window.getLabel(path)` per recuperare le stringhe a partire da una chiave (es. `getLabel('ui.initialInvestment')`).

## Struttura dell'oggetto `marketData`

- `priceRatios` (Array<number>): sequenza di moltiplicatori mensili (dimensione adimensionale) applicati all'azionario globale nel mock di simulazione. Ogni valore rappresenta un rendimento relativo (es. `1.02` = +2%).
- `defaults` (Object): valori di partenza per la simulazione.
  - `initialInvestment` (number): capitale iniziale in euro.
  - `monthlyContribution` (number): contributo mensile in euro.
  - `timeHorizonYears` (number): orizzonte temporale espresso in anni.
- `allocation` (Object): ripartizione percentuale iniziale delle asset class. Le percentuali devono sommare a 100.
- `currencyInfo` (Object): metadati valutari per ogni asset class.
  - `currency` (string): codice valuta (es. `EUR`, `USD`).
  - `hedged` (boolean): `true` se la posizione è coperta dal rischio cambio.
- `macroPhases` (Array<Object>): fasi macroeconomiche opzionali che descrivono l'evoluzione attesa di inflazione e tassi di policy.
  - `name` (string): etichetta descrittiva della fase.
  - `startMonth` (number): mese di inizio (0 = primo mese della simulazione).
  - `duration` (number): durata in mesi.
  - `inflationFrom` / `inflationTo` (number): inflazione annualizzata ai confini della fase.
  - `rateFrom` / `rateTo` (number): tassi di policy annualizzati ai confini della fase.
  - `regimeTag` (string): tag rapido del regime (es. `normal`, `inflation_hike`).
- `returnFunctions` (Array<Object>): lista di configurazioni di rendimento per asset class.
  - `assetClass` (string): chiave dell'asset (deve corrispondere a `allocation`).
  - `calculateReturn` (function): funzione che restituisce il moltiplicatore mensile (es. `1.01` per +1%). La funzione riceve l'indice di mese.

## Modalità d'uso

1. Includere `assets/js/config/labels.js` e `assets/js/config/marketData.js` **prima** degli altri script che leggono i dati di mercato (vedi `src/index.html`).
2. Modificare i valori in `labels.js` per aggiornare le etichette UI o le descrizioni delle asset class senza toccare la logica applicativa.
3. Modificare i valori in `marketData.js` per aggiornare pesi percentuali o sequenze di rendimento senza toccare la logica applicativa.
