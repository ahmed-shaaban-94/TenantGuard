import { describe, it, expect } from "vitest";
import { scoreCase, precisionRecall, addCounts } from "../src/metrics.js";
import type { ActualFinding, ExpectedFinding } from "../src/types.js";

const ef = (gate: string, path: string, tier: "confirmed" | "suspected"): ExpectedFinding => ({ gate_id: gate, path, tier });
const af = (gate: string, path: string, tier: "confirmed" | "suspected"): ActualFinding => ({ gate_id: gate, path, tier });

describe("scoreCase", () => {
  it("a perfect match → 1 TP, 0 FP, 0 FN", () => {
    const s = scoreCase([ef("TG-G4", "a.ts", "confirmed")], [af("TG-G4", "a.ts", "confirmed")]);
    expect(s).toMatchObject({ tp: 1, fp: 0, fn: 0 });
    expect(s.byTier.confirmed).toEqual({ tp: 1, fp: 0, fn: 0 });
  });

  it("expected-but-missing → FN; actual-but-unexpected → FP", () => {
    const s = scoreCase([ef("TG-G4", "a.ts", "confirmed")], [af("TG-G4", "b.ts", "confirmed")]);
    expect(s).toMatchObject({ tp: 0, fp: 1, fn: 1 });
  });

  it("a clean case (no expected) with no actual → all zero (true negative, no FP)", () => {
    expect(scoreCase([], [])).toMatchObject({ tp: 0, fp: 0, fn: 0 });
  });

  it("duplicate actual keys are deduped (no double count)", () => {
    const s = scoreCase(
      [ef("TG-G4", "a.ts", "confirmed")],
      [af("TG-G4", "a.ts", "confirmed"), af("TG-G4", "a.ts", "confirmed")],
    );
    expect(s).toMatchObject({ tp: 1, fp: 0, fn: 0 });
  });

  it("tier is tracked separately (a confirmed expectation met by a suspected actual is FN+FP, not TP)", () => {
    const s = scoreCase([ef("TG-G4", "a.ts", "confirmed")], [af("TG-G4", "a.ts", "suspected")]);
    expect(s.tp).toBe(0);
    expect(s.byTier.confirmed.fn).toBe(1);
    expect(s.byTier.suspected.fp).toBe(1);
  });
});

describe("precisionRecall", () => {
  it("computes precision and recall", () => {
    expect(precisionRecall({ tp: 9, fp: 1, fn: 1 })).toEqual({ precision: 0.9, recall: 0.9 });
  });
  it("no predictions → precision null; no positives → recall null (never NaN)", () => {
    expect(precisionRecall({ tp: 0, fp: 0, fn: 0 })).toEqual({ precision: null, recall: null });
    expect(precisionRecall({ tp: 0, fp: 0, fn: 3 })).toEqual({ precision: null, recall: 0 });
  });
});

describe("addCounts", () => {
  it("sums counts", () => {
    expect(addCounts({ tp: 1, fp: 2, fn: 3 }, { tp: 4, fp: 5, fn: 6 })).toEqual({ tp: 5, fp: 7, fn: 9 });
  });
});
