import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useFleetSiteAccess(fleetId?: string | null) {
  return useQuery({
    queryKey: ["fleet-site-access", fleetId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "has_fleet_site_access" as never,
        { p_fleet_id: fleetId as string } as never,
      );

      if (error) {
        throw new Error(error.message);
      }

      return Boolean(data);
    },
    enabled: Boolean(fleetId),
    staleTime: 30 * 1000,
  });
}
