import { describe, it, expect } from "vitest";
import { decideVerdict } from "../src/verdict.js";
import type { AttributableFinding } from "../src/attribute.js";
import type { ScopeResult } from "../src/types.js";

const ev = (path: string) => ({ type: "file" as const, path, line: null, signal: "x", confidence: "high" as const });
const risk = (p: string): AttributableFinding => ({ gate_id: "TG-G4", status: "risk", severity: "high", evidence: [ev(p)] });
const nv = (p: string): AttributableFinding => ({ gate_id: "TG-G1", status: "needs_verification", severity: null, evidence: [ev(p)] });
const noScope: ScopeResult = { checked: false, violations: [] };

describe("verdict is exactly one of the three values (T011, SC-001)", () => {
  it("ready when no risk, no scope violation, no needs_verification", () => {
    expect(decideVerdict([], noScope)).toBe("ready");
  });

  it("not_ready when a risk finding is present", () => {
    expect(decideVerdict([risk("a.ts")], noScope)).toBe("not_ready");
  });

  it("not_ready when a scope violation is present (even with no findings)", () => {
    const scope: ScopeResult = { checked: true, item_id: "Q-001", violations: [{ file: "x.ts", reason: "forbidden" }] };
    expect(decideVerdict([], scope)).toBe("not_ready");
  });

  it("needs_verification when only needs_verification findings (no risk/scope)", () => {
    expect(decideVerdict([nv("a.ts")], noScope)).toBe("needs_verification");
  });

  it("risk dominates needs_verification", () => {
    expect(decideVerdict([nv("a.ts"), risk("b.ts")], noScope)).toBe("not_ready");
  });

  it("always returns one of the three allowed values", () => {
    const allowed = new Set(["ready", "not_ready", "needs_verification"]);
    for (const f of [[], [risk("a.ts")], [nv("a.ts")]]) {
      expect(allowed.has(decideVerdict(f as AttributableFinding[], noScope))).toBe(true);
    }
  });
});
