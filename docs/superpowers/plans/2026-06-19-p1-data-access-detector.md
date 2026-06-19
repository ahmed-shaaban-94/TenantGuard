# P1 Data-Access Detector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only `data-access` detector that emits structural evidence of DB query sites and whether each carries a tenant-id filter — the first slice of the Fortify roadmap (P1).

**Architecture:** A new detector module under `packages/scanner/src/detect/` follows the exact pattern of `secrets.ts` / `stack.ts`: a pure function `(root, files) => DataAccessSite[]` that reads files via the existing `readFileSafe` io primitive and emits evidence objects. It **observes only** — it never judges, never imports gate logic. The assembled `ProjectMap` gains a new optional `data_access` field carrying these sites. Gate G4 is **not** modified in this slice (that is a later task, gated by its own spec); this slice ends at "the evidence is produced, validated, and tested."

**Tech Stack:** TypeScript (ESM, `.js` import specifiers), Vitest, Zod (via `@tenantguard/project-map` schema). pnpm workspace.

## Global Constraints

- Detectors are **read-only and evidence-emitting only**. No judgment in a detector; no `import` of any `@tenantguard/gates` symbol. (Constitution: control plane, not actor.)
- **Never capture or store a secret value**; evidence carries `path` + `line` + a signal label only. (FR-012 / FR-009 precedent in `secrets.ts`.)
- **Honesty default:** when no evidence is found, emit an empty array — never fabricate a site. (Mirrors `assemble.ts` `not_detected` discipline.)
- **Determinism:** output sorted by `path` then `line`, stable across runs. (R3 precedent in `detectRepos`/`detectStack`.)
- ESM imports use the `.js` specifier even for `.ts` sources (e.g. `import { readFileSafe } from "../io.js"`).
- Do **not** modify any artifact schema's public `version` constant. The new map field is **additive and optional** so existing `project-map.json` files still validate. (013 stop-condition: "Stop if enforcing requires changing existing artifact schemas" — additive optional fields do not break consumers.)
- Tests use `@pytest`-equivalent Vitest. Run a single package's tests with `pnpm --filter @tenantguard/scanner test`.
- Never `git add -A` / `git add .`. Stage named files only.
- Do not commit unless this plan's commit step is reached AND the working tree has no unrelated changes; if unrelated changes exist, STOP and report (constitution Required-Behavior-Before-Edits).

---

### Task 1: Define the `DataAccessSite` evidence type

**Files:**
- Modify: `packages/scanner/src/types.ts`
- Test: `packages/scanner/tests/data-access.test.ts` (created here, expanded in later tasks)

**Interfaces:**
- Consumes: nothing (leaf type).
- Produces: `DataAccessSite` — `{ path: string; line: number; signal: string; tenant_scoped: boolean }`. `tenant_scoped` is `true` only when a tenant-id token appears on the matched query line/statement; `false` otherwise. Later tasks (`detectDataAccess`, `assemble`) consume this exact shape.

- [ ] **Step 1: Write the failing test**

```typescript
// packages/scanner/tests/data-access.test.ts
import { describe, it, expect } from "vitest";
import type { DataAccessSite } from "../src/types.js";

describe("DataAccessSite type", () => {
  it("accepts a well-formed site object", () => {
    const site: DataAccessSite = {
      path: "apps/api/users.ts",
      line: 12,
      signal: "orm_query",
      tenant_scoped: false,
    };
    expect(site.tenant_scoped).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @tenantguard/scanner exec vitest run tests/data-access.test.ts`
Expected: FAIL — `DataAccessSite` is not exported from `../src/types.js`.

- [ ] **Step 3: Add the type**

Add to `packages/scanner/src/types.ts` (after the `RunNote` interface):

```typescript
/**
 * A detected database access site. Evidence only — the detector records WHERE a query happens
 * and WHETHER a tenant-id token scopes it. It never judges; G4 reasons over these later.
 */
export interface DataAccessSite {
  path: string;
  line: number;
  /** A short label for the matched query shape (e.g. "orm_query", "raw_sql"). Never a value. */
  signal: string;
  /** True only when a tenant-id token scopes the matched statement. */
  tenant_scoped: boolean;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @tenantguard/scanner exec vitest run tests/data-access.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/scanner/src/types.ts packages/scanner/tests/data-access.test.ts
git commit -m "feat(scanner): add DataAccessSite evidence type"
```

---

### Task 2: Implement `detectDataAccess` — query-site detection

**Files:**
- Create: `packages/scanner/src/detect/data-access.ts`
- Test: `packages/scanner/tests/data-access.test.ts` (expand)

**Interfaces:**
- Consumes: `DataAccessSite` (Task 1); `readFileSafe(root, rel)` from `../io.js` (returns `string | null`).
- Produces: `detectDataAccess(root: string, files: string[]): DataAccessSite[]` — one site per matched query line, sorted by `path` then `line`. Consumed by `assemble` (Task 3).

- [ ] **Step 1: Write the failing tests**

Append to `packages/scanner/tests/data-access.test.ts`:

```typescript
import { detectDataAccess } from "../src/detect/data-access.js";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "tg-da-"));
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, content);
  }
  return root;
}

describe("detectDataAccess", () => {
  it("flags an ORM query with no tenant filter as not tenant_scoped", () => {
    const root = fixture({
      "users.ts": `export const all = () => db.user.findMany({ where: { active: true } });\n`,
    });
    const sites = detectDataAccess(root, ["users.ts"]);
    expect(sites).toHaveLength(1);
    expect(sites[0]).toMatchObject({ path: "users.ts", line: 1, tenant_scoped: false });
  });

  it("marks a query carrying a tenant_id token as tenant_scoped", () => {
    const root = fixture({
      "users.ts": `export const mine = (t) => db.user.findMany({ where: { tenant_id: t } });\n`,
    });
    const sites = detectDataAccess(root, ["users.ts"]);
    expect(sites).toHaveLength(1);
    expect(sites[0].tenant_scoped).toBe(true);
  });

  it("returns an empty array when there are no query sites (honesty default)", () => {
    const root = fixture({ "util.ts": `export const add = (a, b) => a + b;\n` });
    expect(detectDataAccess(root, ["util.ts"])).toEqual([]);
  });

  it("is deterministic: sorted by path then line", () => {
    const root = fixture({
      "b.ts": `db.order.findMany();\n`,
      "a.ts": `db.user.findMany();\ndb.user.findFirst();\n`,
    });
    const sites = detectDataAccess(root, ["b.ts", "a.ts"]);
    expect(sites.map((s) => `${s.path}:${s.line}`)).toEqual(["a.ts:1", "a.ts:2", "b.ts:1"]);
  });

  it("skips non-source files and unreadable paths without throwing", () => {
    const root = fixture({ "data.json": `{"db.user.findMany": true}\n` });
    expect(detectDataAccess(root, ["data.json", "missing.ts"])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @tenantguard/scanner exec vitest run tests/data-access.test.ts`
Expected: FAIL — cannot import `detectDataAccess` from `../src/detect/data-access.js`.

- [ ] **Step 3: Implement the detector**

Create `packages/scanner/src/detect/data-access.ts`:

```typescript
import { readFileSafe } from "../io.js";
import type { DataAccessSite } from "../types.js";

// Only inspect source files that plausibly contain query code.
const SOURCE_EXT = /\.(ts|js|tsx|jsx|py|go|rb)$/;

// ORM / query-builder call shapes (Prisma/TypeORM/Knex/Sequelize-style) and raw SQL.
const QUERY_PATTERNS: { re: RegExp; signal: string }[] = [
  { re: /\b(find|findMany|findFirst|findUnique|findOne)\s*\(/, signal: "orm_query" },
  { re: /\b(select|update|delete|insert)\s*\(/i, signal: "query_builder" },
  { re: /\b(SELECT|UPDATE|DELETE|INSERT)\b[\s\S]{0,80}\bFROM\b|\bUPDATE\b\s+\w+\s+\bSET\b/i, signal: "raw_sql" },
];

// A tenant-id token scoping the statement. Conservative: token must appear on the same line.
const TENANT_TOKEN = /\btenant_?id\b|\borg_?id\b|\baccount_?id\b/i;

/**
 * Detect database access sites. Read-only evidence: records the path, line, query shape, and
 * whether a tenant-id token scopes that line. Never judges and never stores a value. Sites are
 * returned sorted by path then line (determinism). Honesty: no sites -> empty array.
 */
export function detectDataAccess(root: string, files: string[]): DataAccessSite[] {
  const sites: DataAccessSite[] = [];
  for (const rel of files) {
    if (!SOURCE_EXT.test(rel)) continue;
    const content = readFileSafe(root, rel);
    if (content === null) continue;
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const text = lines[i];
      const matched = QUERY_PATTERNS.find((p) => p.re.test(text));
      if (!matched) continue;
      sites.push({
        path: rel,
        line: i + 1,
        signal: matched.signal,
        tenant_scoped: TENANT_TOKEN.test(text),
      });
    }
  }
  sites.sort((a, b) => (a.path === b.path ? a.line - b.line : a.path < b.path ? -1 : 1));
  return sites;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @tenantguard/scanner exec vitest run tests/data-access.test.ts`
Expected: PASS (all 6 tests in the file).

- [ ] **Step 5: Commit**

```bash
git add packages/scanner/src/detect/data-access.ts packages/scanner/tests/data-access.test.ts
git commit -m "feat(scanner): add read-only data-access query-site detector"
```

---

### Task 3: Wire `data_access` evidence into the assembled ProjectMap

**Files:**
- Modify: `packages/project-map/src/` schema (add optional `data_access` field) — locate the Zod schema file first with `grep -rn "critical_surfaces" packages/project-map/src`.
- Modify: `packages/scanner/src/assemble.ts`
- Test: `packages/scanner/tests/data-access.test.ts` (expand with an assemble-level test)

**Interfaces:**
- Consumes: `detectDataAccess` (Task 2); `assemble(root, listFiles)` existing signature.
- Produces: `ProjectMap.data_access?: DataAccessSite[]` — an **optional, additive** field. Absence ≡ not produced (back-compat). Later gate work (separate spec) consumes `map.data_access`.

- [ ] **Step 1: Locate the project-map schema**

Run: `grep -rn "critical_surfaces" packages/project-map/src`
Expected: one schema file (e.g. `schema.ts`) defining the `ProjectMap` Zod object. Read it before editing.

- [ ] **Step 2: Write the failing assemble test**

Append to `packages/scanner/tests/data-access.test.ts`:

```typescript
import { assemble } from "../src/assemble.js";
import { listFiles } from "../src/index.js";

describe("assemble integrates data_access evidence", () => {
  it("populates map.data_access from detected query sites", () => {
    const root = fixture({
      "package.json": `{"name":"x"}`,
      "api/users.ts": `db.user.findMany({ where: { tenant_id: t } });\n`,
    });
    const { map } = assemble(root, listFiles);
    expect(map.data_access).toEqual([
      { path: "api/users.ts", line: 1, signal: "orm_query", tenant_scoped: true },
    ]);
  });

  it("omits or empties data_access when there are no query sites", () => {
    const root = fixture({ "package.json": `{"name":"x"}`, "readme.md": `hi\n` });
    const { map } = assemble(root, listFiles);
    expect(map.data_access ?? []).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @tenantguard/scanner exec vitest run tests/data-access.test.ts`
Expected: FAIL — `map.data_access` is `undefined` (field not assembled / not in schema).

- [ ] **Step 4: Add the optional field to the schema**

In the project-map Zod schema file found in Step 1, add to the `ProjectMap` object (mirror the existing `DataAccessSite` shape; keep it `.optional()` so existing maps still validate). Example shape to add inside the object:

```typescript
  data_access: z
    .array(
      z.object({
        path: z.string(),
        line: z.number().int().nonnegative(),
        signal: z.string(),
        tenant_scoped: z.boolean(),
      }),
    )
    .optional(),
```

Export the inferred TS type alongside the others if that file exports per-field types (follow the file's existing convention; do not invent a new one).

- [ ] **Step 5: Populate the field in `assemble`**

In `packages/scanner/src/assemble.ts`:

Add the import near the other detect imports (line ~4):

```typescript
import { detectDataAccess } from "./detect/data-access.js";
```

After `const { repos } = detectRepos(root, listFiles);` (line ~27), add:

```typescript
  const data_access = detectDataAccess(root, files);
```

Add `data_access` to the `map` object literal (after `critical_surfaces`, line ~57):

```typescript
    critical_surfaces,
    data_access,
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter @tenantguard/scanner exec vitest run tests/data-access.test.ts`
Expected: PASS (all 8 tests).

- [ ] **Step 7: Run the full scanner + project-map suites (no regressions)**

Run: `pnpm --filter @tenantguard/scanner test && pnpm --filter @tenantguard/project-map test`
Expected: PASS. (Confirms the additive optional field broke no existing map fixtures.)

- [ ] **Step 8: Commit**

```bash
git add packages/scanner/src/assemble.ts packages/scanner/tests/data-access.test.ts packages/project-map/src
git commit -m "feat(scanner): surface data_access evidence in project map (additive, optional)"
```

---

### Task 4: Verify full workspace build & typecheck

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: PASS across all packages.

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS — `data_access` typed end-to-end (detector → assemble → map type).

- [ ] **Step 3: Confirm no gate file was touched**

Run: `git diff --name-only HEAD~3 HEAD`
Expected: only `packages/scanner/**` and `packages/project-map/**` files. No `packages/gates/**`. (This slice produces evidence only; G4 consumption is a separate, later spec.)

---

## Self-Review

**1. Spec coverage (against the roadmap P1 section):**
- "new read-only evidence detector `data-access` feeding G4" → Tasks 1–2 produce the evidence; Task 3 surfaces it on the map for G4 to consume later. The G4 *consumption* is explicitly deferred (roadmap says each detector ships its own spec→plan→tasks cycle), and Task 4 Step 3 asserts no gate file changed — consistent with scope. ✓
- "observes only; never judges; never imports gate logic" → Global Constraints + detector contains zero gate imports; `tenant_scoped` is a fact, not a verdict. ✓
- "independently testable given a fixture repo" → every task is fixture-driven Vitest. ✓
- "matches existing repos/secrets/stack pattern, ~200 lines" → `data-access.ts` mirrors `secrets.ts` structure and is well under 200 lines. ✓

**2. Placeholder scan:** No TBD/TODO. The one lookup-then-edit (Task 3 Step 1/4, schema file) is unavoidable because the project-map schema file path wasn't read in this session — it is bounded by an exact `grep` command and an exact field to add, not a vague "add validation." Acceptable. ✓

**3. Type consistency:** `DataAccessSite` shape `{ path, line, signal, tenant_scoped }` is identical in Task 1 (type), Task 2 (detector return + tests), Task 3 (Zod schema + assemble + tests). `detectDataAccess(root, files)` signature is identical where defined (Task 2) and consumed (Task 3). ✓

**Note on a known weakness this slice intentionally does NOT fix:** G4's current file-level false-positive logic (`packages/gates/src/gates/g4-security.ts:27` flags all routes when one auth token is absent) is real but out of scope here — it belongs to the G4-consumption spec that follows this detector. Flagged so the next planner picks it up.
