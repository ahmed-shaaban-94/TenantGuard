import type { BenchmarkReport, TierMetric } from "./report.js";
import type { Tier } from "./types.js";

/** A floor for a gate × tier. Absent fields are not checked. */
export interface TierThreshold {
  min_precision?: number;
  min_recall?: number;
}

/** thresholds.json shape: gate -> tier -> floors. Gates/tiers without an entry are report-only. */
export type Thresholds = Record<string, Partial<Record<Tier, TierThreshold>>>;

export interface Breach {
  gate: string;
  tier: Tier;
  metric: "precision" | "recall";
  floor: number;
  actual: number | null;
}

/**
 * Check a report against thresholds. Returns every breach (empty = pass). A metric of `null`
 * (no data) does NOT breach — you cannot fail a floor you have no evidence for; that is surfaced
 * as report-only rather than a false failure.
 */
export function checkThresholds(report: BenchmarkReport, thresholds: Thresholds): Breach[] {
  const breaches: Breach[] = [];
  for (const gate of Object.keys(thresholds).sort()) {
    const gateMetric = report.per_gate[gate];
    if (!gateMetric) continue; // no data for this gate this run → report-only
    for (const tier of Object.keys(thresholds[gate]!) as Tier[]) {
      const floor = thresholds[gate]![tier]!;
      const m: TierMetric = gateMetric.byTier[tier];
      if (floor.min_precision !== undefined && m.precision !== null && m.precision < floor.min_precision) {
        breaches.push({ gate, tier, metric: "precision", floor: floor.min_precision, actual: m.precision });
      }
      if (floor.min_recall !== undefined && m.recall !== null && m.recall < floor.min_recall) {
        breaches.push({ gate, tier, metric: "recall", floor: floor.min_recall, actual: m.recall });
      }
    }
  }
  return breaches;
}
