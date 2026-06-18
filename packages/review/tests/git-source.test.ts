import { describe, it, expect } from "vitest";
import { changedFiles } from "../src/git.js";
import { makeDiffRepo } from "./helpers.js";

describe("git changed-files source (T007)", () => {
  it("returns repo-relative POSIX paths for modified tracked files", () => {
    const repo = makeDiffRepo({
      baseline: { "src/a.ts": "export const a = 1;\n", "src/b.ts": "export const b = 1;\n" },
      changes: { "src/a.ts": "export const a = 2;\n" },
    });
    expect(changedFiles(repo)).toEqual(["src/a.ts"]);
  });

  it("includes untracked files", () => {
    const repo = makeDiffRepo({
      baseline: { "keep.ts": "x\n" },
      untracked: { "new/thing.ts": "y\n" },
    });
    expect(changedFiles(repo)).toContain("new/thing.ts");
  });

  it("de-duplicates and sorts by code-unit comparison (deterministic)", () => {
    const repo = makeDiffRepo({
      baseline: { "z.ts": "1\n", "A.ts": "1\n", "m.ts": "1\n" },
      changes: { "z.ts": "2\n", "A.ts": "2\n", "m.ts": "2\n" },
    });
    const out = changedFiles(repo);
    // code-unit order: uppercase 'A' (0x41) sorts before lowercase 'm'/'z'
    expect(out).toEqual(["A.ts", "m.ts", "z.ts"]);
    // no duplicates
    expect(new Set(out).size).toBe(out.length);
  });

  it("returns an empty array for a clean working tree", () => {
    const repo = makeDiffRepo({ baseline: { "only.ts": "1\n" } });
    expect(changedFiles(repo)).toEqual([]);
  });
});
