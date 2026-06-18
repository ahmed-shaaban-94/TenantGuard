import { describe, it, expect } from "vitest";
import { reviewLocalDiff } from "../src/review.js";
import { renderReport } from "../src/render.js";
import type { Finding } from "../src/types.js";

const ev = (path: string, signal: string) => ({ type: "line" as const, path, line: 1, signal, confidence: "high" as const });
const deps = (changed: string[], findings: Finding[]) => ({
  changedFiles: () => changed,
  runGates: () => ({ risks: { schema_version: 1, findings } }),
});

describe("same input → byte-identical review.json + markdown (T016, SC-007, FR-010)", () => {
  const findings: Finding[] = [
    { gate_id: "TG-G4", status: "risk", severity: "high", evidence: [ev("src/z.ts", "z")] },
    { gate_id: "TG-G1", status: "risk", severity: "medium", evidence: [ev("src/a.ts", "a")] },
  ];
  const changed = ["src/a.ts", "src/z.ts"];

  it("two identical runs produce identical JSON", () => {
    const a = JSON.stringify(reviewLocalDiff({}, deps(changed, findings)));
    const b = JSON.stringify(reviewLocalDiff({}, deps(changed, findings)));
    expect(a).toBe(b);
  });

  it("two identical runs produce identical markdown", () => {
    const a = renderReport(reviewLocalDiff({}, deps(changed, findings)));
    const b = renderReport(reviewLocalDiff({}, deps(changed, findings)));
    expect(a).toBe(b);
  });

  it("findings are ordered deterministically by code-unit comparison", () => {
    const report = reviewLocalDiff({}, deps(changed, findings));
    // both findings are attributable; report order is stable regardless of input order
    const reversed = reviewLocalDiff({}, deps(changed, [findings[1]!, findings[0]!]));
    expect(JSON.stringify(report.findings)).toBe(JSON.stringify(reversed.findings));
  });
});
