/** Pourcentage entier (0–100), dénominateur nul → 0. */
export function retentionPct(n: number, d: number): number {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

/** Classes Tailwind pour la heatmap cohortes. */
export function retentionHeatClass(p: number): string {
  if (p === 0) return "bg-surface-raised text-slate-500";
  if (p < 20) return "bg-amber-400/15 text-amber-600 dark:text-amber-400";
  if (p < 40) return "bg-brand/15 text-brand-dark dark:text-brand-light";
  return "bg-brand/30 text-brand-dark dark:text-brand-light font-medium";
}

/** Affichage date courte (fr-FR). */
export function formatRetentionDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
