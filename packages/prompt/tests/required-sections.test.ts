import { describe, it, expect } from "vitest";
import { compileItem } from "../src/index.js";
import { fullItem } from "./helpers.js";

const REQUIRED = [
  "Objective",
  "Repo-state verification",
  "Context",
  "Scope",
  "Allowed files",
  "Forbidden files",
  "Validation commands",
  "Git rules",
  "Stop conditions",
  "Final report format",
];

describe("T008 required sections (SC-001)", () => {
  it("all ten required sections are present, in order, for the generic renderer", () => {
    const md = compileItem(fullItem(), "generic").markdown;
    let lastIdx = -1;
    for (const heading of REQUIRED) {
      const idx = md.indexOf(`## ${heading}`);
      expect(idx, `section "${heading}" present`).toBeGreaterThan(-1);
      expect(idx, `section "${heading}" in order`).toBeGreaterThan(lastIdx);
      lastIdx = idx;
    }
  });
});
