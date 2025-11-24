


function sanitizeAllocationValue(rawValue) {
    const parsedValue = parseInt(rawValue, 10);
    const safeValue = Number.isNaN(parsedValue) ? 0 : parsedValue;

    return Math.min(Math.max(safeValue, 0), 100);
}
// Popola il select degli scenari macro usando i preset disponibili.
function renderMacroScenarioOptions() {
    const scenarioSelect = document.getElementById('macroScenarioSelect');
    if (!scenarioSelect) {
        return;
    }

    const presets = window.macroScenarioPresets || {};
    const currentValue = scenarioSelect.value || selectedMacroScenario;

    scenarioSelect.innerHTML = '';

    Object.entries(presets).forEach(([key, preset]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = preset?.label || key;
        scenarioSelect.appendChild(option);
    });

    const resolvedValue = presets[currentValue] ? currentValue : Object.keys(presets)[0];
    if (resolvedValue) {
        selectedMacroScenario = resolvedValue;
        scenarioSelect.value = resolvedValue;
    }
}

// Aggiorna i controlli di UI per riflettere lo stato globale degli scenari macro.
// In questo modo sia la card in pagina sia lo switch del modal restano sincronizzati
// con le variabili `selectedMacroScenario` ed `enableMacroScenario`.
function syncMacroScenarioControls() {
    const scenarioSelect = document.getElementById('macroScenarioSelect');
    const toggleSwitch = document.getElementById('macroScenarioEnableSwitch');
    const modalToggle = document.getElementById('macroScenarioToggle');
    const macroStatus = document.getElementById('macroStatus');
    const isEnabled = Boolean(enableMacroScenario);

    renderMacroScenarioOptions();

    if (scenarioSelect) {
        scenarioSelect.value = selectedMacroScenario;
    }
    if (toggleSwitch) {
        toggleSwitch.checked = isEnabled;
    }
    if (modalToggle) {
        modalToggle.checked = isEnabled;
    }
    if (macroStatus) {
        macroStatus.textContent = isEnabled
            ? 'Gli scenari macro sono attivi e influenzano le simulazioni.'
            : 'Gli scenari macro sono disattivati.';
    }
}

// Applica il preset selezionato aggiornando lo stato globale e forzando il
// ricalcolo del percorso macro per i mesi di orizzonte impostati.
function handleMacroScenarioChange(scenarioKey) {
    const presets = window.macroScenarioPresets || {};
    const preset = presets[scenarioKey] || presets.baseline || presets.base || { macroPhases };
    const presetPhases = Array.isArray(preset)
        ? preset
        : Array.isArray(preset.macroPhases)
            ? preset.macroPhases
            : [];

    macroPhases = window.cloneMacroPhases
        ? window.cloneMacroPhases(presetPhases)
        : presetPhases.map(phase => ({ ...phase }));
    selectedMacroScenario = scenarioKey;

    // Svuotiamo i rendimenti simulati per forzare una rigenerazione coerente
    // con la nuova traiettoria macro.
    gbmReturnsByMonth = {};

    renderDashboard();
    syncMacroScenarioControls();
}

// Attiva o disattiva l'uso degli scenari macro sui rendimenti simulati.
// Questo flag viene propagato anche al resto della logica tramite
// `enableMacroAdjustments` per mantenere la compatibilità con il calcolo esistente.
function toggleMacroScenario(isEnabled) {
    enableMacroScenario = isEnabled;
    enableMacroAdjustments = isEnabled;

    // Rimuoviamo i rendimenti congelati così che il ricalcolo includa/subisca
    // l'effetto del flag di scenario macro aggiornato.
    gbmReturnsByMonth = {};

    renderDashboard();
    syncMacroScenarioControls();
}

function handleAllocationInput(asset, inputElement) {
    const sanitizedValue = sanitizeAllocationValue(inputElement.value);

    if (inputElement.value === "" || Number(inputElement.value) !== sanitizedValue) {
        inputElement.value = sanitizedValue;
    }

    handleAllocationChange(asset, sanitizedValue);
}

// Funzione per aggiornare l'allocazione
function handleAllocationChange(asset, value) {
    const numericValue = sanitizeAllocationValue(value);
    const remaining = 100 - numericValue;

    allocation[asset] = numericValue;
    const otherAssets = Object.keys(allocation).filter(a => a !== asset);
    const currentTotalOthers = otherAssets.reduce((acc, key) => acc + allocation[key], 0);

    if (currentTotalOthers === 0) {
        const evenShare = otherAssets.length ? Math.round(remaining / otherAssets.length) : 0;
        otherAssets.forEach((a, index) => {
            allocation[a] = index === otherAssets.length - 1
                ? remaining - evenShare * (otherAssets.length - 1)
                : evenShare;
        });
    } else {
        otherAssets.forEach(a => {
            allocation[a] = Math.round((allocation[a] / currentTotalOthers) * remaining);
        });
    }

    const adjustedTotal = Object.values(allocation).reduce((acc, val) => acc + val, 0);
    if (adjustedTotal !== 100) {
        allocation[otherAssets[0]] += 100 - adjustedTotal;
    }

    renderDashboard();
}


// Funzione per calcolare il livello di rischio
function getRiskLevel() {
    const riskWeights = [5, 3, 2, 1, 2, 4, 3]; // Peso di rischio per ciascun asset
    return Object.values(allocation).reduce((acc, val, index) => acc + val * riskWeights[index], 0) / 100;
}



function toggleFixedReturns(isEnabled) {
        useFixedReturnMode = isEnabled;
        renderDashboard();
}

function hasSimulatedReturns(state) {
    return state.gbmReturnsByMonth && Object.keys(state.gbmReturnsByMonth).length > 0;
}

function getActiveMacroPhases() {
    const preset = macroScenarioPresets[selectedMacroScenario];
    if (!enableMacroScenario) {
        return macroScenarioPresets.neutral?.macroPhases || [];
    }

    return preset?.macroPhases || macroScenarioPresets.neutral?.macroPhases || [];
}

function randomizePerformance() {
    gbmReturnsByMonth = {};
    // Lasciamo che renderDashboard ricostruisca macroByMonth in base al flag
    // enableMacroScenario e generi nuovi rendimenti simulati coerenti.
    renderDashboard();
}

function rerunCurrentSimulation() {
    randomizePerformance();
}


// Gestisce l'aggiornamento della frequenza di ribilanciamento e del relativo intervallo
function handleRebalanceFrequencyChange(value) {
    const numericValue = Number(value);

    rebalanceFrequencyPerYear = numericValue;
    rebalanceEveryMonths = rebalanceFrequencyPerYear === 0 ? 0 : Math.round(12 / rebalanceFrequencyPerYear);

    // Manteniamo lo stesso scenario di performance simulata per poter confrontare
    // l'impatto del ribilanciamento sui risultati complessivi.
    renderDashboard({ keepExistingReturns: true });
}

// Funzione per rendere il dashboard
function renderDashboard(options = {}) {
    const { keepExistingReturns = false } = options;
    const macroScenarioEnabled = Boolean(enableMacroScenario);

    // Manteniamo allineate le variabili di stato usate dal resto della pipeline di calcolo.
    enableMacroAdjustments = macroScenarioEnabled;
    // Expand macro phases into a month-by-month snapshot without altering
    // existing return logic. The data is stored for future integration but
    // remains unused by the current performance calculations.
    const totalMonths = Math.max(0, Math.round(timeHorizon * 12));
    const activeMacroPhases = getActiveMacroPhases();
    macroPhases = activeMacroPhases;
    const macroScenarioByMonth = buildMacroByMonth(activeMacroPhases, totalMonths);
    macroByMonth = macroScenarioByMonth;

    const portfolioState = getPortfolioState(
        keepExistingReturns
            ? { gbmReturnsByMonth, macroByMonth: macroScenarioByMonth, enableMacroAdjustments: macroScenarioEnabled }
            : { macroByMonth: macroScenarioByMonth, enableMacroAdjustments: macroScenarioEnabled }
    );

    if (!hasSimulatedReturns(portfolioState)) {
        generateSimulatedReturns(portfolioState);
    }
    document.getElementById('allocationbox').innerHTML = `
        <div class="portfolio-dashboard container">
            <!--<h1 class="text-center my-4">Data Dashboard per l'Asset Allocation del Portafoglio</h1>-->

            <div class="row">
                <div class="allocation-sliders col mb-4">
                    <div class="card shadow border-left-primary py-2 mb-4">
                        <div class="card-body">
                            <div class="row align-items-center no-gutters">
                                <div class="col mr-2">
                                    <label class="form-label mb-0">
                                        <div class="text-uppercase text-primary font-weight-bold text-xs mb-1"><span>Frequenza di ribilanciamento</span></div>
                                        <select class="form-control" onchange="handleRebalanceFrequencyChange(this.value)">
                                            <option value="0" ${rebalanceFrequencyPerYear === 0 ? "selected" : ""}>Nessun ribilanciamento</option>
                                            <option value="1" ${rebalanceFrequencyPerYear === 1 ? "selected" : ""}>1 volta all'anno</option>
                                            <option value="2" ${rebalanceFrequencyPerYear === 2 ? "selected" : ""}>2 volte all'anno</option>
                                        </select>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                    ${Object.keys(allocation).map(asset => `
                        <!--
                                                <div class="slider-container mb-3">
                            <label class="form-label">${asset}: ${allocation[asset]}%</label>
							
                        </div>
						-->
						
                                                <h4 class=" font-weight-bold">
                                                        ${allocation[asset]} % &nbsp;&nbsp; ${getAllocationDisplayLabel(asset)}
                                                        <span class="float-right">
                                                       <input type="number" class="form-range" min="0" max="100" value="${allocation[asset]}"
                                                                onkeydown="return false"  oninput="handleAllocationInput('${asset}', this)" />
                                                           <input type="range" class="form-range" min="0" max="100" value="${allocation[asset]}"
                                                                oninput="handleAllocationInput('${asset}', this)" />
                                                        </span>
                                                </h4>
						<div class="progress mb-4">
                                    <div class="progress-bar bg-primary" aria-valuenow="${allocation[asset]}" aria-valuemin="0" aria-valuemax="100" style="width: ${allocation[asset]}%;"><span class="sr-only"> ${allocation[asset]}%</span></div>
                                </div>
                    `).join('')}
                </div>
                
               
			<!--
                <div class="charts col">
                    <div class="gauge-chart mb-4">
                     <h2>${getLabel('ui.riskLevel')}</h2>
                      <div id="riskLevel">${(getRiskLevel() * 20).toFixed(2)}%</div>
                    </div>
                </div>
            </div>
-->
            

            

           
        </div>
    `;
	
	document.getElementById('rischiobox').innerHTML =  `<span><div id="riskLevel">${(getRiskLevel() * 20).toFixed(2)}%</div></span>`;

	document.getElementById('investmentinputbox').innerHTML =  `
			 <!--    mb-4  <div class="investment-inputs"> -->
			  <div class="col-md-6 col-xl-3 mb-4">
				<div class="card shadow border-left-primary py-2">
                    <div class="card-body">
                        <div class="row align-items-center no-gutters">
                            <div class="col mr-2">
								<label class="form-label">
								  <div class="text-uppercase text-primary font-weight-bold text-xs mb-1"><span>
                                                                  ${getLabel('ui.initialInvestment')}
								  </span></div>  
									<input type="number" class="form-control" value="${initialInvestment}" onchange="initialInvestment = Number(this.value); renderDashboard();" />
								</label>
							</div>
						</div>	
					</div>	
				</div>	
			  </div>	
			  <div class="col-md-6 col-xl-3 mb-4">
				<div class="card shadow border-left-primary py-2">
                    <div class="card-body">
                        <div class="row align-items-center no-gutters">
                            <div class="col mr-2">
								<label class="form-label">
								  <div class="text-uppercase text-primary font-weight-bold text-xs mb-1"><span>
                                                                  ${getLabel('ui.monthlyContribution')}
								  </span></div>  
									<input type="number" class="form-control" value="${monthlyContribution}" onchange="monthlyContribution = Number(this.value); renderDashboard();" />
								</label>
							</div>
						</div>	
					</div>	
				</div>					
			  </div>	
			  <div class="col-md-6 col-xl-3 mb-4">
			    <div class="card shadow border-left-primary py-2">
                    <div class="card-body">
                        <div class="row align-items-center no-gutters">
                            <div class="col mr-2">
								<label class="form-label">
								  <div class="text-uppercase text-primary font-weight-bold text-xs mb-1"><span>
                                                                  ${getLabel('ui.timeHorizonYears')}
								  </span></div>  
										<input type="number" class="form-control" value="${timeHorizon}" onchange="timeHorizon = Number(this.value); renderDashboard();" />
								</label>
							</div>
						</div>	
					</div>	
				</div>
			  </div>	
			  <div class="col-md-6 col-xl-3 mb-4">
				  <div class="card shadow border-left-primary py-2">
						<div class="card-body">
							<div class="row align-items-center no-gutters">
								<div class="col mr-2">
									<label class="form-label">
									  <div class="text-uppercase text-primary font-weight-bold text-xs mb-1"><span>
                                                                            ${getLabel('ui.totalContributions')}
									  </span></div>  
									  <div class="row no-gutters align-items-center">
                                        <div class="col-auto">
                                            <div id="contibutitotali" class="text-dark font-weight-bold h5 mb-0 mr-3"></div>
                                        </div>
                                        <div class="col">
                                           
                                        </div>
                                    </div>
											</label>
								</div>
							</div>	
						</div>	
					</div>
			  </div>
               
            </div>
	`;
        document.getElementById('performancebox').innerHTML =  `
         <div class="portfolio-performance">
                <h2>${getLabel('ui.portfolioPerformance')}</h2>
                <div class="row">
                    <div class="col-12 mb-4">
                        <div class="card shadow border-left-primary py-2 h-100">
                            <div class="card-body">
                                <canvas id="lineChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

document.getElementById('perfomancetotale').innerHTML =  `<span>  ${ euro.format(calculatePortfolioValue(portfolioState, timeHorizon * 12) - calculateContribValue(portfolioState, timeHorizon * 12))  }</span>`;


document.getElementById('perfomancetotaleperc').innerHTML =  `<span>  ${ parseFloat(((calculatePortfolioValue(portfolioState, timeHorizon * 12) / calculateContribValue(portfolioState, timeHorizon * 12))-1)*100).toFixed(2)+"%"  }</span>`;
	
	

document.getElementById('contibutitotali').innerHTML =  `<span>  ${ euro.format(calculateContribValue(portfolioState, timeHorizon * 12))  }</span>`;
	
	
 
    // Render del grafico a ciambella
   /* const doughnutCtx = document.getElementById('doughnutChart').getContext('2d');
    new Chart(doughnutCtx, {
        type: 'doughnut',
        data: getDoughnutData(),
		 
        options: {
			
        }
    });*/
	
const doughnutCtx = document.getElementById('doughnutChart').getContext('2d');
const isSmallScreen = window.matchMedia('(max-width: 576px)').matches;
new Chart(doughnutCtx, {
    type: 'doughnut',
    data: getDoughnutData(),
    options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: {
                top: 12,
                right: 12,
                bottom: 12,
                left: 12,
            },
        },
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    boxWidth: 12,
                    boxHeight: 12,
                    padding: 14,
                    font: {
                        size: isSmallScreen ? 11 : 12,
                    },
                },
            },
        },
        cutout: '50%',
        animation: {
            animateScale: false,
            animateRotate: false,
        },
        events: [], // Disabilita qualsiasi evento di interazione (come il click)
    }
});




    // Render del grafico lineare (portfolio + eventuali curve macro)
    const lineCtx = document.getElementById('lineChart').getContext('2d');
    const macroLinesVisible = macroScenarioEnabled && macroScenarioByMonth.length > 0;
    const lineChartData = getMonthlyData({
        portfolioState,
        macroScenarioByMonth,
        macroEnabled: macroLinesVisible,
    });

    new Chart(lineCtx, {
        type: 'line',
        data: lineChartData,
        options: {
            plugins: {
                datalabels: {
                    display: function(context) {
                        return context.active;
                    },
                    formatter: function(value, context) {
                        const isMacroDataset = context?.dataset?.yAxisID === 'macroAxis';
                        const formattedValue = isMacroDataset
                            ? `${Number(value).toFixed(2)}%`
                            : `€${Number(value).toFixed(2)}`;

                        return formattedValue;
                    }
                }
            },
            tooltips: {
                callbacks: {
                    label: function(tooltipItem, data) {
                        const dataset = data.datasets[tooltipItem.datasetIndex] || {};
                        const label = dataset.label || '';
                        const isMacroDataset = dataset.yAxisID === 'macroAxis';
                        const value = Number(tooltipItem.yLabel).toFixed(2);
                        const formattedValue = isMacroDataset ? `${value}%` : `€${value}`;

                        return `${label}: ${formattedValue}`;
                    }
                }
            },
            scales: {
                yAxes: [
                    {
                        id: 'valueAxis',
                        position: 'left',
                        ticks: {
                            callback: function(value) {
                                return `€${Number(value).toFixed(0)}`;
                            },
                        },
                        scaleLabel: {
                            display: true,
                            labelString: 'Valore portafoglio',
                        },
                    },
                    {
                        id: 'macroAxis',
                        position: 'right',
                        display: macroLinesVisible,
                        gridLines: {
                            drawOnChartArea: false,
                        },
                        ticks: {
                            callback: function(value) {
                                return `${Number(value).toFixed(1)}%`;
                            },
                        },
                        scaleLabel: {
                            display: macroLinesVisible,
                            labelString: 'Indicatori macro (%)',
                        },
                    },
                ],
            },
        }
    });
	
	
	
	
	creaTabella(timeHorizon * 12);
	
	
	creaTabella2(timeHorizon);
	
	
	
	
	
}

document.addEventListener('DOMContentLoaded', () => {
    syncMacroScenarioControls();
});

// Prima renderizzazione del dashboard
renderDashboard();






