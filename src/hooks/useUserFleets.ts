import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FleetMembership } from "@/hooks/useAuth";

export interface FleetInfo {
  id: string;
  name: string;
  country_code?: string;
}

export interface UseUserFleetsResult {
  fleets: FleetInfo[];
  fleetById: Record<string, FleetInfo>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Charge les flottes correspondant aux adhésions de l'utilisateur.
 * Expose fleetById pour des lookups O(1) dans les listes.
 */
export function useUserFleets(memberships: FleetMembership[]): UseUserFleetsResult {
  const [fleets, setFleets] = useState<FleetInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFleets = useCallback(async () => {
    if (memberships.length === 0) {
      setFleets([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const fleetIds = memberships.map((m) => m.fleet_id);
    const { data, err } = await supabase
      .from("flottes")
      .select("id, name, organisations(country_code)")
      .in("id", fleetIds);

    if (err) {
      console.error("Erreur lors de la récupération des flottes:", err);
      setError(err.message ?? "Impossible de charger les flottes");
      setFleets([]);
    } else if (data) {
      // country_code est sur organisations, pas sur flottes
      const mapped = (data as { id: string; name: string; organisations: { country_code: string } | null }[]).map(
        (row) => ({
          id: row.id,
          name: row.name,
          country_code: row.organisations?.country_code,
        })
      );
      setFleets(mapped);
    } else {
      setFleets([]);
    }
    setIsLoading(false);
  }, [memberships]);

  useEffect(() => {
    fetchFleets();
  }, [fetchFleets]);

  const fleetById = useMemo(() => {
    const map: Record<string, FleetInfo> = {};
    for (const f of fleets) {
      map[f.id] = f;
    }
    return map;
  }, [fleets]);

  return { fleets, fleetById, isLoading, error, refresh: fetchFleets };
}
