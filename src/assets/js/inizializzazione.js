//INIZIALIZZAZIONE

// Inizializzazione dello stato
const priceRatios = [1.0177, 1.0237, 1.0509, 1.0373, 0.9769, 1.0301, 0.9776, 0.9768, 1.0152, 1.0071, 1.0343, 1.0056, 1.0247, 0.9751, 1.0314, 1.0214, 1.0441, 0.9971, 1.0256, 1.0227, 0.9628, 0.9982, 1.0055, 1.0238, 1.0107, 1.0361, 1.0227, 1.0195, 1.0112, 0.9935, 1.0159, 1.0421, 1.0247, 0.9910, 0.9772, 0.9973, 1.0461, 1.0299, 0.9576, 0.9863, 0.9229, 0.9926, 0.9875, 1.0498, 1.0111, 0.9190, 0.9747, 0.9840, 0.8787, 0.8101, 0.9328, 1.0306, 0.9115, 0.8951, 1.0724, 1.1090, 1.0862, 0.9939, 1.0837, 1.0391, 1.0381, 0.9815, 1.0387, 1.0169, 0.9581, 1.0123, 1.0593, 0.9984, 0.9009, 0.9644, 1.0802, 0.9608, 1.0911, 1.0365, 0.9765, 1.0725, 1.0219, 1.0333, 0.9876, 1.0402, 0.9755, 0.9827, 0.9811, 0.9274, 0.9115, 1.1026, 0.9731, 0.9983, 1.0493, 1.0466, 1.0102, 0.9863, 0.9101, 1.0493, 1.0120, 1.0229, 1.0252, 0.9924, 1.0107, 1.0175, 1.0500, 0.9998, 1.0209, 1.0290, 0.9971, 0.9739, 1.0519, 0.9767, 1.0482, 1.0383, 1.0159, 1.0201, 0.9623, 1.0481, 0.9991, 1.0083, 1.0163, 1.0165, 0.9833, 1.0200, 0.9713, 1.0057, 1.0184, 0.9829, 0.9812, 1.0568, 0.9819, 1.0216, 1.0005, 0.9754, 1.0173, 0.9319, 0.9614, 1.0783, 0.9933, 0.9813, 0.9395, 0.9904, 1.0652, 1.0138, 1.0023, 0.9872, 1.0415, 0.9987, 1.0036, 0.9799, 1.0125, 1.0229, 1.0235, 1.0258, 1.0082, 1.0133, 1.0178, 1.0025, 1.0233, 0.9993, 1.0208, 1.0181, 1.0199, 1.0126, 1.0522, 0.9570, 0.9759, 1.0095, 1.0031, 0.9983, 1.0305, 1.0104, 1.0039, 0.9258, 1.0096, 0.9229, 1.0768, 1.0283, 1.0105, 1.0337, 0.9392, 1.0646, 1.0042, 0.9776, 1.0194, 1.0245, 1.0263, 1.0289, 0.9932, 0.9141, 0.8653, 1.1080, 1.0463, 1.0251, 1.0469, 1.0653, 0.9641, 0.9686, 1.1266, 1.0414, 0.9895, 1.0245, 1.0311, 1.0452, 1.0126, 1.0140, 1.0172, 1.0235, 0.9571, 1.0559, 0.9770, 1.0419, 0.9466, 0.9735, 1.0252, 0.9157, 0.9984, 0.9123, 1.0786, 0.9567, 0.9054, 1.0711, 1.0680, 0.9566, 1.0700, 0.9747, 1.0283, 1.0159, 0.9875, 1.0593, 1.0329, 0.9745, 0.9555, 0.9703, 1.0921, 1.0481, 1.0114, 1.0411, 1.0301, 0.9615, 1.0423, 1.0193, 1.0170, 1.0251, 1.0169, 0.9796];


let initialInvestment = 10000;
let monthlyContribution = 200;
let timeHorizon = 1; // Orizzonte temporale in anni


const allocation = {
    azionarioGlobale: 30,
    obblGovEU10: 15,
    obblGovEU3: 15,
    obblEUInflLinked: 15,
    obblCorporate: 10,
    materiePrime: 5,
    oro: 10,
};


const allocationLabel = {
            azionarioGlobale: 'Azionario Globale',
            obblGovEU10: 'Obbl. GOV EU 10+ Y',
            obblGovEU3: 'Obbl. GOV EU 3-7 Y',
            obblEUInflLinked: 'Obbl. EU infl. linked',
            obblCorporate: 'Obbl. corporate',
            materiePrime: 'Materie Prime',
            oro: 'Oro',
};


function getOroPerformance() {
    // Genera un numero casuale uniforme tra 0 e 1
    const random = Math.random();

    // Trasforma il numero casuale per adattarlo all'intervallo [0.87, 1.17]
    // con una media che tende a 1.07
    const performance = 0.87 + (random ** 0.5) * (1.17 - 0.87);

    return performance;
}



const returnFunctions = [
		{
			assetClass: "azionarioGlobale",
			//calculateReturn: mese => priceRatios[mese % priceRatios.length] // Simulazione di un rendimento variabile
			calculateReturn: mese => 1.01
		},
		{
			assetClass: "obblGovEU10",
			//calculateReturn: mese => 1.02 + 0.005 * Math.cos(mese) // Simulazione di un altro rendimento variabile
			calculateReturn: mese => 1
		},
		{
			assetClass: "obblGovEU3",
			//calculateReturn: mese => 1.03 + 0.007 * Math.sin(mese / 2) // Rendimento oscillante
			calculateReturn: mese => 1
		},
		{
			assetClass: "obblEUInflLinked",
			//calculateReturn: mese => 1.01 // Rendimento fisso
			calculateReturn: mese => 1
		},
		{
			assetClass: "obblCorporate",
			//calculateReturn: mese => 1.03 + 0.007 * Math.sin(mese / 2) // Rendimento oscillante
			calculateReturn: mese => 1
		},
		{
			assetClass: "materiePrime",
			//calculateReturn: mese => getOroPerformance() // Rendimento fisso
			calculateReturn: mese => 1
		},
		{
			assetClass: "oro",
			//calculateReturn: mese => getOroPerformance() // Rendimento 
			calculateReturn: mese => 1
		}
	];

let euro = Intl.NumberFormat('en-DE', {
    style: 'currency',
    currency: 'EUR',
});