import type { MaintenanceJobPart, Priority } from "@/hooks/useMaintenance";

/** Libellés UI ; le type métier est porté dans le champ `notes` (pas de colonne SQL). */
export const TYPE_LABELS = {
  oil: "Vidange huile",
  tires: "Pneus",
  brakes: "Freins",
  revision: "Révision générale",
  other: "Autre",
} as const;

export type MaintenanceTypeUi = keyof typeof TYPE_LABELS;

export type PlanPriorityUi = "critical" | "high" | "normal" | "low";

/** Priorités affichées vers colonne `travaux_maintenance.priority`. */
export function mapUiPriorityToDb(ui: PlanPriorityUi): Priority {
  switch (ui) {
    case "normal":
      return "medium";
    case "low":
      return "low";
    case "high":
      return "high";
    case "critical":
      return "critical";
    default:
      return "medium";
  }
}

export function formatXaf(n: number): string {
  return new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency: "XAF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/** Lignes cochées vers jsonb `parts`. */
export function checklistToParts(
  items: { label: string; priceXaf: number; checked: boolean }[],
): MaintenanceJobPart[] {
  return items
    .filter((i) => i.checked)
    .map((i) => ({
      designation: `${i.label} — ${formatXaf(i.priceXaf)} (estim.)`,
      quantity: 1,
    }));
}

/** Texte agrégé pour colonne `notes`. */
export function buildPlannerNotes(input: {
  typeKey: MaintenanceTypeUi;
  userNotes: string;
  durationLabel: string;
  prestataireName: string | null;
}): string {
  const header = `[Type: ${TYPE_LABELS[input.typeKey]}]`;
  const duration = `Durée estimée : ${input.durationLabel}`;
  const prest = input.prestataireName
    ? `Prestataire choisi : ${input.prestataireName}`
    : null;
  const body = input.userNotes.trim();

  return [header, duration, prest, body ? `Notes : ${body}` : null]
    .filter(Boolean)
    .join("\n");
}

/** Date + heure locales vers ISO pour `planned_at`. */
export function computePlannedAtIso(date: Date, timeHHmm: string): string {
  const [h, m] = timeHHmm.split(":").map(Number);
  const d = new Date(date);
  d.setHours(Number.isFinite(h) ? h : 8, Number.isFinite(m) ? m : 0, 0, 0);
  return d.toISOString();
}
