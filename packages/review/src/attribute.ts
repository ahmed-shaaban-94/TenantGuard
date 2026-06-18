import type { Finding } from "./types.js";

/** A finding kept by diff-attribution: a `risk` or `needs_verification` 004 finding. */
export type AttributableFinding = Exclude<Finding, { status: "not_applicable" }>;

/** A finding is diff-attributable iff ANY of its evidence paths is among the changed files (R2). */
export function attributable(finding: Finding, changedFiles: readonly string[]): boolean {
  const changed = new Set(changedFiles);
  // Evidence `path` may be null (e.g. missing_artifact) — a null path matches no changed file.
  return finding.evidence.some((e) => e.path != null && changed.has(e.path));
}

/**
 * Keep only the findings that drive the verdict: `not_applicable` never contributes, and a finding
 * must be diff-attributable (its evidence touches a changed file). Order is preserved from the input
 * (which the gate engine already sorts deterministically).
 */
export function diffAttributableFindings(
  findings: readonly Finding[],
  changedFiles: readonly string[],
): AttributableFinding[] {
  return findings.filter(
    (f): f is AttributableFinding => f.status !== "not_applicable" && attributable(f, changedFiles),
  );
}
