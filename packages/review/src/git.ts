import { execFileSync } from "node:child_process";

/** Raised when `git` cannot run or the target is not a usable Git repo. */
export class GitUnavailableError extends Error {}

/**
 * Read-only: the set of repo-relative POSIX paths the working tree changes from `base` (default
 * `HEAD`). Combines tracked changes (`git diff --name-only`, working + staged) with untracked files
 * (`git ls-files --others --exclude-standard`). De-duplicated and sorted by code-unit comparison so
 * the result is deterministic across platforms (the 004 ordering lesson). Never mutates the repo.
 */
export function changedFiles(repoRoot: string, base = "HEAD"): string[] {
  const tracked = gitLines(repoRoot, ["diff", "--name-only", base]);
  const staged = gitLines(repoRoot, ["diff", "--name-only", "--cached", base]);
  const untracked = gitLines(repoRoot, ["ls-files", "--others", "--exclude-standard"]);

  const set = new Set<string>();
  for (const line of [...tracked, ...staged, ...untracked]) {
    const norm = line.trim().split("\\").join("/");
    if (norm) set.add(norm);
  }
  // Code-unit comparison (not localeCompare) for a single, platform-stable canonical order.
  return [...set].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** Run a read-only git command and return its non-empty output lines. */
function gitLines(repoRoot: string, args: string[]): string[] {
  let out: string;
  try {
    out = execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new GitUnavailableError(`git ${args.join(" ")} failed in ${repoRoot}: ${msg}`);
  }
  return out.split("\n").filter((l) => l.length > 0);
}
