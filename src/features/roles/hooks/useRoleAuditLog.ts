/**
 * Hook React Query — historique des actions RBAC pour la flotte active.
 * Lit audit_logs filtré par fleet_id et actions membres.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  // Enrichis côté client
  actor_name: string | null;
  target_name: string | null;
}

// Libellés lisibles pour les actions
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "member.added":        "Membre ajouté",
  "member.role_changed": "Rôle modifié",
  "member.deactivated":  "Accès désactivé",
  "member.reactivated":  "Accès réactivé",
  "member.updated":      "Membre mis à jour",
  "member.offboarded":   "Membre retiré",
};

const MEMBER_ACTIONS = Object.keys(AUDIT_ACTION_LABELS);

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchAuditLog(fleetId: string): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, target_id, metadata, created_at")
    .eq("fleet_id", fleetId)
    .in("action", MEMBER_ACTIONS)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return ((data as Array<Record<string, unknown>>) ?? []).map((row) => ({
    id:          row.id as string,
    actor_id:    (row.actor_id as string | null) ?? null,
    action:      row.action as string,
    target_id:   (row.target_id as string | null) ?? null,
    metadata:    (row.metadata as Record<string, unknown>) ?? {},
    created_at:  row.created_at as string,
    actor_name:  null,   // enrichissement optionnel post-fetch
    target_name: null,
  }));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRoleAuditLog() {
  const { userFleetId } = useAuth();

  return useQuery({
    queryKey:  ["role-audit-log", userFleetId],
    queryFn:   () => fetchAuditLog(userFleetId!),
    enabled:   !!userFleetId,
    staleTime: 60_000,
  });
}
