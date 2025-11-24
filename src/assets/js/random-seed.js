(function() {
  /**
   * Generatore PRNG semplice (mulberry32) per ottenere casualità riproducibile.
   * Il seed viene inizializzato in modo casuale, ma può essere letto o impostato
   * dall'utente per ricreare lo stesso scenario di simulazione.
   */
  function createGenerator(seed) {
    let state = seed >>> 0;
    return function() {
      state += 0x6D2B79F5;
      let t = Math.imul(state ^ (state >>> 15), state | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function normalizeSeed(rawSeed) {
    const parsed = Number.parseInt(rawSeed, 10);
    if (Number.isNaN(parsed)) {
      return generateRandomSeed();
    }
    return parsed >>> 0;
  }

  function generateRandomSeed() {
    return Math.floor(Math.random() * 1_000_000_000);
  }

  let currentSeed = generateRandomSeed();
  let generator = createGenerator(currentSeed);

  const manager = {
    random() {
      return generator();
    },
    getSeed() {
      return currentSeed;
    },
    setSeed(newSeed) {
      currentSeed = normalizeSeed(newSeed);
      generator = createGenerator(currentSeed);
      return currentSeed;
    },
    regenerateSeed() {
      const freshSeed = generateRandomSeed();
      return this.setSeed(freshSeed);
    }
  };

  window.randomSeedManager = manager;
})();
