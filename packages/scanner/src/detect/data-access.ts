import { readFileSafe } from "../io.js";
import type { Evidence } from "@tenantguard/project-map";

// Only inspect source files that plausibly contain query code.
const SOURCE_EXT = /\.(ts|js|tsx|jsx|py|go|rb)$/;

// ORM / query-builder call shapes (Prisma/TypeORM/Knex/Sequelize-style) and raw SQL.
const QUERY_PATTERNS: RegExp[] = [
  /\b(find|findMany|findFirst|findUnique|findOne)\s*\(/,
  /\b(select|update|delete|insert)\s*\(/i,
  /\b(SELECT|UPDATE|DELETE|INSERT)\b[\s\S]{0,80}\bFROM\b|\bUPDATE\b\s+\w+\s+\bSET\b/i,
];

// A tenant-id token scoping the statement. Conservative: token must appear on the same line.
const TENANT_TOKEN = /\btenant_?id\b|\borg_?id\b|\baccount_?id\b/i;

/**
 * Detect database access sites as normative Evidence. Read-only: records WHERE a query happens
 * and encodes tenant-scoping in the signal ("tenant_scoped" vs "no_tenant_filter"). Never judges
 * and never stores a value. Returned sorted by path then line (determinism). Honesty: no sites
 * -> empty array.
 */
export function detectDataAccess(root: string, files: string[]): Evidence[] {
  const out: Evidence[] = [];
  for (const rel of files) {
    if (!SOURCE_EXT.test(rel)) continue;
    const content = readFileSafe(root, rel);
    if (content === null) continue;
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const text = lines[i] ?? "";
      if (!QUERY_PATTERNS.some((re) => re.test(text))) continue;
      out.push({
        type: "line",
        path: rel,
        line: i + 1,
        signal: TENANT_TOKEN.test(text) ? "tenant_scoped" : "no_tenant_filter",
        confidence: "high",
      });
    }
  }
  out.sort((a, b) =>
    a.path === b.path ? (a.line ?? 0) - (b.line ?? 0) : (a.path ?? "") < (b.path ?? "") ? -1 : 1,
  );
  return out;
}
