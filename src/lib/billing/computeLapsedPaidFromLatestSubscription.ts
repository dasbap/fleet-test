/**
 * Détecte si la dernière ligne d’abonnement correspond à un plan payant hors fenêtre active.
 * Logique partagée entre le client et le BFF ([src/server](src/server)).
 */
export function computeLapsedPaidFromLatestSubscription(
  latest: {
    status: string;
    starts_at: string;
    ends_at: string;
    plans: { code: string } | null;
  } | null,
  now: Date,
): boolean {
  if (!latest) return false;
  const code = latest.plans?.code ?? "free";
  if (code === "free") return false;
  const ends = new Date(latest.ends_at);
  const starts = new Date(latest.starts_at);
  if (latest.status === "inactive" || latest.status === "pending_payment") return false;
  if (latest.status !== "active") return true;
  if (ends < now) return true;
  if (starts > now) return true;
  return false;
}
