/**
 * PostgREST peut typer / renvoyer une relation many-to-one comme objet ou tableau.
 * Normalise vers un seul enregistrement (ou null).
 */
export function asSingleRelation<T>(
  value: T | T[] | null | undefined,
): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}
