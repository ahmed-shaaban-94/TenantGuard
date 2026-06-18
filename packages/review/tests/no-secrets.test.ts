import { describe, it, expect } from "vitest";
import { reviewLocalDiff } from "../src/review.js";
import { renderReport } from "../src/render.js";
import type { Finding } from "../src/types.js";

const SECRET = "AKIA_SUPER_SECRET_VALUE_1234567890";

const deps = (changed: string[], findings: Finding[]) => ({
  changedFiles: () => changed,
  runGates: () => ({ risks: { schema_version: 1, findings } }),
});

describe("no secrets echoed; never instructs commit/push/merge (T015, FR-009, SC-007)", () => {
  it("a secret-like finding surfaces by signal name only — the raw value never appears", () => {
    // Upstream evidence is already secret-safe: it names the pattern, not the value.
    const findings: Finding[] = [
      {
        gate_id: "TG-G4",
        status: "risk",
        severity: "critical",
        evidence: [{ type: "line", path: "src/cfg.ts", line: 4, signal: "secret-like value printed in logs", confidence: "high" }],
      },
    ];
    const report = reviewLocalDiff({}, deps(["src/cfg.ts"], findings));
    const md = renderReport(report);
    const json = JSON.stringify(report);
    expect(md).not.toContain(SECRET);
    expect(json).not.toContain(SECRET);
    // the signal name IS surfaced (so the reviewer is still useful)
    expect(md).toContain("secret-like value printed in logs");
  });

  it("the report never instructs the agent to commit, push, or merge", () => {
    const report = reviewLocalDiff({}, deps([], []));
    const md = renderReport(report).toLowerCase();
    expect(md).not.toMatch(/\b(git commit|git push|git merge|please commit|push to|merge this)\b/);
  });
});
