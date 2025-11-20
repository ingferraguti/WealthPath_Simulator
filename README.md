# WealthPath_Simulator
[Analysis and simulations for informed financial decisions] - [Analisi e simulazioni per decisioni finanziarie consapevoli] 

🇮🇹 WealthPath Simulator
Analisi e simulazioni per decisioni finanziarie consapevoli

WealthPath Simulator è una piattaforma avanzata progettata per simulare l’evoluzione di un portafoglio di investimento nel tempo.
Utilizzando modelli Monte Carlo, rendimenti storici, contributi periodici, variazioni mensili e ribilanciamenti intelligenti, offre all’investitore un quadro chiaro e visuale dell’impatto delle proprie scelte finanziarie.

🚀 Caratteristiche principali

Simulazioni Monte Carlo con N scenari configurabili

Modelli di rendimento azionario basati su Geometric Brownian Motion

Analisi storica dei rendimenti di varie asset class

Calcolo PAC, contributi periodici, accumulo e interesse composto

Ribilanciamento automatico e personalizzabile

Dashboard interattiva con grafici e tabelle

Doughnut chart delle allocazioni senza eventi click

Esportazione PDF

Ottimizzazione del portafoglio (in sviluppo)

📂 Struttura del progetto

Il progetto è organizzato in moduli JavaScript distinti:

portfolio_dashboard.js – logica principale della dashboard

portafoglio.js – gestione del portafoglio e delle allocazioni

funzionigrafici.js – generazione dei grafici

inizializzazione.js – setup e stato iniziale

tabelle.js – generazione delle tabelle dati

pdf.js – esportazione dei contenuti in PDF

theme.js – tema e configurazioni UI

📦 Installazione

Clona il repository:

git clone https://github.com/your-username/wealthpath-simulator.git


Apri index.html nel browser.
Non richiede backend: è completamente client-side.

🛠 Utilizzo

Modifica le allocazioni percentuali nel pannello dedicato

Imposta contributi, anni di investimento e scenari Monte Carlo

Visualizza grafici e simulazioni

Esporta la sessione in PDF

Analizza distribuzioni, medie, volatilità e percentile delle simulazioni

🧪 Modello Monte Carlo (GBM)

WealthPath Simulator usa un modello di Geometric Brownian Motion per generare scenari realistici dei rendimenti azionari:

S(t) = S(0) * exp( (μ − 0.5σ²)t + σ * Wt )

📝 Licenza — MPL 2.0

Questo progetto è distribuito sotto licenza Mozilla Public License 2.0 (MPL-2.0).
Ciò significa che:

✔ il codice può essere usato anche in progetti commerciali
✔ i file modificati devono rimanere open-source
✔ puoi integrare il progetto in software proprietario mantenendo aperte solo le parti modificate
✔ la proprietà intellettuale è protetta

👤 Autore

Matteo Ferraguti
Progetto: WealthPath Simulator
2025

🤝 Contributi

Le pull-request sono benvenute.
Suggerimenti, fix e nuove funzionalità sono apprezzati.

🇬🇧 WealthPath Simulator
Analysis and simulations for informed financial decisions

WealthPath Simulator is an advanced platform designed to model the evolution of an investment portfolio over time.
Using Monte Carlo models, historical returns, periodic contributions, monthly changes, and intelligent rebalancing, it gives investors a clear, visual understanding of how their choices shape future wealth.

🚀 Key Features

Monte Carlo simulations with configurable N scenarios

Equity return modeling using Geometric Brownian Motion

Historical returns analysis across asset classes

DCA / recurring contributions and compound growth

Automatic and customizable rebalancing

Interactive dashboard with charts and tables

Non-clickable doughnut chart for allocations

PDF export capabilities

Portfolio optimization (coming soon)

📂 Project Structure

The project is divided into clean, maintainable modules:

portfolio_dashboard.js – main dashboard logic

portafoglio.js – portfolio and allocation management

funzionigrafici.js – chart generation

inizializzazione.js – state initialization

tabelle.js – table rendering

pdf.js – PDF export routines

theme.js – UI theme configuration

📦 Installation

Clone the repository:

git clone https://github.com/your-username/wealthpath-simulator.git


Open index.html in your browser.
No backend is required — it runs fully client-side.

🛠 Usage

Adjust asset allocation percentages

Set contributions, time horizon, and simulation scenarios

View charts and distributions

Export your results as PDF

Analyze percentiles, averages, volatility, and future projections

🧪 Monte Carlo Model (GBM)

WealthPath Simulator uses a Geometric Brownian Motion model to generate realistic equity return scenarios:

S(t) = S(0) * exp( (μ − 0.5σ²)t + σ * Wt )

📝 License — MPL 2.0

This project is distributed under the Mozilla Public License 2.0 (MPL-2.0).

✔ allows commercial use
✔ modified files must remain open-source
✔ proprietary code can coexist with MPL files
✔ intellectual property remains protected

👤 Author

Matteo Ferraguti
Project: WealthPath Simulator
2025

🤝 Contributions

Pull requests are welcome.
Feedback, improvements, and new features are appreciated.
