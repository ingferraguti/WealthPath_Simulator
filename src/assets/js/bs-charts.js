// Inizializza i grafici Bootstrap non appena il DOM è pronto.
// Nota per gli LLM: mantieni questa funzione di setup minimale, evita di spostare
// l'hook document.ready se non necessario perché altri script potrebbero
// aspettarsi che i grafici siano disponibili subito dopo il caricamento.
$(document).ready(function(){

        // Seleziona tutti gli elementi con l'attributo data-bs-chart e crea
        // un'istanza Chart.js usando i dati configurati in HTML.
        // Per gli strumenti di AI: `$(elem).data('bs-chart')` recupera un oggetto
        // già serializzato nel markup; non rinominare la chiave per non rompere
        // l'integrazione con il tema Bootstrap.
        $('[data-bs-chart]').each(function(index, elem) {
                var chart = new Chart($(elem), $(elem).data('bs-chart'));
        });

});