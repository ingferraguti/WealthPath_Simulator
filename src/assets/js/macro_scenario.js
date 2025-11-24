/**
 * Macro scenario utilities
 * ------------------------
 * This module exposes helper functions to describe and expand high-level
 * macroeconomic regimes (inflation + policy rates) month by month without
 * altering the existing asset return logic.
 */
(function (global) {
  // Neutral baseline used for any month not covered by an explicit phase.
  const defaultMacroPoint = {
    inflation: 0.02, // Annualized inflation assumption (2%)
    policyRate: 0.02, // Annualized policy rate assumption (2%)
    regimeTag: "normal",
  };

  /**
   * Performs a simple linear interpolation between two values.
   *
   * @param {number} from - Starting value.
   * @param {number} to - Ending value.
   * @param {number} t - Interpolation factor between 0 and 1.
   * @returns {number} Interpolated value.
   */
  function lerp(from, to, t) {
    return from + (to - from) * t;
  }

  /**
   * Expands macro phases into a month-by-month snapshot for the given horizon.
   *
   * Assumptions:
   * - Months are zero-based (month 0 = first month of the simulation).
   * - Inflation and policy rates are annualized; interpolation is linear.
   * - Real rate is computed as a simple spread: policyRate - inflation.
   *
   * @param {Array<Object>} macroPhases - List of macro phases with the shape:
   *   { name, startMonth, duration, inflationFrom, inflationTo, rateFrom, rateTo, regimeTag }
   * @param {number} totalMonths - Horizon in months (inclusive of month 0).
   * @returns {Array<Object>} macroByMonth - Array sized totalMonths + 1 with
   *   entries { month, inflation, policyRate, realRate, regimeTag }.
   */
  function buildMacroByMonth(macroPhases = [], totalMonths = 0) {
    const months = Math.max(0, Math.round(totalMonths));
    const macroByMonth = Array.from({ length: months + 1 }, (_, month) => ({
      month,
      inflation: defaultMacroPoint.inflation,
      policyRate: defaultMacroPoint.policyRate,
      realRate: defaultMacroPoint.policyRate - defaultMacroPoint.inflation,
      regimeTag: defaultMacroPoint.regimeTag,
    }));

    macroPhases.forEach(phase => {
      const {
        startMonth = 0,
        duration = 0,
        inflationFrom = defaultMacroPoint.inflation,
        inflationTo = defaultMacroPoint.inflation,
        rateFrom = defaultMacroPoint.policyRate,
        rateTo = defaultMacroPoint.policyRate,
        regimeTag = defaultMacroPoint.regimeTag,
      } = phase || {};

      if (duration <= 0 || startMonth > months) {
        return;
      }

      const endMonth = Math.min(months, startMonth + duration - 1);
      const span = Math.max(1, endMonth - startMonth);

      for (let month = startMonth; month <= endMonth; month++) {
        const progress = (month - startMonth) / span;
        const inflation = lerp(inflationFrom, inflationTo, progress);
        const policyRate = lerp(rateFrom, rateTo, progress);

        macroByMonth[month] = {
          month,
          inflation,
          policyRate,
          realRate: policyRate - inflation,
          regimeTag,
        };
      }
    });

    return macroByMonth;
  }

  /**
   * Logs a preview of the macro scenario to the console for quick inspection.
   *
   * @param {Array<Object>} macroByMonth - Output of buildMacroByMonth.
   * @param {number} monthsToShow - How many initial months to display.
   */
  function logMacroScenarioPreview(macroByMonth, monthsToShow = 12) {
    if (!Array.isArray(macroByMonth)) {
      console.warn("logMacroScenarioPreview expects an array produced by buildMacroByMonth.");
      return;
    }

    const preview = macroByMonth.slice(0, monthsToShow).map(point => ({
      month: point.month,
      inflation: Number(point.inflation).toFixed(4),
      policyRate: Number(point.policyRate).toFixed(4),
      realRate: Number(point.realRate).toFixed(4),
      regimeTag: point.regimeTag,
    }));

    console.table(preview);
  }

  global.buildMacroByMonth = buildMacroByMonth;
  global.logMacroScenarioPreview = logMacroScenarioPreview;
})(window);
