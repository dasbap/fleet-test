/** Fenêtre pendant laquelle la liste / détail véhicule est considéré comme frais (moins de refetch). */
export const VEHICLE_QUERY_STALE_MS = 3 * 60 * 1000;

/** Conservation en mémoire (React Query) pour navigation et retour hors ligne dans la session. */
export const VEHICLE_QUERY_GC_MS = 24 * 60 * 60 * 1000;
