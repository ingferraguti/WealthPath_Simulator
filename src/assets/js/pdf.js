(function (global) {
  function money(value) { return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(value) || 0); }
  function pct(value) { return `${((Number(value) || 0) * 100).toFixed(2)}%`; }
  async function addCanvasImage(pdf, canvasId, title, y) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !global.html2canvas) return y;
    if (y > 220) { pdf.addPage(); y = 18; }
    pdf.setFontSize(12); pdf.text(title, 14, y); y += 4;
    const imageCanvas = await html2canvas(canvas.parentElement, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = imageCanvas.toDataURL("image/png");
    const width = 182;
    const height = Math.min(80, imageCanvas.height * width / imageCanvas.width);
    if (y + height > 285) { pdf.addPage(); y = 18; }
    pdf.addImage(imgData, "PNG", 14, y, width, height);
    return y + height + 8;
  }
  function addTextLines(pdf, lines, y) {
    lines.forEach((line) => {
      if (y > 285) { pdf.addPage(); y = 18; }
      pdf.text(line, 14, y); y += 6;
    });
    return y;
  }
  async function downloadPDF() {
    if (!global.jspdf || !global.currentSettings || !global.currentSimulation) return;
    const { jsPDF } = global.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    const settings = global.currentSettings;
    const simulation = global.currentSimulation;
    const stats = global.currentStatistics;
    const mc = global.currentMonteCarlo;
    let y = 18;
    pdf.setFontSize(20); pdf.text(global.labels.app.title, 14, y); y += 8;
    pdf.setFontSize(11); pdf.text(global.labels.app.tagline, 14, y); y += 10;
    pdf.setFontSize(10);
    y = addTextLines(pdf, [
      `Generato il: ${new Date().toLocaleString("it-IT")}`,
      `Seed: ${settings.seed}`,
      `Investimento iniziale: ${money(settings.initialInvestment)} | Contributo mensile: ${money(settings.monthlyContribution)} | Orizzonte: ${settings.timeHorizonYears} anni`,
      `Modalità: ${settings.fixedReturnsMode ? "rendimenti fissi" : "GBM"} | Ribilanciamento: ${global.labels.rebalance[settings.rebalanceFrequencyPerYear]}`,
      `Scenario macro: ${settings.enableMacroAdjustments ? global.marketData.macroScenarioPresets[settings.selectedMacroScenario].label : "disattivato"}`,
      `Allocazione: ${global.marketData.assetClasses.map((asset) => `${global.labels.assets[asset]} ${settings.allocation[asset]}%`).join("; ")}`,
      `Valore finale: ${money(simulation.finalValue)} | Capitale versato: ${money(simulation.contributions[simulation.contributions.length - 1])} | Valore reale finale: ${simulation.finalRealValue === null ? "n.d." : money(simulation.finalRealValue)}`,
      `Rendimento annualizzato: ${pct(stats.annualizedReturn)} | Volatilità annualizzata: ${pct(stats.annualizedVolatility)} | Massimo drawdown: ${pct(stats.maxDrawdown)} | Rischio: ${stats.riskScore.toFixed(2)} / 5`
    ], y);
    if (mc) y = addTextLines(pdf, [`Monte Carlo: media finale ${money(mc.stats.meanFinal)}, mediana ${money(mc.stats.medianFinal)}, P5 ${money(mc.stats.p5)}, P95 ${money(mc.stats.p95)}, probabilità obiettivo ${pct(mc.stats.targetProbability)}.`], y + 2);
    y = await addCanvasImage(pdf, "portfolioChart", "Grafico principale", y + 4);
    if (mc) {
      y = await addCanvasImage(pdf, "monteCarloChart", "Bande Monte Carlo", y);
      y = await addCanvasImage(pdf, "monteCarloHistogram", "Istogramma valori finali", y);
    }
    if (y > 220) { pdf.addPage(); y = 18; }
    pdf.setFontSize(12); pdf.text("Tabella annuale", 14, y); y += 6; pdf.setFontSize(8);
    const rows = Array.from(document.querySelectorAll("#annualTable tbody tr")).slice(0, 28);
    rows.forEach((row) => { const text = Array.from(row.cells).map((cell) => cell.textContent).join(" | "); y = addTextLines(pdf, [text], y); });
    pdf.setFontSize(9);
    y = addTextLines(pdf, ["Nota metodologica: la simulazione non costituisce consulenza finanziaria. I risultati dipendono dalle ipotesi su rendimenti, volatilità, scenario macro e ribilanciamento; non incorporano fiscalità o serie storiche reali non ancora integrate."], y + 4);
    const date = new Date().toISOString().slice(0, 10);
    pdf.save(`wealthpath-simulator-report-${date}.pdf`);
  }
  global.downloadPDF = downloadPDF;
})(window);
