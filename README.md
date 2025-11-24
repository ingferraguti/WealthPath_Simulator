# WealthPath_Simulator

```
██╗    ██╗███████╗ █████╗ ██╗     ████████╗██╗  ██╗
██║    ██║██╔════╝██╔══██╗██║     ╚══██╔══╝██║  ██║
██║ █╗ ██║█████╗  ███████║██║        ██║   ███████║
██║███╗██║██╔══╝  ██╔══██║██║        ██║   ██╔══██║
╚███╔███╔╝███████╗██║  ██║███████╗   ██║   ██║  ██║
 ╚══╝╚══╝ ╚══════╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝

          WealthPath Simulator
   Analysis and simulations for 
        informed financial decisions

Analisi e simulazioni per decisioni finanziarie consapevoli
``` 


---

WealthPath Simulator è una piattaforma avanzata progettata per simulare l’evoluzione di un portafoglio di investimento nel tempo.
Utilizzando modelli Monte Carlo, rendimenti storici, contributi periodici, variazioni mensili e ribilanciamenti intelligenti, offre all’investitore un quadro chiaro e visuale dell’impatto delle proprie scelte finanziarie.
---

### 🚀 Caratteristiche principali

- Simulazioni Monte Carlo con N scenari configurabili

- Modelli di rendimento azionario basati su Geometric Brownian Motion

- Analisi storica dei rendimenti di varie asset class

- Calcolo PAC, contributi periodici, accumulo e interesse composto

- Ribilanciamento automatico e personalizzabile

- Dashboard interattiva con grafici e tabelle

- Doughnut chart delle allocazioni senza eventi click

- Esportazione PDF

- Ottimizzazione del portafoglio (in sviluppo)


### 🧪 Modello Monte Carlo (GBM)

WealthPath Simulator usa un modello di Geometric Brownian Motion per generare scenari realistici dei rendimenti azionari:

S(t) = S(0) * exp( (μ − 0.5σ²)t + σ * Wt )


### ⚙️ Settings

- **Parametri di mercato**: personalizza rendimenti simulati, asset allocation iniziale e valute in `src/assets/js/config/marketData.js` (sezioni `priceRatios`, `defaults`, `allocation`, `currencyInfo` e `returnFunctions`).
- **Etichette UI**: aggiorna testi e descrizioni delle asset class modificando `src/assets/js/config/labels.js` o usando l'helper `getLabel()` esposto nello stesso file.
- **Ordine di inclusione**: assicurati che i file nella cartella `config` vengano caricati prima degli altri script front-end (come avviene in `src/index.html`) così che i dati siano disponibili alla logica di simulazione.


### 🤝 Contributi

Le pull-request sono benvenute.
Suggerimenti, fix e nuove funzionalità sono apprezzati.

