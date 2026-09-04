(function (global) {
  const euroFormatter = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  function euro(value) { return euroFormatter.format(Number(value) || 0); }
  function percent(value) { return `${((Number(value) || 0) * 100).toFixed(2)}%`; }
  function ltv(value) { return Number.isFinite(value) ? percent(value) : "n.d."; }
  function tableMarkup(headers, rows) {
    return `<thead><tr>${headers.map((header) => `<th scope="col">${header}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody>`;
  }

  function renderMonthlyTable(simulation) {
    const table = document.getElementById("monthlyTable");
    if (!table) return;
    const hasLombard = Boolean(simulation.lombardEnabled);
    const rows = new Array(simulation.nominalValues.length);
    for (let month = 0; month < simulation.nominalValues.length; month += 1) {
      const value = simulation.nominalValues[month];
      const previous = month > 0 ? simulation.nominalValues[month - 1] : value;
      const contribution = month > 0 ? simulation.contributions[month] - simulation.contributions[month - 1] : 0;
      const withdrawal = month > 0 ? simulation.withdrawals[month] - simulation.withdrawals[month - 1] : 0;
      const tax = month > 0 ? simulation.rebalanceTaxes[month] - simulation.rebalanceTaxes[month - 1] : 0;
      const monthlyPerformance = month > 0 && previous + contribution - withdrawal > 0 ? (value / (previous + contribution - withdrawal)) - 1 : 0;
      const lombardCells = hasLombard ? `<td>${euro(simulation.lombardDebts[month])}</td><td>${ltv(simulation.lombardLtvs[month])}</td><td>${simulation.marginCalls[month] ? "<strong>Margin call</strong>" : "—"}</td>` : "";
      rows[month] = `<tr class="${hasLombard && simulation.marginCalls[month] ? "table-danger" : ""}"><td>${month}</td><td>${euro(value)}</td><td>${euro(simulation.contributions[month])}</td><td>${euro(withdrawal)}</td><td>${euro(tax)}</td><td>${percent(monthlyPerformance)}</td>${lombardCells}</tr>`;
    }
    table.innerHTML = tableMarkup(["Mese", "Patrimonio netto", "Capitale versato", "Prelievo mese", "Tasse ribil.", "Performance mensile"].concat(hasLombard ? ["Debito Lombard", "LTV", "Stato"] : []), rows);
  }

  function renderAnnualTable(simulation) {
    const table = document.getElementById("annualTable");
    if (!table) return;
    const hasLombard = Boolean(simulation.lombardEnabled);
    const years = Math.floor((simulation.nominalValues.length - 1) / 12);
    const rows = new Array(years);
    for (let year = 1; year <= years; year += 1) {
      const month = year * 12;
      const previousMonth = (year - 1) * 12;
      const value = simulation.nominalValues[month];
      const annualReturns = global.PortfolioStatistics.monthlyReturns(simulation.nominalValues.slice(previousMonth, month + 1), simulation.contributions.slice(previousMonth, month + 1), simulation.withdrawals.slice(previousMonth, month + 1));
      const annualReturn = annualReturns.reduce((growth, monthlyReturn) => growth * (1 + monthlyReturn), 1) - 1;
      const marginCall = hasLombard && simulation.marginCalls.slice(previousMonth + 1, month + 1).some(Boolean);
      const lombardCells = hasLombard ? `<td>${euro(simulation.lombardDebts[month])}</td><td>${ltv(simulation.lombardLtvs[month])}</td><td>${marginCall ? "<strong>Margin call</strong>" : "—"}</td>` : "";
      rows[year - 1] = `<tr class="${marginCall ? "table-danger" : ""}"><td>${year}</td><td>${euro(value)}</td><td>${euro(simulation.contributions[month])}</td><td>${euro(simulation.withdrawals[month])}</td><td>${euro(simulation.rebalanceTaxes[month])}</td><td>${percent(annualReturn)}</td>${lombardCells}</tr>`;
    }
    table.innerHTML = tableMarkup(["Anno", "Patrimonio netto", "Capitale versato", "Prelievi cumulati", "Tasse ribil. cumulate", "Performance annua"].concat(hasLombard ? ["Debito Lombard", "LTV", "Stato"] : []), rows);
  }

  function creaTabella() { if (global.currentSimulation) renderMonthlyTable(global.currentSimulation); }
  function creaTabella2() { if (global.currentSimulation) renderAnnualTable(global.currentSimulation); }
  global.renderMonthlyTable = renderMonthlyTable;
  global.renderAnnualTable = renderAnnualTable;
  global.creaTabella = creaTabella;
  global.creaTabella2 = creaTabella2;
})(window);
