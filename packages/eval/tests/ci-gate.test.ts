import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { loadCases } from "../src/corpus.js";
import { runBenchmark } from "../src/report.js";
import { checkThresholds } from "../src/thresholds.js";
import { loadThresholds } from "../src/run.js";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "../../..");
const CORPUS = resolve(REPO_ROOT, "benchmark/cases");
const THRESHOLDS = resolve(REPO_ROOT, "benchmark/thresholds.json");

// This IS the dogfood CI regression gate (P3 Task 5). It runs under `pnpm test`, the path the
// dogfood workflow already invokes — no node-subprocess/TS-runtime needed. If a future detector
// or gate change drops G4 confirmed precision/recall below benchmark/thresholds.json, this fails.
describe("CI regression gate: benchmark meets thresholds", () => {
  it("the real corpus meets every configured threshold (no breaches)", () => {
    const report = runBenchmark(loadCases(CORPUS));
    const breaches = checkThresholds(report, loadThresholds(THRESHOLDS));
    expect(breaches).toEqual([]);
  });
});
