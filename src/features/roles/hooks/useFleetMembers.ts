/**
 * Hook React Query — membres de la flotte active.
 * Fetch, changement de rôle, désactivation.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { RoleType } from "@/repositories/fleet-member.repository";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MemberRow {
  id: string;
  user_id: string;
  fleet_id: string;
  role: RoleType;
  is_active: boolean;
  created_at: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
}

// ─── Query key ────────────────────────────────────────────────────────────────

const qk = (fleetId: string | undefined) => ["fleet-members", fleetId] as const;

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchMembers(fleetId: string): Promise<MemberRow[]> {
  const { data, error } = await supabase
    .from("flotte_adhesions")
    .select(`
      id,
      user_id,
      fleet_id,
      role,
      is_active,
      created_at,
      profils!flotte_adhesions_user_id_fkey(full_name, phone)
    `)
    .eq("fleet_id", fleetId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data as Array<Record<string, unknown>>) ?? []).map((row) => {
    const profil = (row.profils as { full_name: string | null; phone: string | null } | null) ?? null;
    return {
      id:         row.id as string,
      user_id:    row.user_id as string,
      fleet_id:   row.fleet_id as string,
      role:       row.role as RoleType,
      is_active:  row.is_active as boolean,
      created_at: row.created_at as string,
      full_name:  profil?.full_name ?? null,
      phone:      profil?.phone ?? null,
      email:      null, // non exposé côté client sans service_role
    };
  });
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useFleetMembers() {
  const { userFleetId } = useAuth();
  const queryClient = useQueryClient();

  // ── Liste des membres ────────────────────────────────────────────────────────

  const query = useQuery({
    queryKey: qk(userFleetId ?? undefined),
    queryFn:  () => fetchMembers(userFleetId!),
    enabled:  !!userFleetId,
    staleTime: 30_000,
  });

  // ── Changer le rôle d'un membre ──────────────────────────────────────────────

  const changeRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: RoleType }) => {
      if (!userFleetId) throw new Error("Flotte non définie.");

      const { error } = await supabase.rpc("creer_ou_mettre_a_jour_adhesion_flotte", {
        p_fleet_id:  userFleetId,
        p_user_id:   userId,
        p_role:      newRole,
        p_is_active: true,
      });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk(userFleetId ?? undefined) });
    },
  });

  // ── Désactiver un membre ──────────────────────────────────────────────────────

  const deactivateMember = useMutation({
    mutationFn: async ({ memberId, userId, role }: { memberId: string; userId: string; role: RoleType }) => {
      if (!userFleetId) throw new Error("Flotte non définie.");

      // Utiliser le RPC existant avec is_active=false
      const { error } = await supabase.rpc("creer_ou_mettre_a_jour_adhesion_flotte", {
        p_fleet_id:  userFleetId,
        p_user_id:   userId,
        p_role:      role,
        p_is_active: false,
      });

      if (error) {
        // Fallback : update direct sur l'id
        const { error: updateErr } = await supabase
          .from("flotte_adhesions")
          .update({ is_active: false })
          .eq("id", memberId);
        if (updateErr) throw new Error(updateErr.message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk(userFleetId ?? undefined) });
    },
  });

  // ── Réactiver un membre ───────────────────────────────────────────────────────

  const reactivateMember = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: RoleType }) => {
      if (!userFleetId) throw new Error("Flotte non définie.");

      const { error } = await supabase.rpc("creer_ou_mettre_a_jour_adhesion_flotte", {
        p_fleet_id:  userFleetId,
        p_user_id:   userId,
        p_role:      role,
        p_is_active: true,
      });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk(userFleetId ?? undefined) });
    },
  });

  return {
    members:           query.data ?? [],
    isLoading:         query.isLoading,
    isError:           query.isError,
    error:             query.error,
    refetch:           query.refetch,
    changeRole,
    deactivateMember,
    reactivateMember,
  };
}
