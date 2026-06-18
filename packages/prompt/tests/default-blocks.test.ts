import { describe, it, expect } from "vitest";
import { compileItem, DEFAULT_GIT_RULES, DEFAULT_STOP_CONDITIONS } from "../src/index.js";
import { fullItem } from "./helpers.js";

describe("T010 default git rules + stop conditions (SC-003)", () => {
  it("includes every default git rule verbatim", () => {
    const md = compileItem(fullItem(), "generic").markdown;
    for (const rule of DEFAULT_GIT_RULES) expect(md).toContain(rule);
    expect(md).toContain("Never use git add -A.");
  });

  it("includes every default stop condition plus the item's own", () => {
    const md = compileItem(fullItem({ stop_conditions: ["custom stop"] }), "generic").markdown;
    for (const sc of DEFAULT_STOP_CONDITIONS) expect(md).toContain(sc);
    expect(md).toContain("custom stop");
  });
});
