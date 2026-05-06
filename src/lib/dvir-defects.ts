/**
 * Comptage des défauts par item, aligné sur le RPC `get_dvir_list` (jsonb_each sur `items`).
 * Un item compte si le statut est "defaut" / "defect" (insensible à la casse) ou si la valeur JSONB est `false`.
 */
export function countDvirDefectsFromJsonbItems(items: unknown): number {
  if (!items || typeof items !== "object" || Array.isArray(items)) {
    return 0;
  }

  let n = 0;
  for (const v of Object.values(items as Record<string, unknown>)) {
    if (v === false) {
      n += 1;
      continue;
    }
    if (!v || typeof v !== "object" || Array.isArray(v)) {
      continue;
    }
    const status = (v as { status?: unknown }).status;
    const s = typeof status === "string" ? status.toLowerCase() : "";
    if (s === "defaut" || s === "defect") {
      n += 1;
    }
  }
  return n;
}
