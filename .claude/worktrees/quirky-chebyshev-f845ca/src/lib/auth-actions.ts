import { supabase } from "@/integrations/supabase/client";
import { enableDemoAuthFallback, isMockAuthEnabled } from "@/lib/authMode";
import { clearBiometricLockStorage } from "@/services/biometric-lock.service";
import { normalizeLoginRole } from "@/lib/mobile/mobileRoleBridge";
import { mockAuthService } from "@/services/mock-auth.service";
import type { AppRole } from "@/types/auth";

/** Événement pour resynchroniser le provider mock après login / logout hors React. */
export const MOCK_AUTH_CHANGED_EVENT = "esamba-mock-auth-changed";

export function notifyMockAuthChanged(): void {
  window.dispatchEvent(new CustomEvent(MOCK_AUTH_CHANGED_EVENT));
}

function isDemoAccount(identifier: string): boolean {
  return identifier.trim().toLowerCase().endsWith("@esamba.test");
}

function roleFromDemoEmail(email: string): AppRole {
  const normalized = email.trim().toLowerCase();
  if (normalized.includes("organizer")) return "organizer";
  if (normalized.includes("mechanic")) return "mechanic";
  if (normalized.includes("driver")) return "driver";
  return "manager";
}

function isSupabaseNetworkError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return message.toLowerCase().includes("failed to fetch");
}

/**
 * Connexion : en mode mock, identifiant = email ou téléphone ; sinon email Supabase.
 */
export async function signIn(
  identifier: string,
  password: string,
  loginRole?: AppRole | string,
) {
  const normalizedIdentifier = identifier.trim();
  const appRole = normalizeLoginRole(loginRole);

  if (isMockAuthEnabled()) {
    const { error } = mockAuthService.signInWithPassword(
      normalizedIdentifier,
      password,
      appRole,
    );
    if (!error) notifyMockAuthChanged();
    return { data: null as unknown, error };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedIdentifier,
      password,
    });
    return { data, error };
  } catch (error) {
    // Fallback robuste pour les comptes démo quand Supabase n'est pas accessible localement.
    // Limité au mode développement pour éviter toute activation accidentelle en production.
    if (import.meta.env.DEV && isDemoAccount(normalizedIdentifier) && isSupabaseNetworkError(error)) {
      enableDemoAuthFallback();
      const { error: mockError } = mockAuthService.signInWithPassword(
        normalizedIdentifier,
        password,
        appRole ?? roleFromDemoEmail(normalizedIdentifier),
      );
      if (!mockError) notifyMockAuthChanged();
      return { data: null as unknown, error: mockError };
    }
    return {
      data: null as unknown,
      error: error instanceof Error ? error : new Error("Erreur de connexion."),
    };
  }
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
  try {
    await clearBiometricLockStorage();
  } catch {
    /* non bloquant */
  }
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Envoi d’un email de réinitialisation du mot de passe.
 */
export async function requestPasswordReset(email: string, redirectTo: string) {
  const normalizedEmail = email.trim();
  return supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
}

/**
 * Mise à jour du mot de passe de la session courante (flux recovery).
 */
export async function updateCurrentUserPassword(password: string) {
  return supabase.auth.updateUser({ password });
}
