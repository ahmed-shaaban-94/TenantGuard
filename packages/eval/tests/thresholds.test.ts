import { describe, it, expect } from "vitest";
import { checkThresholds, type Thresholds } from "../src/thresholds.js";
import type { BenchmarkReport } from "../src/report.js";

function reportWith(precision: number | null, recall: number | null): BenchmarkReport {
  const tier = { tp: 1, fp: 0, fn: 0, precision, recall };
  return {
    schema_version: 1,
    per_gate: {
      "TG-G4": {
        byTier: { confirmed: tier, suspected: { tp: 0, fp: 0, fn: 0, precision: null, recall: null } },
        overall: tier,
      },
    },
    overall: tier,
    cases: [],
  };
}

const floor: Thresholds = { "TG-G4": { confirmed: { min_precision: 0.9, min_recall: 0.85 } } };

describe("checkThresholds", () => {
  it("no breach when metrics meet the floor", () => {
    expect(checkThresholds(reportWith(0.97, 0.92), floor)).toEqual([]);
  });

  it("breaches when recall is below the floor", () => {
    const breaches = checkThresholds(reportWith(0.97, 0.5), floor);
    expect(breaches).toHaveLength(1);
    expect(breaches[0]).toMatchObject({ gate: "TG-G4", tier: "confirmed", metric: "recall", floor: 0.85, actual: 0.5 });
  });

  it("a null metric (no data) does not breach — report-only, not a false failure", () => {
    expect(checkThresholds(reportWith(null, null), floor)).toEqual([]);
  });

  it("no thresholds → never breaches", () => {
    expect(checkThresholds(reportWith(0.1, 0.1), {})).toEqual([]);
  });

  it("a gate with no data this run is skipped (report-only)", () => {
    const empty: BenchmarkReport = { schema_version: 1, per_gate: {}, overall: { tp: 0, fp: 0, fn: 0, precision: null, recall: null }, cases: [] };
    expect(checkThresholds(empty, floor)).toEqual([]);
  });
});
