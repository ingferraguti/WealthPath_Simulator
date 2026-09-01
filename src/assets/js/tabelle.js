(function (global) {
  const euroFormatter = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  function euro(value) { return euroFormatter.format(Number(value) || 0); }
  function percent(value) { return `${((Number(value) || 0) * 100).toFixed(2)}%`; }
  function tableMarkup(headers, rows) {
    return `<thead><tr>${headers.map((header) => `<th scope="col">${header}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody>`;
  }

  function renderMonthlyTable(simulation) {
    const table = document.getElementById("monthlyTable");
    if (!table) return;
    const rows = new Array(simulation.nominalValues.length);
    for (let month = 0; month < simulation.nominalValues.length; month += 1) {
      const value = simulation.nominalValues[month];
      const previous = month > 0 ? simulation.nominalValues[month - 1] : value;
      const contribution = month > 0 ? simulation.contributions[month] - simulation.contributions[month - 1] : 0;
      const monthlyPerformance = month > 0 && previous + contribution > 0 ? (value / (previous + contribution)) - 1 : 0;
      rows[month] = `<tr><td>${month}</td><td>${euro(value)}</td><td>${euro(simulation.contributions[month])}</td><td>${euro(value - previous)}</td><td>${percent(monthlyPerformance)}</td></tr>`;
    }
    table.innerHTML = tableMarkup(["Mese", "Valore", "Capitale versato", "Incremento mensile", "Performance mensile"], rows);
  }

  function renderAnnualTable(simulation) {
    const table = document.getElementById("annualTable");
    if (!table) return;
    const years = Math.floor((simulation.nominalValues.length - 1) / 12);
    const rows = new Array(years);
    for (let year = 1; year <= years; year += 1) {
      const month = year * 12;
      const previousMonth = (year - 1) * 12;
      const value = simulation.nominalValues[month];
      const previous = simulation.nominalValues[previousMonth];
      const annualReturns = global.PortfolioStatistics.monthlyReturns(simulation.nominalValues.slice(previousMonth, month + 1), simulation.contributions.slice(previousMonth, month + 1));
      const annualReturn = annualReturns.reduce((growth, monthlyReturn) => growth * (1 + monthlyReturn), 1) - 1;
      rows[year - 1] = `<tr><td>${year}</td><td>${euro(value)}</td><td>${euro(simulation.contributions[month])}</td><td>${euro(value - previous)}</td><td>${percent(annualReturn)}</td></tr>`;
    }
    table.innerHTML = tableMarkup(["Anno", "Valore", "Capitale versato", "Incremento annuale", "Performance annuale"], rows);
  }

  function creaTabella() { if (global.currentSimulation) renderMonthlyTable(global.currentSimulation); }
  function creaTabella2() { if (global.currentSimulation) renderAnnualTable(global.currentSimulation); }
  global.renderMonthlyTable = renderMonthlyTable;
  global.renderAnnualTable = renderAnnualTable;
  global.creaTabella = creaTabella;
  global.creaTabella2 = creaTabella2;
})(window);
