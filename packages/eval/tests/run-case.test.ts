import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { loadCases } from "../src/corpus.js";
import { runCase } from "../src/run-case.js";

const here = dirname(fileURLToPath(import.meta.url));
const CORPUS = resolve(here, "../../../benchmark/cases");

describe("runCase (real scan → gates pipeline, gate-scoped)", () => {
  it("the unprotected-admin-route case yields exactly one confirmed G4 finding", () => {
    const cases = loadCases(CORPUS);
    const admin = cases.find((c) => c.name === "unprotected-admin-route")!;
    const actual = runCase(admin);
    expect(actual).toEqual([
      { gate_id: "TG-G4", path: "apps/api/admin.ts", tier: "confirmed" },
    ]);
  });

  it("the clean-guarded case yields no G4 findings (baseline noise is excluded)", () => {
    const cases = loadCases(CORPUS);
    const clean = cases.find((c) => c.name === "clean-guarded")!;
    const actual = runCase(clean);
    // Even though the full gate set fires baseline G0/G2/G8/G9 findings, gate-scoping to TG-G4
    // leaves nothing — proving the metric won't penalize correct baseline behavior.
    expect(actual).toEqual([]);
  });
});
