/**
 * Hook React Query — historique des actions RBAC pour la flotte active.
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { AuditService } from "@/services/audit.service";
import { AuditRepository } from "@/repositories/audit.repository";

const auditRepository = new AuditRepository();
const auditService = new AuditService(auditRepository);

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor_name: string | null;
  target_name: string | null;
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "member.added":         "Membre ajouté",
  "member.role_changed":  "Rôle modifié",
  "member.deactivated":   "Accès désactivé",
  "member.reactivated":   "Accès réactivé",
  "member.updated":       "Membre mis à jour",
  "member.offboarded":    "Membre retiré",
  "member.invited":       "Invitation créée",
  "vehicle.created":      "Véhicule ajouté",
  "vehicle.deleted":      "Véhicule supprimé",
  "closure.validated":    "Clôture validée",
  "maintenance.validated":"Intervention validée",
  "org.settings_changed": "Paramètres modifiés",
};

export function useRoleAuditLog() {
  const { userFleetId } = useAuth();

  return useQuery({
    queryKey: ["role-audit-log", userFleetId],
    queryFn: async (): Promise<AuditLogEntry[]> => {
      const rows = await auditService.getFleetAuditLogs(userFleetId!, 50);
      return rows.map((row) => ({
        id: row.id,
        actor_id: row.actor_id,
        action: row.action,
        target_id: row.target_id,
        metadata: row.metadata,
        created_at: row.created_at,
        actor_name: null,
        target_name: null,
      }));
    },
    enabled: !!userFleetId,
    staleTime: 60_000,
  });
}
