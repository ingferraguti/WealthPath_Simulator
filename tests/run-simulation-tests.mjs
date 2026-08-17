import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const storedValues = new Map();
const context = {
  console,
  localStorage: {
    getItem(key) { return storedValues.has(key) ? storedValues.get(key) : null; },
    setItem(key, value) { storedValues.set(key, String(value)); },
    removeItem(key) { storedValues.delete(key); },
    clear() { storedValues.clear(); }
  }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

const scripts = [
  "src/assets/js/random-seed.js",
  "src/assets/js/config/labels.js",
  "src/assets/js/config/marketData.js",
  "src/assets/js/validation.js",
  "src/assets/js/macro_scenario.js",
  "src/assets/js/portfolio_statistics.js",
  "src/assets/js/portafoglio.js",
  "src/assets/js/montecarlo_gbm.js",
  "src/assets/js/settings.js",
  "src/assets/js/simulation_tests.js"
];

for (const relativePath of scripts) {
  const absolutePath = path.join(repositoryRoot, relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  vm.runInContext(source, context, { filename: relativePath });
}

const results = context.runSimulationTests();
for (const result of results) console.log(`PASS ${result.name}`);
console.log(`\n${results.length} test superati.`);
