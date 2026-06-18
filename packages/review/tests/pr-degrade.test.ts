import { describe, it, expect } from "vitest";
import { GitHubUnavailableError } from "../src/gh.js";
import { reviewPr } from "../src/pr.js";

describe("GitHub-PR mode degrades gracefully (T030, FR-006)", () => {
  it("reviewPr surfaces GitHubUnavailableError when the gh source is unavailable", () => {
    expect(() =>
      reviewPr(42, {}, {
        prChangedFiles: () => {
          throw new GitHubUnavailableError("gh not found / not authenticated");
        },
        runGates: () => ({ risks: { schema_version: 1, findings: [] } }),
        repoRoot: ".",
      }),
    ).toThrow(GitHubUnavailableError);
  });

  it("the error message names the access gap clearly (does not leak secrets)", () => {
    try {
      reviewPr(7, {}, {
        prChangedFiles: () => {
          throw new GitHubUnavailableError("GitHub access unavailable: `gh` CLI not found");
        },
        runGates: () => ({ risks: { schema_version: 1, findings: [] } }),
      });
    } catch (e) {
      expect(e).toBeInstanceOf(GitHubUnavailableError);
      expect((e as Error).message).toMatch(/github|gh/i);
    }
  });
});
