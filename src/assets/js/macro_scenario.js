(function (global) {
  let selectedMacroScenario = global.marketData.defaults.selectedMacroScenario;
  let enableMacroScenario = global.marketData.defaults.enableMacroAdjustments;
  let macroScenarioByMonth = [];

  function interpolate(from, to, index, total) {
    if (total <= 1) return Number(to);
    return Number(from) + (Number(to) - Number(from)) * (index / (total - 1));
  }
  function buildMacroScenario(presetKey, months) {
    const preset = global.marketData.macroScenarioPresets[presetKey] || global.marketData.macroScenarioPresets.neutral;
    const rows = Array.from({ length: months + 1 }, (_, month) => ({ month, inflation: 0.02, policyRate: 0.025, realRate: 0.005, regimeTag: "neutral" }));
    preset.macroPhases.forEach((phase) => {
      for (let i = 0; i < phase.duration; i += 1) {
        const month = phase.startMonth + i;
        if (month > months) break;
        const inflation = interpolate(phase.inflationFrom, phase.inflationTo, i, phase.duration);
        const policyRate = interpolate(phase.rateFrom, phase.rateTo, i, phase.duration);
        rows[month] = { month, inflation, policyRate, realRate: policyRate - inflation, regimeTag: phase.regimeTag };
      }
    });
    for (let month = 1; month < rows.length; month += 1) {
      if (!rows[month]) rows[month] = { ...rows[month - 1], month };
    }
    return rows;
  }
  function rebuildMacroScenario(months) {
    macroScenarioByMonth = buildMacroScenario(selectedMacroScenario, months || 0);
    global.macroScenarioByMonth = macroScenarioByMonth;
    return macroScenarioByMonth;
  }
  function getMacroState(month) {
    return macroScenarioByMonth[Math.min(month, macroScenarioByMonth.length - 1)] || null;
  }
  function setMacroScenario(key) {
    if (!global.marketData.macroScenarioPresets[key]) return false;
    selectedMacroScenario = key;
    global.selectedMacroScenario = selectedMacroScenario;
    return true;
  }
  function setMacroEnabled(enabled) {
    enableMacroScenario = Boolean(enabled);
    global.enableMacroScenario = enableMacroScenario;
  }
  function handleMacroScenarioChange(value) {
    if (setMacroScenario(value) && typeof global.renderDashboard === "function") global.renderDashboard({ rerunMonteCarlo: false });
  }
  function toggleMacroScenario(checked) {
    setMacroEnabled(checked);
    if (typeof global.renderDashboard === "function") global.renderDashboard({ rerunMonteCarlo: false });
  }
  global.selectedMacroScenario = selectedMacroScenario;
  global.enableMacroScenario = enableMacroScenario;
  global.macroScenarioByMonth = macroScenarioByMonth;
  global.macroScenarioPresets = global.marketData.macroScenarioPresets;
  global.buildMacroScenario = buildMacroScenario;
  global.rebuildMacroScenario = rebuildMacroScenario;
  global.getMacroState = getMacroState;
  global.setMacroScenario = setMacroScenario;
  global.setMacroEnabled = setMacroEnabled;
  global.handleMacroScenarioChange = handleMacroScenarioChange;
  global.toggleMacroScenario = toggleMacroScenario;
})(window);
