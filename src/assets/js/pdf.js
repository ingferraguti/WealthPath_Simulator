//PDF  --- SCARICA REPORT










/*
async function downloadPDF() {
            // Importa le funzionalità di jsPDF
            const { jsPDF } = window.jspdf;

            // Crea una nuova istanza di jsPDF
            const doc = new jsPDF();

            // Seleziona il contenuto da aggiungere al PDF
            const content = document.getElementById('table-container');

            // Aggiungi il contenuto HTML al PDF
            await doc.html(content, {
                callback: function (doc) {
                    // Salva il PDF con il nome file "pagina_esempio.pdf"
                    doc.save('report.pdf');
                },
                x: 10,
                y: 10
            });
        }
		*/
		
 async function downloadPDF() {
            // Importa le funzionalità di jsPDF
            const { jsPDF } = window.jspdf;

            // Crea una nuova istanza di jsPDF in formato A4
            const pdf = new jsPDF('p', 'mm', 'a4');

            // Funzione per aggiungere contenuto HTML come immagine nel PDF
            async function addContentToPDF(contentId, pdf, offsetX, offsetY) {
                const content = document.getElementById(contentId);
                const canvas = await html2canvas(content, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');
                const pdfWidth = 210;
                const imgHeight = (canvas.height * pdfWidth) / canvas.width;

                pdf.addImage(imgData, 'PNG', offsetX, offsetY, pdfWidth, imgHeight);
            }

            // Aggiungi la prima pagina al PDF
            await addContentToPDF('contenutopagina', pdf, 0, 10);

            // Aggiungi una seconda pagina
            pdf.addPage();

            // Aggiungi il contenuto alla seconda pagina
            await addContentToPDF('tablecontaineranno', pdf, 0, 10);

            // Salva il PDF con il nome file "pagina_esempio.pdf"
            pdf.save('pagina_esempio.pdf');
        }		
/*		
async function downloadPDF() {
            // Importa le funzionalità di jsPDF
            const { jsPDF } = window.jspdf;

            // Seleziona il contenuto da convertire in PDF
            const content = document.getElementById('contenutopagina');

            // Usa html2canvas per catturare l'immagine del contenuto
            html2canvas(content, { scale: 2 }).then((canvas) => {
                // Ottieni l'immagine dal canvas in formato data URL
                const imgData = canvas.toDataURL('image/png');

                // Dimensioni di un A4 in pixel (per il formato PDF)
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = 210;  // Larghezza A4 in mm
                const pdfHeight = 297; // Altezza A4 in mm
                const imgWidth = pdfWidth;
                const imgHeight = (canvas.height * pdfWidth) / canvas.width;

                // Aggiungi l'immagine al PDF, adattandola alla larghezza A4
                pdf.addImage(imgData, 'PNG', 0, 10, imgWidth, imgHeight);

                // Salva il PDF con il nome file "pagina_esempio.pdf"
                pdf.save('pagina_esempio.pdf');
            });
        }
		*/