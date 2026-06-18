import { describe, it, expect } from "vitest";
import { compileItem, checkScope, ScopeIncompleteError } from "../src/index.js";
import { fullItem } from "./helpers.js";

describe("T012 missing-scope refusal (SC-006, FR-009)", () => {
  it("refuses an item with empty validation, naming the missing field", () => {
    const item = fullItem({ validation: [] });
    expect(() => compileItem(item, "generic")).toThrow(ScopeIncompleteError);
    expect(checkScope(item).missing).toContain("validation");
  });

  it("refuses an item with empty allowed_files", () => {
    const item = fullItem({ allowed_files: [] });
    expect(() => compileItem(item, "generic")).toThrow(/allowed_files/);
  });

  it("refuses an item with a blank title", () => {
    const item = fullItem({ title: "   " });
    expect(() => compileItem(item, "generic")).toThrow(/title/);
  });

  it("lists all missing fields together", () => {
    const item = fullItem({ title: "", allowed_files: [], validation: [] });
    expect(checkScope(item).missing.sort()).toEqual(["allowed_files", "title", "validation"]);
  });
});
