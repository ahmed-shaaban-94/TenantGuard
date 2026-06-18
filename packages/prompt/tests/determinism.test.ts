import { describe, it, expect } from "vitest";
import { compileItem } from "../src/index.js";
import { fullItem } from "./helpers.js";

describe("T020 determinism (SC-008)", () => {
  it("the same (item, agent) compiled twice is byte-identical", () => {
    const item = fullItem();
    for (const agent of ["claude", "codex", "generic"] as const) {
      const a = compileItem(item, agent).markdown;
      const b = compileItem(item, agent).markdown;
      expect(b).toBe(a);
    }
  });
});
