"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface FleetOption {
  id: string;
  name: string;
}

export interface OrgContext {
  userId: string;
  fleetId: string;
  orgId: string;
  role: string;
  fleetName: string | null;
  orgName: string | null;
  fleets: FleetOption[];
}

function unwrapSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function fetchOrgContext(): Promise<OrgContext | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership, error } = await supabase
    .from("flotte_adhesions")
    .select(
      "fleet_id, role, flottes(id, name, org_id, organisations(id, name))",
    )
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !membership?.fleet_id) return null;

  const fleet = unwrapSingle(
    membership.flottes as
      | {
          id?: string;
          name?: string | null;
          org_id?: string;
          organisations?:
            | { id?: string; name?: string | null }
            | { id?: string; name?: string | null }[];
        }
      | {
          id?: string;
          name?: string | null;
          org_id?: string;
          organisations?:
            | { id?: string; name?: string | null }
            | { id?: string; name?: string | null }[];
        }[]
      | null,
  );
  const org = unwrapSingle(fleet?.organisations ?? null);

  if (!fleet?.org_id || !org?.id) return null;

  const { data: fleets } = await supabase
    .from("flottes")
    .select("id, name")
    .eq("org_id", org.id)
    .order("name");

  return {
    userId: user.id,
    fleetId: membership.fleet_id,
    orgId: org.id,
    role: membership.role,
    fleetName: fleet.name ?? null,
    orgName: org.name ?? null,
    fleets: (fleets ?? []).map((row) => ({
      id: row.id,
      name: row.name,
    })),
  };
}

/** Contexte organisation / flotte actif (schéma prod français). */
export function useOrg() {
  const query = useQuery({
    queryKey: ["org-context"],
    queryFn: fetchOrgContext,
    staleTime: 60_000,
  });

  return {
    ...query,
    orgId: query.data?.orgId ?? null,
    orgName: query.data?.orgName ?? null,
    fleetId: query.data?.fleetId ?? null,
    role: query.data?.role ?? null,
    fleets: query.data?.fleets ?? [],
    loading: query.isLoading,
  };
}
