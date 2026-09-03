# WealthPath Simulator

Simulatore statico, eseguito interamente nel browser, per analizzare l'evoluzione di un portafoglio multi-asset con versamenti periodici.

## Funzionalità disponibili

- simulazione mensile con rendimenti fissi o Geometric Brownian Motion (GBM);
- seed riproducibile, contribuzione mensile, fase di retirement con prelievo percentuale e ribilanciamento configurabile;
- imposte sulle plusvalenze realizzate dal ribilanciamento, con aliquota configurabile e predefinita al 26%;
- finanziamento Lombard opzionale: riserva di liquidità, leva azionaria o sull'intero portafoglio, tasso configurabile, limite di leva al 60%, monitoraggio LTV e avviso/probabilità di margin call;
- asset allocation interattiva con ridistribuzione automatica al 100%;
- scenari macroeconomici opzionali e valori reali corretti per l'inflazione;
- Monte Carlo da 1 a 5.000 scenari con shock correlati, cache LRU, bande percentili, istogramma e probabilità di raggiungimento dell'obiettivo;
- metriche TWRR, XIRR datato, volatilità realizzata, rischio ex ante basato sulle correlazioni, massimo drawdown e frequenza dei mesi positivi;
- tabelle mensili e annuali con versamenti, prelievi retirement e tasse da ribilanciamento;
- persistenza locale, import/export della configurazione ed esportazione PDF;
- validazione e sanificazione di importi, orizzonte, seed, aliquote, scenari e allocazione.

Nel retirement, il prelievo è applicato mensilmente al valore corrente del portafoglio (`aliquota annua / 12`). Il Lombard parte come percentuale del capitale iniziale e capitalizza mensilmente gli interessi; la margin call viene segnalata quando il rapporto debito/garanzia raggiunge la soglia LTV impostata. È un modello informativo: non incorpora liquidazioni forzose, variazioni contrattuali di haircut o fiscalità su prelievi, cedole, dividendi e regimi specifici dell'investitore.

## Avvio locale

Non è richiesto un processo di build. Servire la cartella `src` con un server HTTP, ad esempio:

```bash
python -m http.server 8765 --directory src
```

Aprire quindi `http://127.0.0.1:8765/`.

## Test

La suite automatica richiede Node.js 20 o successivo:

```bash
node tests/run-simulation-tests.mjs
```

Per eseguire la stessa suite nel browser, aprire l'applicazione aggiungendo `?debug=1` all'URL. La regressione browser sullo stato Monte Carlo può essere avviata con `?debug=1&browserTest=1`.

La pipeline GitHub Actions controlla a ogni push e pull request:

- sintassi dei file JavaScript;
- test deterministici di simulazione;
- presenza di SRI sulle dipendenze remote;
- regressione in Chrome headless sull'invalidazione dei risultati Monte Carlo obsoleti.

## Configurazione

- ipotesi di mercato, limiti e scenari: `src/assets/js/config/marketData.js`;
- testi dell'interfaccia: `src/assets/js/config/labels.js`;
- logica di validazione: `src/assets/js/validation.js`.

## Sviluppi previsti, non ancora implementati

- serie storiche mensili validate;
- ottimizzazione del portafoglio con vincoli;
- fiscalità completa per prelievi, dividendi e specifiche asset class.

Questi elementi sono dichiarati in `marketData.futureIntegrations` e richiedono dati o specifiche di prodotto validate prima dell'implementazione.

## Nota

I risultati dipendono dalle ipotesi configurate e non costituiscono consulenza finanziaria.
