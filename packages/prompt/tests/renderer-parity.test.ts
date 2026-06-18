import { describe, it, expect } from "vitest";
import { compileItem, DEFAULT_GIT_RULES, DEFAULT_STOP_CONDITIONS } from "../src/index.js";
import { fullItem } from "./helpers.js";

const AGENTS = ["claude", "codex", "generic"] as const;

/** Extract the bullet lines under a `## <heading>` section. */
function sectionBullets(md: string, heading: string): string[] {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return [];
  const rest = md.slice(start + `## ${heading}`.length);
  const end = rest.indexOf("\n## ");
  const body = end === -1 ? rest : rest.slice(0, end);
  return body.split(/\r?\n/).filter((l) => l.startsWith("- "));
}

describe("T018 renderer parity (SC-005)", () => {
  it("all three renderers carry every required section", () => {
    const item = fullItem();
    for (const agent of AGENTS) {
      const md = compileItem(item, agent).markdown;
      for (const h of ["Objective", "Git rules", "Stop conditions", "Final report format", "Allowed files"]) {
        expect(md, `${agent} has ${h}`).toContain(`## ${h}`);
      }
    }
  });

  it("git rules + stop conditions are byte-identical across renderers", () => {
    const item = fullItem();
    const gitByAgent = AGENTS.map((a) => sectionBullets(compileItem(item, a).markdown, "Git rules"));
    const stopByAgent = AGENTS.map((a) => sectionBullets(compileItem(item, a).markdown, "Stop conditions"));

    // All renderers produce the same git-rule bullets, equal to the defaults.
    for (const g of gitByAgent) expect(g).toEqual(DEFAULT_GIT_RULES.map((r) => `- ${r}`));
    expect(gitByAgent[0]).toEqual(gitByAgent[1]);
    expect(gitByAgent[1]).toEqual(gitByAgent[2]);

    for (const s of stopByAgent) {
      for (const sc of DEFAULT_STOP_CONDITIONS) expect(s).toContain(`- ${sc}`);
    }
    expect(stopByAgent[0]).toEqual(stopByAgent[1]);
    expect(stopByAgent[1]).toEqual(stopByAgent[2]);
  });
});
