import { describe, it, expect } from "vitest";
import { compileItem } from "../src/index.js";
import { fullItem } from "./helpers.js";

describe("T009 explicit allowed/forbidden files (SC-002)", () => {
  it("names allowed files explicitly", () => {
    const md = compileItem(fullItem({ allowed_files: ["src/a.ts", "src/b.ts"] }), "generic").markdown;
    expect(md).toContain("- src/a.ts");
    expect(md).toContain("- src/b.ts");
  });

  it("renders an empty forbidden_files as an explicit '(none …)' note", () => {
    const md = compileItem(fullItem({ forbidden_files: [] }), "generic").markdown;
    expect(md).toMatch(/Forbidden files[\s\S]*none beyond the default git rules/);
  });

  it("names forbidden files explicitly when present", () => {
    const md = compileItem(fullItem({ forbidden_files: ["src/secret.ts"] }), "generic").markdown;
    expect(md).toContain("- src/secret.ts");
  });
});
