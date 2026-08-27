import { beforeEach, describe, expect, it, vi } from "vitest";

const authModeMock = vi.hoisted(() => ({
  enabled: vi.fn(),
  fallback: vi.fn(),
}));

const supabaseMock = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signInWithOtp: vi.fn(),
}));

const mockAuth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  clearSession: vi.fn(),
}));

const roleMock = vi.hoisted(() => ({ normalize: vi.fn() }));
const esambaMock = vi.hoisted(() => ({ signOut: vi.fn() }));

vi.mock("@/lib/authMode", () => ({
  isMockAuthEnabled: authModeMock.enabled,
  enableDemoAuthFallback: authModeMock.fallback,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: supabaseMock,
  },
}));

vi.mock("@/services/mock-auth.service", () => ({ mockAuthService: mockAuth }));
vi.mock("@/lib/mobile/mobileRoleBridge", () => ({ normalizeLoginRole: roleMock.normalize }));
vi.mock("@/lib/auth/esamba-auth", () => ({ signOut: esambaMock.signOut }));

import {
  MOCK_AUTH_CHANGED_EVENT,
  notifyMockAuthChanged,
  requestPasswordReset,
  sendMagicLink,
  signIn,
  signOut,
  signUp,
  updateCurrentUserPassword,
} from "@/lib/auth-actions";

describe("auth actions coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authModeMock.enabled.mockReturnValue(false);
    roleMock.normalize.mockReturnValue("manager");
    mockAuth.signInWithPassword.mockReturnValue({ error: null });
  });

  it("émet l'événement de changement mock", () => {
    const listener = vi.fn();
    window.addEventListener(MOCK_AUTH_CHANGED_EVENT, listener);
    notifyMockAuthChanged();
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(MOCK_AUTH_CHANGED_EVENT, listener);
  });

  it("connecte via le service mock et normalise l'identifiant", async () => {
    authModeMock.enabled.mockReturnValue(true);
    const listener = vi.fn();
    window.addEventListener(MOCK_AUTH_CHANGED_EVENT, listener);
    await expect(signIn("  USER@EXAMPLE.COM  ", "pass123", "manager")).resolves.toEqual({ data: null, error: null });
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith("USER@EXAMPLE.COM", "pass123", "manager");
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(MOCK_AUTH_CHANGED_EVENT, listener);
  });

  it("n'émet pas l'événement si le login mock échoue", async () => {
    authModeMock.enabled.mockReturnValue(true);
    const error = new Error("invalid");
    mockAuth.signInWithPassword.mockReturnValue({ error });
    const dispatch = vi.spyOn(window, "dispatchEvent");
    await expect(signIn("user@example.com", "bad", "driver")).resolves.toEqual({ data: null, error });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("connecte via Supabase", async () => {
    supabaseMock.signInWithPassword.mockResolvedValue({ data: { session: { id: "s1" } }, error: null });
    await expect(signIn("  user@example.com ", "secret", "driver")).resolves.toEqual({
      data: { session: { id: "s1" } },
      error: null,
    });
    expect(supabaseMock.signInWithPassword).toHaveBeenCalledWith({ email: "user@example.com", password: "secret" });
  });

  it.each([
    ["organizer@esamba.test", "organizer"],
    ["mechanic@esamba.test", "mechanic"],
    ["driver@esamba.test", "driver"],
    ["someone@esamba.test", "manager"],
  ])("bascule en mock démo pour %s", async (email, expectedRole) => {
    roleMock.normalize.mockReturnValue(undefined);
    supabaseMock.signInWithPassword.mockRejectedValue(new Error("Failed to fetch Supabase"));
    await expect(signIn(email, "pass123")).resolves.toEqual({ data: null, error: null });
    expect(authModeMock.fallback).toHaveBeenCalledTimes(1);
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith(email, "pass123", expectedRole);
  });

  it("préserve le rôle explicite lors du fallback démo", async () => {
    roleMock.normalize.mockReturnValue("driver");
    supabaseMock.signInWithPassword.mockRejectedValue("FAILED TO FETCH");
    await signIn("organizer@esamba.test", "pass123", "driver");
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith("organizer@esamba.test", "pass123", "driver");
  });

  it("retourne l'erreur réseau hors compte démo", async () => {
    const error = new Error("Failed to fetch");
    supabaseMock.signInWithPassword.mockRejectedValue(error);
    await expect(signIn("real@example.com", "pass123")).resolves.toEqual({ data: null, error });
    expect(authModeMock.fallback).not.toHaveBeenCalled();
  });

  it("retourne une erreur standard pour une exception non Error", async () => {
    supabaseMock.signInWithPassword.mockRejectedValue({ code: "boom" });
    const result = await signIn("real@example.com", "pass123");
    expect(result.data).toBeNull();
    expect(result.error).toEqual(new Error("Erreur de connexion."));
  });

  it("retourne l'erreur mock du fallback sans événement", async () => {
    roleMock.normalize.mockReturnValue(undefined);
    supabaseMock.signInWithPassword.mockRejectedValue(new Error("failed to fetch"));
    const mockError = new Error("mock rejected");
    mockAuth.signInWithPassword.mockReturnValue({ error: mockError });
    const dispatch = vi.spyOn(window, "dispatchEvent");
    await expect(signIn("driver@esamba.test", "pass123")).resolves.toEqual({ data: null, error: mockError });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("bloque systématiquement l'inscription publique", async () => {
    const result = await signUp("new@example.com", "password", "New User", "fleet-1", "INVITE");
    expect(result.data).toBeNull();
    expect(result.error).toEqual(new Error("La creation de compte est reservee a un administrateur E-Samba."));
    expect(supabaseMock.signUp).not.toHaveBeenCalled();
  });

  it("déconnecte une session mock", async () => {
    authModeMock.enabled.mockReturnValue(true);
    const dispatch = vi.spyOn(window, "dispatchEvent");
    await expect(signOut()).resolves.toEqual({ error: null });
    expect(mockAuth.clearSession).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(esambaMock.signOut).not.toHaveBeenCalled();
  });

  it("déconnecte une session réelle", async () => {
    const error = new Error("remote signout");
    esambaMock.signOut.mockResolvedValue({ error });
    await expect(signOut()).resolves.toEqual({ error });
  });

  it("normalise l'email du reset mot de passe", async () => {
    supabaseMock.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    await requestPasswordReset("  user@example.com  ", "https://app/reset");
    expect(supabaseMock.resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {
      redirectTo: "https://app/reset",
    });
  });

  it("met à jour le mot de passe courant", async () => {
    supabaseMock.updateUser.mockResolvedValue({ data: {}, error: null });
    await updateCurrentUserPassword("new-secret");
    expect(supabaseMock.updateUser).toHaveBeenCalledWith({ password: "new-secret" });
  });

  it("normalise l'email du magic link", async () => {
    supabaseMock.signInWithOtp.mockResolvedValue({ data: {}, error: null });
    await sendMagicLink("  USER@Example.COM  ", "https://app/auth/callback");
    expect(supabaseMock.signInWithOtp).toHaveBeenCalledWith({
      email: "user@example.com",
      options: { emailRedirectTo: "https://app/auth/callback" },
    });
  });
});
