import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { hashPin } from "@/lib/biometric/pinHash";
import { isMockAuthEnabled } from "@/lib/authMode";
import { isNativePlatform } from "@/lib/platform";

/** Identifiant serveur pour le stockage Keychain/Keystore du plugin. */
export const BIOMETRIC_CREDENTIAL_SERVER = "com.esamba.flotte.biometric.v1";

const CREDENTIAL_USERNAME = "supabase_refresh";

const PREF_ENABLED = "esamba_biometric_lock_enabled";
const PREF_USER_ID = "esamba_biometric_lock_user_id";
const PREF_PIN_HASH = "esamba_biometric_pin_hash";

/** Nombre max. de tentatives PIN avant réinitialisation du verrou et déconnexion. */
export const BIOMETRIC_MAX_PIN_ATTEMPTS = 5;

export function shouldUseBiometricLock(): boolean {
  return isNativePlatform() && !isMockAuthEnabled();
}

async function ensurePreferences() {
  const { Preferences } = await import("@capacitor/preferences");
  return Preferences;
}

let nativeBiometricModule: typeof import("@capgo/capacitor-native-biometric") | null = null;

async function ensureNativeBiometricModule() {
  if (!nativeBiometricModule) {
    nativeBiometricModule = await import("@capgo/capacitor-native-biometric");
  }
  return nativeBiometricModule;
}

export async function getBiometricDisplayLabel(): Promise<string> {
  if (!shouldUseBiometricLock()) return "Biométrie";
  try {
    const { NativeBiometric, BiometryType } = await ensureNativeBiometricModule();
    const res = await NativeBiometric.isAvailable({ useFallback: false });
    switch (res.biometryType) {
      case BiometryType.FACE_ID:
      case BiometryType.FACE_AUTHENTICATION:
        return "Face ID";
      case BiometryType.FINGERPRINT:
        return "Empreinte";
      case BiometryType.TOUCH_ID:
        return "Touch ID";
      case BiometryType.IRIS_AUTHENTICATION:
        return "Iris";
      default:
        return "Biométrie";
    }
  } catch {
    return "Biométrie";
  }
}

export async function isNativeBiometricHardwareAvailable(): Promise<boolean> {
  if (!shouldUseBiometricLock()) return false;
  try {
    const { NativeBiometric } = await ensureNativeBiometricModule();
    const res = await NativeBiometric.isAvailable({ useFallback: false });
    return res.isAvailable && res.strongBiometryIsAvailable;
  } catch {
    return false;
  }
}

export async function isBiometricLockEnabledForUser(userId: string): Promise<boolean> {
  if (!shouldUseBiometricLock()) return false;
  const prefs = await ensurePreferences();
  const [{ value: en }, { value: uid }] = await Promise.all([
    prefs.get({ key: PREF_ENABLED }),
    prefs.get({ key: PREF_USER_ID }),
  ]);
  return en === "true" && uid === userId;
}

export async function isCredentialSavedInVault(): Promise<boolean> {
  if (!shouldUseBiometricLock()) return false;
  try {
    const { NativeBiometric } = await ensureNativeBiometricModule();
    const { isSaved } = await NativeBiometric.isCredentialsSaved({
      server: BIOMETRIC_CREDENTIAL_SERVER,
    });
    return isSaved;
  } catch {
    return false;
  }
}

/**
 * Active le verrou : enregistre le refresh token dans le coffre natif et le PIN (haché) en préférences.
 */
export async function enableBiometricLock(
  userId: string,
  refreshToken: string,
  pin: string,
): Promise<void> {
  if (!shouldUseBiometricLock()) {
    throw new Error("Verrou biométrique indisponible sur cette plateforme.");
  }
  const { NativeBiometric, AccessControl } = await ensureNativeBiometricModule();
  const prefs = await ensurePreferences();
  const salt = crypto.randomUUID();
  const hashed = await hashPin(pin, salt);
  await NativeBiometric.setCredentials({
    username: CREDENTIAL_USERNAME,
    password: refreshToken,
    server: BIOMETRIC_CREDENTIAL_SERVER,
    accessControl: AccessControl.NONE,
  });
  await prefs.set({ key: PREF_PIN_HASH, value: `${hashed}:${salt}` });
  await prefs.set({ key: PREF_ENABLED, value: "true" });
  await prefs.set({ key: PREF_USER_ID, value: userId });
}

/**
 * Désactive le verrou et supprime les secrets locaux.
 */
export async function disableBiometricLock(): Promise<void> {
  if (!shouldUseBiometricLock()) return;
  const prefs = await ensurePreferences();
  try {
    const { NativeBiometric } = await ensureNativeBiometricModule();
    await NativeBiometric.deleteCredentials({ server: BIOMETRIC_CREDENTIAL_SERVER });
  } catch {
    /* ignore */
  }
  await prefs.remove({ key: PREF_PIN_HASH });
  await prefs.remove({ key: PREF_ENABLED });
  await prefs.remove({ key: PREF_USER_ID });
}

/** Appelé à la déconnexion pour nettoyer le matériel même si le toggle n’a pas été utilisé. */
export async function clearBiometricLockStorage(): Promise<void> {
  await disableBiometricLock();
}

/**
 * Prompt biométrique natif (sans lecture du jeton).
 */
export async function promptNativeBiometricUnlock(): Promise<void> {
  const { NativeBiometric } = await ensureNativeBiometricModule();
  await NativeBiometric.verifyIdentity({
    reason: "Déverrouiller Flotte E-Samba",
    title: "Flotte E-Samba",
    negativeButtonText: "Utiliser le code PIN",
    fallbackTitle: "Code PIN",
    useFallback: true,
    maxAttempts: 5,
  });
}

/**
 * Relit le refresh token, rafraîchit la session Supabase et met à jour le coffre avec le nouveau jeton.
 */
export async function resumeSupabaseSessionFromVault(): Promise<Session> {
  const { NativeBiometric, AccessControl } = await ensureNativeBiometricModule();
  const { password: refreshToken } = await NativeBiometric.getCredentials({
    server: BIOMETRIC_CREDENTIAL_SERVER,
  });
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });
  if (error || !data.session) {
    throw new Error(error?.message ?? "Impossible de restaurer la session.");
  }
  await NativeBiometric.setCredentials({
    username: CREDENTIAL_USERNAME,
    password: data.session.refresh_token,
    server: BIOMETRIC_CREDENTIAL_SERVER,
    accessControl: AccessControl.NONE,
  });
  return data.session;
}

export async function verifyStoredPin(pin: string): Promise<boolean> {
  const prefs = await ensurePreferences();
  const { value } = await prefs.get({ key: PREF_PIN_HASH });
  if (!value) return false;
  const parts = value.split(":");
  const storedHash = parts[0];
  const salt = parts[1];
  if (!storedHash || !salt) return false;
  const inputHash = await hashPin(pin, salt);
  return inputHash === storedHash;
}
