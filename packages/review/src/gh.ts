import { execFileSync } from "node:child_process";

/** Raised when GitHub access (the `gh` CLI / auth) is unavailable — CLI maps to a clear gap (exit 2). */
export class GitHubUnavailableError extends Error {}

/**
 * Read-only: the repo-relative POSIX paths a GitHub PR changes, via the user's existing `gh` CLI
 * (no stored tokens — FR-005). De-duplicated and code-unit sorted for determinism. Throws
 * `GitHubUnavailableError` when `gh` is missing/unauthenticated or the PR is unreachable, so PR mode
 * degrades gracefully without blocking local-diff (FR-006). Never mutates the PR.
 */
export function prChangedFiles(prNumber: number): string[] {
  // `gh pr view <n> --json files` returns { files: [{ path }, ...] } — a read-only query.
  let raw: string;
  try {
    raw = execFileSync("gh", ["pr", "view", String(prNumber), "--json", "files"], {
      encoding: "utf8",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new GitHubUnavailableError(
      `GitHub access unavailable (gh pr view ${prNumber}): ${msg}. ` +
        `Ensure the \`gh\` CLI is installed and authenticated; local-diff review remains available.`,
    );
  }

  let parsed: { files?: { path: string }[] };
  try {
    parsed = JSON.parse(raw) as { files?: { path: string }[] };
  } catch {
    throw new GitHubUnavailableError(`Could not parse \`gh\` output for PR ${prNumber}.`);
  }

  const set = new Set<string>();
  for (const f of parsed.files ?? []) {
    const norm = f.path.trim().split("\\").join("/");
    if (norm) set.add(norm);
  }
  return [...set].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** Read-only: optional PR metadata (title/state/base) for context. Throws on unavailable access. */
export function prMetadata(prNumber: number): { title: string; state: string; baseRefName: string } {
  let raw: string;
  try {
    raw = execFileSync("gh", ["pr", "view", String(prNumber), "--json", "title,state,baseRefName"], {
      encoding: "utf8",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new GitHubUnavailableError(`GitHub access unavailable (gh pr view ${prNumber}): ${msg}.`);
  }
  return JSON.parse(raw) as { title: string; state: string; baseRefName: string };
}
