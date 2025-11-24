(function() {
  function getSeedInput() {
    return document.getElementById('simulationSeed');
  }

  function getSeedStatus() {
    return document.getElementById('seedStatus');
  }

  function getMacroToggle() {
    return document.getElementById('macroScenarioToggle');
  }

  function getMacroStatus() {
    return document.getElementById('macroStatus');
  }

  function updateSeedInputValue() {
    const input = getSeedInput();
    if (!input || !window.randomSeedManager) return;
    input.value = window.randomSeedManager.getSeed();
  }

  function updateStatus(message) {
    const status = getSeedStatus();
    if (status) {
      status.textContent = message;
    }
  }

  function updateMacroToggleState() {
    const toggle = getMacroToggle();
    if (!toggle) return;
    const isEnabled = typeof enableMacroScenario !== 'undefined' ? Boolean(enableMacroScenario) : false;
    toggle.checked = isEnabled;
    updateMacroStatus(isEnabled);
  }

  function updateMacroStatus(isEnabled) {
    const status = getMacroStatus();
    if (status) {
      status.textContent = isEnabled
        ? 'Gli scenari macro sono attivi e influenzano le simulazioni.'
        : 'Gli scenari macro sono disattivati.';
    }
  }

  function applySeed(seedValue) {
    if (!window.randomSeedManager) return;
    const normalizedSeed = window.randomSeedManager.setSeed(seedValue);
    updateSeedInputValue();
    updateStatus(`Seed applicato: ${normalizedSeed}`);
    if (typeof randomizePerformance === 'function') {
      randomizePerformance();
    }
  }

  function setupEventHandlers() {
    const applyButton = document.getElementById('applySeedButton');
    const generateButton = document.getElementById('generateSeedButton');
    const modal = document.getElementById('settingsModal');
    const macroToggle = getMacroToggle();

    if (applyButton) {
      applyButton.addEventListener('click', () => {
        const input = getSeedInput();
        applySeed(input?.value ?? '');
      });
    }

    if (generateButton) {
      generateButton.addEventListener('click', () => {
        if (!window.randomSeedManager) return;
        const newSeed = window.randomSeedManager.regenerateSeed();
        updateSeedInputValue();
        updateStatus(`Nuovo seed generato: ${newSeed}`);
        if (typeof randomizePerformance === 'function') {
          randomizePerformance();
        }
      });
    }

    if (macroToggle) {
      macroToggle.addEventListener('change', () => {
        if (typeof toggleMacroScenario === 'function') {
          toggleMacroScenario(macroToggle.checked);
        }
        updateMacroStatus(macroToggle.checked);
      });
    }

    if (modal) {
      const handleShow = () => {
        updateSeedInputValue();
        updateStatus('');
        updateMacroToggleState();
      };

      if (window.jQuery && typeof window.jQuery(modal).on === 'function') {
        window.jQuery(modal).on('show.bs.modal', handleShow);
      } else {
        modal.addEventListener('show.bs.modal', handleShow);
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    updateSeedInputValue();
    setupEventHandlers();
  });
})();
