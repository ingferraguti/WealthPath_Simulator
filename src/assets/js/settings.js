(function (global) {
  const STORAGE_KEY = "wealthPathSimulator.settings.v1";
  function defaultSettings() {
    const md = global.marketData;
    return global.WealthPathValidation.sanitizeSettings({ ...md.defaults, allocation: { ...md.allocation } });
  }
  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultSettings();
      const parsed = JSON.parse(raw);
      const sanitized = global.WealthPathValidation.sanitizeSettings(parsed);
      const validation = global.WealthPathValidation.validateSettings(sanitized);
      return validation.valid ? sanitized : defaultSettings();
    } catch (error) { return defaultSettings(); }
  }
  function saveSettings(settings) {
    const sanitized = global.WealthPathValidation.sanitizeSettings(settings);
    const validation = global.WealthPathValidation.validateSettings(sanitized);
    if (!validation.valid) return { success: false, errors: validation.errors };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    return { success: true, settings: sanitized };
  }
  function exportSettings(settings) {
    return JSON.stringify(global.WealthPathValidation.sanitizeSettings(settings), null, 2);
  }
  function importSettings(jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      const sanitized = global.WealthPathValidation.sanitizeSettings(parsed);
      const validation = global.WealthPathValidation.validateSettings(sanitized);
      if (!validation.valid) return { success: false, errors: validation.errors };
      saveSettings(sanitized);
      return { success: true, settings: sanitized };
    } catch (error) {
      return { success: false, errors: ["Il file JSON non è valido."] };
    }
  }
  function downloadConfig(settings) {
    const blob = new Blob([exportSettings(settings)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "wealthpath-simulator-config.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }
  global.WealthPathSettings = { STORAGE_KEY, defaultSettings, loadSettings, saveSettings, exportSettings, importSettings, downloadConfig };
})(window);
