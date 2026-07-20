/**
 * Helpers RBAC côté services (client Supabase authentifié).
 * Source de vérité serveur : RPC rbac_check_permission + RLS.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Permission, PlatformRole } from '@/types/rbac';
import { hasPermission as roleHasPermission, roleIsAtLeast } from '@/lib/rbac/permissions';
import { RbacError } from '@/lib/rbac/errors';
import { throwIfSupabaseInfrastructureError } from '@/lib/supabase-runtime-errors';
import type { FleetMember } from '@/repositories/fleet-member.repository';

export { RbacError };

interface PermissionRpcResult {
  allowed: boolean;
  role: string | null;
  reason?: string;
}

/** Vérifie une permission via RPC (ne lève pas). */
type SupabaseRpcError = {
  code?: string;
  message?: string;
  details?: string;
};

function isMissingRbacPermissionRpc(error: SupabaseRpcError): boolean {
  const text = `${error.code ?? ''} ${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return (
    text.includes('rbac_check_permission') &&
    (error.code === 'PGRST202' ||
      error.code === 'PGRST204' ||
      text.includes('could not find the function') ||
      text.includes('schema cache'))
  );
}

async function checkPermissionFromMembership(
  permission: Permission,
  fleetId: string,
): Promise<PermissionRpcResult> {
  const membership = await getCurrentUserMembership(fleetId);
  const role = (membership?.role as PlatformRole | null) ?? null;
  const allowed = roleHasPermission(role, permission);

  return {
    allowed,
    role,
    reason: !role ? 'no_fleet_access' : allowed ? 'role_allowed' : 'role_denied',
  };
}

export async function hasPermission(
  permission: Permission,
  fleetId?: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('rbac_check_permission', {
    p_action: permission,
    p_fleet_id: fleetId ?? null,
  });

  if (error) {
    if (fleetId && isMissingRbacPermissionRpc(error)) {
      const fallback = await checkPermissionFromMembership(permission, fleetId);
      return fallback.allowed;
    }

    throwIfSupabaseInfrastructureError(error, 'rbac permission check');
    console.error('[rbac] rbac_check_permission:', error.message);
    return false;
  }

  const result = data as PermissionRpcResult | null;
  return !!result?.allowed;
}

/** Vérifie un rôle minimum sur une flotte (lecture adhésion + hiérarchie). */
export async function hasRole(
  minRole: PlatformRole,
  fleetId: string,
  userId?: string,
): Promise<boolean> {
  const membership = await getCurrentUserMembership(fleetId, userId);
  if (!membership) return false;
  return roleIsAtLeast(membership.role as PlatformRole, minRole);
}

/** Exige une permission ; lève RbacError si refus. */
export async function requirePermission(
  permission: Permission,
  fleetId: string,
): Promise<PlatformRole | null> {
  const { data, error } = await supabase.rpc('rbac_check_permission', {
    p_action: permission,
    p_fleet_id: fleetId,
  });

  if (error) {
    if (isMissingRbacPermissionRpc(error)) {
      const fallback = await checkPermissionFromMembership(permission, fleetId);
      if (fallback.allowed) {
        console.warn(
          '[rbac] rbac_check_permission unavailable; using active membership fallback. Apply migration 20260702002000_restore_rbac_check_permission.sql.',
          error.message,
        );
        return (fallback.role as PlatformRole | null) ?? null;
      }

      throw new RbacError(
        'Permission insuffisante pour cette action.',
        'RBAC_DENIED',
        permission,
        (fallback.role as PlatformRole | null) ?? null,
      );
    }

    throwIfSupabaseInfrastructureError(error, 'rbac permission requirement');
    throw new RbacError(error.message, 'RBAC_DENIED', permission);
  }

  const result = data as PermissionRpcResult | null;
  if (!result?.allowed) {
    throw new RbacError(
      'Permission insuffisante pour cette action.',
      'RBAC_DENIED',
      permission,
      (result?.role as PlatformRole | null) ?? null,
    );
  }

  return (result.role as PlatformRole | null) ?? null;
}

/** Exige un rôle minimum sur la flotte. */
export async function requireRole(
  minRole: PlatformRole,
  fleetId: string,
  userId?: string,
): Promise<PlatformRole> {
  const membership = await getCurrentUserMembership(fleetId, userId);
  if (!membership) {
    throw new RbacError('Aucune adhésion active sur cette flotte.', 'NO_FLEET_ACCESS');
  }

  const role = membership.role as PlatformRole;
  if (!roleIsAtLeast(role, minRole)) {
    throw new RbacError(
      `Rôle insuffisant (requis : ${minRole}).`,
      'RBAC_ROLE_DENIED',
      undefined,
      role,
    );
  }

  return role;
}

/** Adhésion active de l'utilisateur courant (ou userId fourni) sur une flotte. */
export async function getCurrentUserMembership(
  fleetId: string,
  userId?: string,
): Promise<Pick<FleetMember, 'id' | 'user_id' | 'fleet_id' | 'role' | 'is_active'> | null> {
  let uid = userId;
  if (!uid) {
    const { data: { user } } = await supabase.auth.getUser();
    uid = user?.id;
  }
  if (!uid) return null;

  const { data, error } = await supabase
    .from('flotte_adhesions')
    .select('id, user_id, fleet_id, role, is_active')
    .eq('fleet_id', fleetId)
    .eq('user_id', uid)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[rbac] getCurrentUserMembership:', error.message);
    throwIfSupabaseInfrastructureError(error, 'current fleet membership');
    return null;
  }

  return data as Pick<FleetMember, 'id' | 'user_id' | 'fleet_id' | 'role' | 'is_active'> | null;
}

/** Écriture audit applicative (hors triggers SQL). */
export async function auditAction(
  action: string,
  fleetId: string,
  metadata: Record<string, unknown> = {},
  targetId?: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.rpc('write_audit_log', {
    p_action: action,
    p_target_id: targetId ?? null,
    p_fleet_id: fleetId,
    p_metadata: metadata,
    p_actor_id: user?.id ?? null,
  });

  if (error) {
    console.warn('[rbac] auditAction:', error.message);
  }
}
