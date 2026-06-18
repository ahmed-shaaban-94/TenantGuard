import { describe, it, expect } from "vitest";
import { attributable, diffAttributableFindings } from "../src/attribute.js";
import type { Finding } from "../src/types.js";

const ev = (path: string) => ({
  type: "file" as const,
  path,
  line: null,
  signal: "x",
  confidence: "high" as const,
});

const riskOn = (path: string): Finding => ({
  gate_id: "TG-G4",
  status: "risk",
  severity: "high",
  evidence: [ev(path)],
});

describe("finding attribution by evidence path (T009)", () => {
  it("keeps a finding whose evidence.path is in the changed-files set", () => {
    expect(attributable(riskOn("src/a.ts"), ["src/a.ts"])).toBe(true);
  });

  it("drops a finding touching only unchanged files", () => {
    expect(attributable(riskOn("src/other.ts"), ["src/a.ts"])).toBe(false);
  });

  it("filters a finding list to only diff-attributable risk/needs_verification", () => {
    const findings: Finding[] = [
      riskOn("src/changed.ts"),
      riskOn("src/unchanged.ts"),
      { gate_id: "TG-G1", status: "needs_verification", severity: null, evidence: [ev("src/changed.ts")] },
      { gate_id: "TG-G2", status: "not_applicable", severity: null, evidence: [ev("src/changed.ts")] },
    ];
    const kept = diffAttributableFindings(findings, ["src/changed.ts"]);
    // changed risk + changed needs_verification kept; unchanged risk + not_applicable dropped
    expect(kept.map((f) => f.gate_id)).toEqual(["TG-G4", "TG-G1"]);
    // not_applicable is filtered out — the kept statuses are only risk / needs_verification
    expect(kept.map((f) => f.status)).toEqual(["risk", "needs_verification"]);
  });

  it("treats a finding as attributable if ANY of its evidence paths changed", () => {
    const f: Finding = {
      gate_id: "TG-G3",
      status: "risk",
      severity: "critical",
      evidence: [ev("untouched.ts"), ev("touched.ts")],
    };
    expect(attributable(f, ["touched.ts"])).toBe(true);
  });
});
