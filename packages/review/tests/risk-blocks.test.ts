import { describe, it, expect } from "vitest";
import { reviewLocalDiff } from "../src/review.js";
import type { Finding } from "../src/types.js";

const ev = (path: string, line: number, signal: string) => ({
  type: "line" as const,
  path,
  line,
  signal,
  confidence: "high" as const,
});

/** Inject a synthetic changed-files set + gate findings (R8: no full chain run). */
function deps(changed: string[], findings: Finding[]) {
  return {
    changedFiles: () => changed,
    runGates: () => ({ risks: { schema_version: 1, findings } }),
  };
}

describe("a diff-attributable risk finding → Not Ready naming the gate (T012, SC-002)", () => {
  it("verdict not_ready and the report names the failing gate id", () => {
    const findings: Finding[] = [
      { gate_id: "TG-G4", status: "risk", severity: "high", evidence: [ev("apps/api/routes/admin.ts", 12, "admin route without a role guard")] },
    ];
    const report = reviewLocalDiff(
      { out: ".tenantguard" },
      deps(["apps/api/routes/admin.ts"], findings),
    );
    expect(report.verdict).toBe("not_ready");
    expect(report.findings.some((f) => "gate_id" in f && f.gate_id === "TG-G4")).toBe(true);
  });

  it("a risk on an UNCHANGED file does not block (attribution gates the verdict)", () => {
    const findings: Finding[] = [
      { gate_id: "TG-G4", status: "risk", severity: "high", evidence: [ev("apps/api/routes/other.ts", 3, "unrelated")] },
    ];
    const report = reviewLocalDiff(
      { out: ".tenantguard" },
      deps(["apps/api/routes/admin.ts"], findings),
    );
    expect(report.verdict).toBe("ready");
    expect(report.findings).toHaveLength(0);
  });
});
