import type { DvirItemStatus, DvirStatus } from "@/repositories/dvir.repository";

const CRITICAL_ITEM_KEYS = new Set(["freins_service", "frein_main", "direction", "pneus"]);

export function isDvirItemDefect(status: DvirItemStatus): boolean {
  return status === "defaut" || status === "defect";
}

/**
 * Cohérente avec DvirService / persistance (statut global DVIR).
 */
export function computeOverallDvirStatus(
  items: Record<string, { status: DvirItemStatus }>,
): DvirStatus {
  let hasNonCriticalIssue = false;

  for (const [key, item] of Object.entries(items)) {
    if (!isDvirItemDefect(item.status)) {
      continue;
    }

    if (CRITICAL_ITEM_KEYS.has(key)) {
      return "unsafe";
    }
    hasNonCriticalIssue = true;
  }

  return hasNonCriticalIssue ? "minor_issues" : "ok";
}
