// Invariant default blocks — the single source of truth. Every renderer references these constants
// (never re-authors them), guaranteeing byte-identical safety across claude/codex/generic (FR-015).

/** Default git rules (always included, verbatim from the spec). */
export const DEFAULT_GIT_RULES: readonly string[] = [
  "Do not commit unless explicitly requested.",
  "Do not push unless explicitly requested.",
  "Do not open a PR unless explicitly requested.",
  "Stage named files only if staging is explicitly requested.",
  "Never use git add -A.",
  "Never use git add .",
  "Do not modify secrets, credentials, environment files, or generated lockfiles unless explicitly allowed.",
];

/** Default stop conditions (always appended to the item's own stop_conditions). */
export const DEFAULT_STOP_CONDITIONS: readonly string[] = [
  "Required files are missing.",
  "Scope requires migration but the task did not allow migrations.",
  "Public API shape must change but the contract update was not in scope.",
  "Auth or tenant model is unclear.",
  "Validation cannot run.",
  "Unrelated test failures appear.",
];

/** Required final-report fields (constitution's required report; fallback when the item omits them). */
export const FINAL_REPORT_FIELDS: readonly string[] = [
  "Files changed",
  "Summary of changes",
  "Tests run and results",
  "Evidence used",
  "Risks or gaps",
  "Git status",
  "Next safe action",
];

/** Constant repo-state-verification instruction (compiler-injected). */
export const REPO_STATE_VERIFICATION =
  "Run `git status` and confirm the working tree matches expectations before making any change. " +
  "Read the files in scope before editing; do not act from assumption.";
