import { describe, it, expect } from "vitest";
import { compileItem } from "../src/index.js";
import { fullItem } from "./helpers.js";

describe("T011 no secrets, no commit/push/merge (SC-004)", () => {
  it("never instructs the agent to commit/push/merge (the git rules forbid them)", () => {
    const md = compileItem(fullItem(), "generic").markdown.toLowerCase();
    // The prompt must not contain an imperative to commit/push/merge. It DOES contain the
    // "do not commit/push" rules, so check there is no affirmative instruction.
    expect(md).not.toMatch(/\bplease (commit|push|merge)\b/);
    expect(md).toContain("do not commit unless explicitly requested.");
    expect(md).toContain("do not push unless explicitly requested.");
  });

  it("renders only the evidence signal name, not a raw secret value", () => {
    const item = fullItem({
      source: {
        evidence: [
          { type: "line", path: "src/log.ts", line: 3, signal: "secret-like value printed in logs", confidence: "high" },
        ],
      },
    });
    const md = compileItem(item, "generic").markdown;
    expect(md).toContain("secret-like value printed in logs");
    expect(md).not.toMatch(/AKIA[0-9A-Z]{16}/);
    expect(md).not.toMatch(/password\s*=/i);
  });
});
