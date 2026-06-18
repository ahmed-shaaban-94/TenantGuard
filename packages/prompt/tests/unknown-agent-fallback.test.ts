import { describe, it, expect } from "vitest";
import { compileItem, resolveAgent } from "../src/index.js";
import { fullItem } from "./helpers.js";

describe("T019 unknown-agent fallback (FR-010)", () => {
  it("resolveAgent maps an unknown name to generic + unknown flag", () => {
    expect(resolveAgent("gpt-9")).toEqual({ agent: "generic", unknown: true });
    expect(resolveAgent("claude")).toEqual({ agent: "claude", unknown: false });
    expect(resolveAgent(undefined)).toEqual({ agent: "generic", unknown: false });
  });

  it("an unknown agent renders the generic prompt with a note (does not fail)", () => {
    const out = compileItem(fullItem(), "gpt-9");
    expect(out.agent).toBe("generic");
    expect(out.markdown).toMatch(/unknown agent "gpt-9"/);
    // still carries the full safety contract
    expect(out.markdown).toContain("## Git rules");
  });
});
