import { describe, it, expect } from "vitest";
import { reviewLocalDiff } from "../src/review.js";
import type { Finding } from "../src/types.js";

const ev = (path: string) => ({ type: "line" as const, path, line: 1, signal: "x", confidence: "high" as const });
const deps = (changed: string[], findings: Finding[]) => ({
  changedFiles: () => changed,
  runGates: () => ({ risks: { schema_version: 1, findings } }),
});

describe("no --item → scope skipped + noted, gates still run (T025, FR-003)", () => {
  it("scope is { checked: false, violations: [] } with no item_id", () => {
    const report = reviewLocalDiff({}, deps(["src/a.ts"], []));
    expect(report.scope.checked).toBe(false);
    expect(report.scope.violations).toEqual([]);
    expect(report.scope.item_id).toBeUndefined();
  });

  it("gate review still drives the verdict when scope is skipped", () => {
    const findings: Finding[] = [
      { gate_id: "TG-G4", status: "risk", severity: "high", evidence: [ev("src/a.ts")] },
    ];
    const report = reviewLocalDiff({}, deps(["src/a.ts"], findings));
    expect(report.scope.checked).toBe(false);
    expect(report.verdict).toBe("not_ready"); // gates still block even without scope
  });
});
