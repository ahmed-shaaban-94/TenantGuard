import { describe, it, expect } from "vitest";
import { reviewLocalDiff } from "../src/review.js";
import type { Finding } from "../src/types.js";

const ev = (path: string) => ({ type: "file" as const, path, line: null, signal: "unclear", confidence: "low" as const });
const deps = (changed: string[], findings: Finding[]) => ({
  changedFiles: () => changed,
  runGates: () => ({ risks: { schema_version: 1, findings } }),
});

describe("unjudgeable check → Needs Verification, never a false pass (T013, SC-004, FR-007)", () => {
  it("a diff-attributable needs_verification (and no risk) yields needs_verification", () => {
    const findings: Finding[] = [
      { gate_id: "TG-G1", status: "needs_verification", severity: null, evidence: [ev("src/app.ts")] },
    ];
    const report = reviewLocalDiff({}, deps(["src/app.ts"], findings));
    expect(report.verdict).toBe("needs_verification");
  });

  it("never a false 'ready' when a needs_verification touches the diff", () => {
    const findings: Finding[] = [
      { gate_id: "TG-G2", status: "needs_verification", severity: null, evidence: [ev("api/contract.ts")] },
    ];
    const report = reviewLocalDiff({}, deps(["api/contract.ts"], findings));
    expect(report.verdict).not.toBe("ready");
  });
});
