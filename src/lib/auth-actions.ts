import { supabase } from "@/integrations/supabase/client";
import { isMockAuthEnabled } from "@/lib/authMode";
import { normalizeLoginRole } from "@/lib/mobile/mobileRoleBridge";
import { mockAuthService } from "@/services/mock-auth.service";
import type { AppRole } from "@/types/auth";

/** Événement pour resynchroniser le provider mock après login / logout hors React. */
export const MOCK_AUTH_CHANGED_EVENT = "esamba-mock-auth-changed";

export function notifyMockAuthChanged(): void {
  window.dispatchEvent(new CustomEvent(MOCK_AUTH_CHANGED_EVENT));
}

/**
 * Connexion : en mode mock, identifiant = email ou téléphone ; sinon email Supabase.
 */
export async function signIn(
  identifier: string,
  password: string,
  loginRole?: AppRole | string,
) {
  if (isMockAuthEnabled()) {
    const appRole = normalizeLoginRole(loginRole);
    const { error } = mockAuthService.signInWithPassword(
      identifier,
      password,
      appRole,
    );
    if (!error) notifyMockAuthChanged();
    return { data: null as unknown, error };
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email: identifier.trim(),
    password,
  });
  return { data, error };
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  invitationFleetId?: string,
  invitationCode?: string,
) {
  if (isMockAuthEnabled()) {
    return {
      data: null,
      error: new Error(
        "L’inscription en ligne n’est pas disponible en mode session mockée.",
      ),
    };
  }
  const redirectUrl = `${window.location.origin}/`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        full_name: fullName,
        invitation_fleet_id: invitationFleetId,
        invitation_code: invitationCode,
      },
    },
  });
  return { data, error };
}

export async function signOut() {
  if (isMockAuthEnabled()) {
    mockAuthService.clearSession();
    notifyMockAuthChanged();
    return { error: null };
  }
  const { error } = await supabase.auth.signOut();
  return { error };
}
