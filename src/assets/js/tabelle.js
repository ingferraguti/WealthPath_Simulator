(function (global) {
  function euro(value) { return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(value) || 0); }
  function percent(value) { return `${((Number(value) || 0) * 100).toFixed(2)}%`; }
  function clearAndHeader(table, headers) {
    table.innerHTML = "";
    const thead = table.createTHead();
    const row = thead.insertRow();
    headers.forEach((header) => { const th = document.createElement("th"); th.scope = "col"; th.textContent = header; row.appendChild(th); });
    return table.createTBody();
  }
  function renderMonthlyTable(simulation) {
    const table = document.getElementById("monthlyTable"); if (!table) return;
    const body = clearAndHeader(table, ["Mese", "Valore", "Capitale versato", "Incremento mensile", "Performance mensile"]);
    simulation.nominalValues.forEach((value, month) => {
      const previous = month > 0 ? simulation.nominalValues[month - 1] : value;
      const contribution = month > 0 ? simulation.contributions[month] - simulation.contributions[month - 1] : 0;
      const row = body.insertRow();
      row.insertCell().textContent = month;
      row.insertCell().textContent = euro(value);
      row.insertCell().textContent = euro(simulation.contributions[month]);
      row.insertCell().textContent = euro(value - previous);
      row.insertCell().textContent = month > 0 && previous + contribution > 0 ? percent((value / (previous + contribution)) - 1) : "0,00%";
    });
  }
  function renderAnnualTable(simulation) {
    const table = document.getElementById("annualTable"); if (!table) return;
    const body = clearAndHeader(table, ["Anno", "Valore", "Capitale versato", "Incremento annuale", "Performance annuale"]);
    const years = Math.floor((simulation.nominalValues.length - 1) / 12);
    for (let year = 1; year <= years; year += 1) {
      const month = year * 12;
      const previousMonth = (year - 1) * 12;
      const value = simulation.nominalValues[month];
      const previous = simulation.nominalValues[previousMonth];
      const annualReturns = global.PortfolioStatistics.monthlyReturns(
        simulation.nominalValues.slice(previousMonth, month + 1),
        simulation.contributions.slice(previousMonth, month + 1)
      );
      const annualReturn = annualReturns.reduce((growth, monthlyReturn) => growth * (1 + monthlyReturn), 1) - 1;
      const row = body.insertRow();
      row.insertCell().textContent = year;
      row.insertCell().textContent = euro(value);
      row.insertCell().textContent = euro(simulation.contributions[month]);
      row.insertCell().textContent = euro(value - previous);
      row.insertCell().textContent = percent(annualReturn);
    }
  }
  function creaTabella() { if (global.currentSimulation) renderMonthlyTable(global.currentSimulation); }
  function creaTabella2() { if (global.currentSimulation) renderAnnualTable(global.currentSimulation); }
  global.renderMonthlyTable = renderMonthlyTable;
  global.renderAnnualTable = renderAnnualTable;
  global.creaTabella = creaTabella;
  global.creaTabella2 = creaTabella2;
})(window);
