


function sanitizeAllocationValue(rawValue) {
    const parsedValue = parseInt(rawValue, 10);
    const safeValue = Number.isNaN(parsedValue) ? 0 : parsedValue;

    return Math.min(Math.max(safeValue, 0), 100);
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
        gbmReturnsByMonth = {};
        renderDashboard();
}

function hasSimulatedReturns(state) {
    return state.gbmReturnsByMonth && Object.keys(state.gbmReturnsByMonth).length > 0;
}

function randomizePerformance() {
    gbmReturnsByMonth = {};

    const portfolioState = getPortfolioState({ gbmReturnsByMonth: {} });
    generateSimulatedReturns(portfolioState);
    renderDashboard();
}

function rerunCurrentSimulation() {
    randomizePerformance();
}




// Funzione per rendere il dashboard
function renderDashboard() {
    const portfolioState = getPortfolioState();

    if (!hasSimulatedReturns(portfolioState)) {
        generateSimulatedReturns(portfolioState);
    }
    document.getElementById('allocationbox').innerHTML = `
        <div class="portfolio-dashboard container">
            <!--<h1 class="text-center my-4">Data Dashboard per l'Asset Allocation del Portafoglio</h1>-->
            
            <div class="row">
                <div class="allocation-sliders col mb-4">
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
                <canvas id="lineChart"></canvas>
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




    // Render del grafico lineare
    const lineCtx = document.getElementById('lineChart').getContext('2d');
    new Chart(lineCtx, {
        type: 'line',
        data: getMonthlyData(),
        options: {
            plugins: {
                datalabels: {
                    display: function(context) {
                        return context.active;
                    },
                    formatter: function(value) {
                        return `€${Number(value).toFixed(2)}`;
                    }
                }
            },
            tooltips: {
                callbacks: {
                    label: function(tooltipItem, data) {
                        const label = data.datasets[tooltipItem.datasetIndex].label || '';
                        const value = Number(tooltipItem.yLabel).toFixed(2);
                        return `${label}: €${value}`;
                    }
                }
            }
        }
    });
	
	
	
	
	creaTabella(timeHorizon * 12);
	
	
	creaTabella2(timeHorizon);
	
	
	
	
	
}

// Prima renderizzazione del dashboard
renderDashboard();






