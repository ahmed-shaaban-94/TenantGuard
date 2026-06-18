import { runGates as realRunGates } from "@tenantguard/gates";
import type { RunGatesResult } from "@tenantguard/gates";
import { prChangedFiles as realPrChangedFiles } from "./gh.js";
import { diffAttributableFindings } from "./attribute.js";
import { checkScope, SCOPE_SKIPPED } from "./scope.js";
import { loadQueueItem } from "./io.js";
import { assemble } from "./review.js";
import type { ReviewReport, ReviewOptions, ScopeResult } from "./types.js";

/**
 * Injectable dependencies for PR review (default-real). The PR path differs from local-diff ONLY in
 * the changed-files source (gh vs git); the attribute→scope→verdict core is shared via `assemble`.
 */
export interface PrReviewDeps {
  prChangedFiles?: (prNumber: number) => string[];
  runGates?: (repoRoot: string, opts: { out: string }) => RunGatesResult;
  /** Repo root the gates run over (the checked-out PR / current repo). */
  repoRoot?: string;
}

const DEFAULT_OUT = ".tenantguard";

/**
 * Review a GitHub PR by number (FR-005). Reuses the local-diff core over the PR's changed-files set.
 * Propagates `GitHubUnavailableError` from the gh source so the caller can report the gap and keep
 * local-diff available (FR-006). Read-only.
 */
export function reviewPr(prNumber: number, opts: ReviewOptions = {}, deps: PrReviewDeps = {}): ReviewReport {
  const out = opts.out ?? DEFAULT_OUT;
  const repoRoot = deps.repoRoot ?? ".";
  const getChanged = deps.prChangedFiles ?? realPrChangedFiles;
  const getGates = deps.runGates ?? ((root: string, o: { out: string }) => realRunGates(root, o));

  const changed = getChanged(prNumber); // may throw GitHubUnavailableError (propagated)
  const { risks } = getGates(repoRoot, { out });
  const attributable = diffAttributableFindings(risks.findings, changed);

  const scope: ScopeResult = opts.item
    ? checkScope(changed, loadQueueItem(out, opts.item))
    : SCOPE_SKIPPED;

  return assemble("pr", changed, attributable, scope, true);
}
