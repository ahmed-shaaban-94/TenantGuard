import { describe, it, expect } from "vitest";
import { compileItem, isCompilable } from "../src/index.js";
import { fullItem } from "./helpers.js";

describe("forbidden_files:[] still compiles (real-005-item regression)", () => {
  it("an item with empty forbidden_files is compilable (NOT refused)", () => {
    // The 005 deriver emits forbidden_files: []. A 'both non-empty' scope check would wrongly
    // refuse every real item — this guards against that regression.
    const item = fullItem({ forbidden_files: [] });
    expect(isCompilable(item)).toBe(true);
    expect(() => compileItem(item, "generic")).not.toThrow();
  });
});
