import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadCases } from "./corpus.js";
import { runBenchmark, renderMarkdown, type BenchmarkReport } from "./report.js";
import { checkThresholds, type Thresholds, type Breach } from "./thresholds.js";

export interface BenchmarkRunResult {
  report: BenchmarkReport;
  breaches: Breach[];
  jsonPath: string;
  mdPath: string;
}

/** Write the scorecard artifacts (JSON canonical + markdown human-facing) to `outDir`. */
export function writeReport(report: BenchmarkReport, outDir: string): { jsonPath: string; mdPath: string } {
  mkdirSync(outDir, { recursive: true });
  const jsonPath = join(outDir, "benchmark-report.json");
  const mdPath = join(outDir, "benchmark-report.md");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2) + "\n");
  writeFileSync(mdPath, renderMarkdown(report));
  return { jsonPath, mdPath };
}

/** Load thresholds.json if present; absent → no thresholds (report-only). */
export function loadThresholds(path: string): Thresholds {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8")) as Thresholds;
}

/**
 * Full benchmark run: load corpus, run the real pipeline, write the scorecard, and check thresholds.
 * Does not exit the process — the caller (CLI/CI bin) decides the exit code from `breaches`.
 */
export function runBenchmarkSuite(corpusDir: string, outDir: string, thresholdsPath: string): BenchmarkRunResult {
  const cases = loadCases(corpusDir);
  const report = runBenchmark(cases);
  const { jsonPath, mdPath } = writeReport(report, outDir);
  const breaches = checkThresholds(report, loadThresholds(thresholdsPath));
  return { report, breaches, jsonPath, mdPath };
}
