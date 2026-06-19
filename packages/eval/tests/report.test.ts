import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { runBenchmark, renderMarkdown, BENCHMARK_REPORT_VERSION } from "../src/report.js";
import { loadCases } from "../src/corpus.js";
import type { BenchmarkCase } from "../src/types.js";

const here = dirname(fileURLToPath(import.meta.url));
const CORPUS = resolve(here, "../../../benchmark/cases");

const mkCase = (name: string, gates: string[], expected: BenchmarkCase["expected_findings"]): BenchmarkCase => ({
  name,
  dir: "/x",
  description: "",
  gates_under_test: gates,
  expected_findings: expected,
});

describe("runBenchmark (stubbed runner — aggregation arithmetic)", () => {
  it("a perfect corpus yields precision/recall 1.0 at the tested tier", () => {
    const cases = [
      mkCase("hit", ["TG-G4"], [{ gate_id: "TG-G4", path: "a.ts", tier: "confirmed" }]),
      mkCase("clean", ["TG-G4"], []),
    ];
    const stub = (c: BenchmarkCase) =>
      c.name === "hit" ? [{ gate_id: "TG-G4", path: "a.ts", tier: "confirmed" as const }] : [];
    const report = runBenchmark(cases, stub);
    expect(report.schema_version).toBe(BENCHMARK_REPORT_VERSION);
    expect(report.per_gate["TG-G4"]!.byTier.confirmed.precision).toBe(1);
    expect(report.per_gate["TG-G4"]!.byTier.confirmed.recall).toBe(1);
    expect(report.overall.tp).toBe(1);
    expect(report.overall.fp).toBe(0);
  });

  it("a false positive on the clean case lowers precision below 1.0", () => {
    const cases = [mkCase("clean", ["TG-G4"], [])];
    const stub = () => [{ gate_id: "TG-G4", path: "x.ts", tier: "confirmed" as const }];
    const report = runBenchmark(cases, stub);
    expect(report.per_gate["TG-G4"]!.byTier.confirmed.precision).toBe(0); // 0 TP / 1 FP
  });

  it("is deterministic: two runs produce deep-equal reports", () => {
    const cases = [mkCase("hit", ["TG-G4"], [{ gate_id: "TG-G4", path: "a.ts", tier: "confirmed" }])];
    const stub = () => [{ gate_id: "TG-G4", path: "a.ts", tier: "confirmed" as const }];
    expect(runBenchmark(cases, stub)).toEqual(runBenchmark(cases, stub));
  });
});

describe("runBenchmark (real pipeline, seed corpus)", () => {
  it("the seed corpus scores G4 confirmed precision = 1.0 and recall = 1.0", () => {
    const report = runBenchmark(loadCases(CORPUS));
    const g4 = report.per_gate["TG-G4"]!.byTier.confirmed;
    expect(g4.recall).toBe(1);
    expect(g4.precision).toBe(1);
    // markdown renders without throwing and names the gate
    expect(renderMarkdown(report)).toContain("TG-G4");
  });
});
