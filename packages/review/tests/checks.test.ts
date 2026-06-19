import { describe, it, expect } from "vitest";
import { renderChecksPayload } from "../src/checks.js";
import type { ReviewReport, ReviewFinding } from "../src/types.js";

const ev = (path: string, line: number | null, signal: string, confidence: "high" | "medium" | "low") => ({
  type: "line" as const,
  path,
  line,
  signal,
  confidence,
});
const gate = (evidence: ReturnType<typeof ev>[], status: "risk" | "needs_verification" = "risk"): ReviewFinding =>
  ({ gate_id: "TG-G4", status, severity: status === "risk" ? "high" : null, evidence }) as ReviewFinding;
const scope = (): ReviewFinding =>
  ({ kind: "scope", file: "secret.ts", reason: "forbidden", item_id: "Q-001" }) as ReviewFinding;

function report(verdict: ReviewReport["verdict"], findings: ReviewFinding[]): ReviewReport {
  return {
    schema_version: 1,
    mode: "pr",
    verdict,
    changed_files: ["a.ts"],
    findings,
    scope: { checked: false, violations: [] },
    github_available: true,
  };
}

describe("renderChecksPayload", () => {
  it("a confirmed risk → failure annotation + conclusion failure", () => {
    const p = renderChecksPayload(report("not_ready", [gate([ev("a.ts", 42, "route without auth guard", "high")])]));
    expect(p.conclusion).toBe("failure");
    expect(p.annotations).toHaveLength(1);
    expect(p.annotations[0]).toMatchObject({ path: "a.ts", start_line: 42, end_line: 42, annotation_level: "failure" });
  });

  it("a suspected risk → warning annotation, conclusion not failure", () => {
    const p = renderChecksPayload(report("needs_verification", [gate([ev("a.ts", 5, "maybe middleware", "medium")])]));
    expect(p.annotations[0]?.annotation_level).toBe("warning");
    expect(p.conclusion).not.toBe("failure");
  });

  it("a needs_verification finding → notice annotation", () => {
    const p = renderChecksPayload(report("needs_verification", [gate([ev("a.ts", 5, "unverifiable", "low")], "needs_verification")]));
    expect(p.annotations[0]?.annotation_level).toBe("notice");
  });

  it("a clean report → success, no annotations", () => {
    const p = renderChecksPayload(report("ready", []));
    expect(p.conclusion).toBe("success");
    expect(p.annotations).toEqual([]);
  });

  it("a scope-only report → failure with a file-keyed annotation (no crash on the scope union arm)", () => {
    const p = renderChecksPayload(report("not_ready", [scope()]));
    expect(p.conclusion).toBe("failure");
    expect(p.annotations[0]).toMatchObject({ path: "secret.ts", start_line: 1, annotation_level: "failure" });
  });

  it("file-level evidence (null line) → start_line 1", () => {
    const p = renderChecksPayload(report("not_ready", [gate([ev("a.ts", null, "file-level", "high")])]));
    expect(p.annotations[0]?.start_line).toBe(1);
  });

  it("never leaks a secret value into the annotation message", () => {
    const p = renderChecksPayload(report("not_ready", [gate([ev("a.ts", 3, "secret-like value printed in logs", "high")])]));
    expect(JSON.stringify(p.annotations)).not.toMatch(/AKIA|password\s*=/i);
  });

  it("is deterministic and sorted by path", () => {
    const r = report("not_ready", [gate([ev("b.ts", 2, "x", "high")]), gate([ev("a.ts", 1, "y", "high")])]);
    expect(renderChecksPayload(r)).toEqual(renderChecksPayload(r));
    expect(renderChecksPayload(r).annotations.map((a) => a.path)).toEqual(["a.ts", "b.ts"]);
  });

  it("caps at 50 annotations per payload and states the overflow (never silent)", () => {
    const findings: ReviewFinding[] = Array.from({ length: 60 }, (_, i) =>
      gate([ev(`file${String(i).padStart(3, "0")}.ts`, 1, "route without auth guard", "high")]),
    );
    const p = renderChecksPayload(report("not_ready", findings));
    expect(p.annotations).toHaveLength(50);
    expect(p.summary).toContain("+10 more");
  });
});
