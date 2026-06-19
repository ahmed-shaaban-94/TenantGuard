import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import type { BenchmarkCase, ExpectedFile } from "./types.js";

export class CorpusError extends Error {}

/**
 * Load all benchmark cases under `corpusDir`. Each case is a sub-directory containing `expected.json`
 * (the gate-scoped ground truth) and a `repo/` sub-dir (the synthetic source the pipeline scans).
 * Cases are returned sorted by name (determinism). Throws CorpusError on a malformed case.
 */
export function loadCases(corpusDir: string): BenchmarkCase[] {
  if (!existsSync(corpusDir)) {
    throw new CorpusError(`corpus dir not found: ${corpusDir}`);
  }
  const names = readdirSync(corpusDir)
    .filter((n) => statSync(join(corpusDir, n)).isDirectory())
    .sort();

  return names.map((name) => {
    const caseDir = join(corpusDir, name);
    const expectedPath = join(caseDir, "expected.json");
    const repoDir = join(caseDir, "repo");
    if (!existsSync(expectedPath)) {
      throw new CorpusError(`case "${name}": missing expected.json`);
    }
    if (!existsSync(repoDir)) {
      throw new CorpusError(`case "${name}": missing repo/ directory`);
    }
    const parsed = JSON.parse(readFileSync(expectedPath, "utf8")) as ExpectedFile;
    if (!Array.isArray(parsed.gates_under_test) || parsed.gates_under_test.length === 0) {
      throw new CorpusError(`case "${name}": expected.json must declare a non-empty gates_under_test[]`);
    }
    if (!Array.isArray(parsed.expected_findings)) {
      throw new CorpusError(`case "${name}": expected.json must declare expected_findings[] (use [] for a clean case)`);
    }
    return {
      name,
      dir: repoDir,
      description: parsed.description ?? "",
      gates_under_test: parsed.gates_under_test,
      expected_findings: parsed.expected_findings,
    };
  });
}
