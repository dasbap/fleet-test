import { describe, expect, it, vi, beforeEach } from "vitest";

const mockSetCredentials = vi.fn();
const mockGetCredentials = vi.fn();
const mockDeleteCredentials = vi.fn();
const mockIsCredentialsSaved = vi.fn();
const mockIsAvailable = vi.fn();

vi.mock("@capgo/capacitor-native-biometric", () => ({
  AccessControl: { NONE: 0, BIOMETRY_CURRENT_SET: 1, BIOMETRY_ANY: 2 },
  NativeBiometric: {
    setCredentials: (...a: unknown[]) => mockSetCredentials(...a),
    getCredentials: (...a: unknown[]) => mockGetCredentials(...a),
    deleteCredentials: (...a: unknown[]) => mockDeleteCredentials(...a),
    isCredentialsSaved: (...a: unknown[]) => mockIsCredentialsSaved(...a),
    isAvailable: (...a: unknown[]) => mockIsAvailable(...a),
    verifyIdentity: vi.fn(),
  },
  BiometryType: { FINGERPRINT: 3 },
}));

const prefStore = new Map<string, string>();

vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({
      value: prefStore.get(key) ?? null,
    }),
    set: async ({ key, value }: { key: string; value: string }) => {
      prefStore.set(key, value);
    },
    remove: async ({ key }: { key: string }) => {
      prefStore.delete(key);
    },
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      refreshSession: vi.fn(),
    },
  },
}));

vi.mock("@/lib/platform", () => ({
  isNativePlatform: () => true,
}));

vi.mock("@/lib/authMode", () => ({
  isMockAuthEnabled: () => false,
}));

import { supabase } from "@/integrations/supabase/client";
import {
  BIOMETRIC_CREDENTIAL_SERVER,
  enableBiometricLock,
  resumeSupabaseSessionFromVault,
  verifyStoredPin,
} from "@/services/biometric-lock.service";

describe("biometric-lock.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prefStore.clear();
    mockIsCredentialsSaved.mockResolvedValue({ isSaved: false });
    mockIsAvailable.mockResolvedValue({
      isAvailable: true,
      biometryType: 3,
      strongBiometryIsAvailable: true,
      deviceIsSecure: true,
      authenticationStrength: 1,
    });
  });

  it("enableBiometricLock enregistre le PIN haché et les identifiants", async () => {
    await enableBiometricLock("user-1", "refresh-token-xyz", "4242");
    expect(mockSetCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        server: BIOMETRIC_CREDENTIAL_SERVER,
        password: "refresh-token-xyz",
      }),
    );
    const pinEntry = prefStore.get("esamba_biometric_pin_hash");
    expect(pinEntry).toBeDefined();
    expect(pinEntry).toMatch(/^[a-f0-9]{64}:/);
    expect(prefStore.get("esamba_biometric_lock_enabled")).toBe("true");
    expect(prefStore.get("esamba_biometric_lock_user_id")).toBe("user-1");
  });

  it("resumeSupabaseSessionFromVault rafraîchit et met à jour le jeton", async () => {
    mockGetCredentials.mockResolvedValue({
      username: "supabase_refresh",
      password: "old-refresh",
    });
    vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
      data: {
        session: {
          refresh_token: "new-refresh",
          access_token: "access",
          expires_in: 3600,
          token_type: "bearer",
          user: { id: "u" } as never,
        },
      },
      error: null,
    });

    const session = await resumeSupabaseSessionFromVault();
    expect(session.refresh_token).toBe("new-refresh");
    expect(mockSetCredentials).toHaveBeenCalledWith(
      expect.objectContaining({ password: "new-refresh" }),
    );
  });

  it("verifyStoredPin valide le code", async () => {
    await enableBiometricLock("user-1", "rt", "9999");
    await expect(verifyStoredPin("9999")).resolves.toBe(true);
    await expect(verifyStoredPin("0000")).resolves.toBe(false);
  });
});
