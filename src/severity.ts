export type Severity = "critical" | "high" | "medium";

/**
 * Blast radius, not just count — the share of runs an issue touches is the
 * only severity signal available from rules alone.
 */
export function severityFor(share: number): Severity {
  if (share >= 20) return "critical";
  if (share >= 10) return "high";
  return "medium";
}

export function sharePercent(part: number, total: number): number {
  return total > 0 ? (part / total) * 100 : 0;
}
