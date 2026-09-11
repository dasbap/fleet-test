import { supabase } from "@/integrations/supabase/client";
import { enableDemoAuthFallback, isMockAuthEnabled } from "@/lib/authMode";
import { signOut as esambaSignOut } from "@/lib/auth/esamba-auth";
import { normalizeLoginRole } from "@/lib/mobile/mobileRoleBridge";
import { mockAuthService } from "@/services/mock-auth.service";
import type { AppRole } from "@/types/auth";

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
  return {
    data: null,
    error: new Error(
      "La creation de compte est reservee a un administrateur E-Samba.",
    ),
  };

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

type PasswordResetError = Error & { status?: number };
type PasswordResetResult = { ok?: boolean; error?: string };

export async function signOut() {
  if (isMockAuthEnabled()) {
    mockAuthService.clearSession();
    notifyMockAuthChanged();
    return { error: null };
  }
  const { error } = await esambaSignOut();
  return { error };
}

export async function requestPasswordReset(email: string, redirectTo: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.functions.invoke("request-password-reset", {
    body: { email: normalizedEmail, redirectTo },
  });

  const payload = (data ?? {}) as PasswordResetResult;
  if (!error && payload.ok === true) return { data: payload, error: null };

  let status: number | undefined;
  let message = payload.error ?? error?.message ?? "password_reset_failed";
  const context = (error as { context?: unknown } | null)?.context;
  if (context instanceof Response) {
    status = context.status;
    const contextPayload = (await context.clone().json().catch(() => null)) as PasswordResetResult | null;
    if (contextPayload?.error) message = contextPayload.error;
  }

  const requestError = new Error(message) as PasswordResetError;
  requestError.status = status;
  return { data: payload, error: requestError };
}

export async function updateCurrentUserPassword(password: string) {
  return supabase.auth.updateUser({ password });
}

export async function sendMagicLink(email: string, redirectTo: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: { emailRedirectTo: redirectTo },
  });
}
