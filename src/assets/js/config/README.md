# Configurazione front-end

`marketData.js` espone `window.marketData` e raccoglie le ipotesi usate dal simulatore. `labels.js` espone `window.labels` e `window.getLabel(path)` per le stringhe dell'interfaccia.

## Campi di `marketData`

- `schemaVersion`: versione del formato persistito.
- `assetClasses`: ordine canonico delle asset class. Lo stesso ordine è usato dalla matrice di correlazione.
- `defaults`: importi, orizzonte, ribilanciamento, aliquota fiscale, retirement, modalità, scenario macro, Monte Carlo, obiettivo e seed iniziali.
- `allowedRebalanceFrequencies`: frequenze annue ammesse.
- `allocation`: pesi percentuali predefiniti; devono totalizzare 100.
- `annualizedReturns`: rendimenti annui attesi usati nel drift GBM.
- `annualizedVolatility`: volatilità annue usate nel GBM e nel rischio ex ante.
- `correlationMatrix`: matrice simmetrica, con diagonale unitaria e definita positiva. Determina sia gli shock GBM correlati sia la volatilità ex ante del portafoglio.
- `fixedMonthlyMultipliers`: moltiplicatori mensili della modalità a rendimenti fissi.
- `macroDriftConfig`, `assetClassSensitivities` e `macroScenarioPresets`: configurazione degli aggiustamenti macroeconomici.
- `futureIntegrations`: punti di estensione non ancora implementati per serie storiche, ottimizzazione e fiscalità specifica per asset class.

## Aggiornamento sicuro

1. Conservare l'ordine di `assetClasses` coerente con righe e colonne di `correlationMatrix`.
2. Verificare che allocazione e diagonale della matrice siano pari rispettivamente a 100 e 1.
3. Eseguire `node tests/run-simulation-tests.mjs`: i test ricostruiscono la matrice tramite Cholesky e coprono formule, seed, scenari macro, cache e orizzonte massimo.
4. Incrementare `schemaVersion` quando cambia il formato persistito.
