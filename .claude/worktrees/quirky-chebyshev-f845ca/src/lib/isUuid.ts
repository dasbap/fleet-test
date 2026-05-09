/**
 * Validation basique des UUID (format canonique 8-4-4-4-12 hex).
 * Utilisé pour éviter d’envoyer des slugs (ex. fleet-esamba-sn) aux colonnes uuid Supabase.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string | null | undefined): boolean {
  if (value == null || typeof value !== "string") return false;
  const t = value.trim();
  return t.length > 0 && UUID_RE.test(t);
}
