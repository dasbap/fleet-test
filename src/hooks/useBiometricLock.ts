import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { NativeBiometricAuthError } from "@/lib/biometric/native-biometric-codes";
import {
  BIOMETRIC_MAX_PIN_ATTEMPTS,
  clearBiometricLockStorage,
  getBiometricDisplayLabel,
  isBiometricLockEnabledForUser,
  isNativeBiometricHardwareAvailable,
  promptNativeBiometricUnlock,
  resumeSupabaseSessionFromVault,
  shouldUseBiometricLock,
  verifyStoredPin,
} from "@/services/biometric-lock.service";
import { isNativeExternalActivityResumeGraceActive } from "@/lib/native/nativeLifecycleGuards";

export type BiometricLockAuthState =
  | "idle"
  | "prompting"
  | "success"
  | "failed"
  | "pin";

interface UseBiometricLockOptions {
  /** Session Supabase courante ; null si déconnecté. */
  session: Session | null;
  /** Chargement initial du provider auth. */
  authLoading: boolean;
  /** Après déverrouillage réussi (session rafraîchie). */
  onUnlocked: (session: Session) => void;
  /** Trop d’échecs PIN ou session invalide : déconnexion. */
  onForceSignOut: () => void | Promise<void>;
}

export function shouldArmBiometricLockOnAppResume({
  fromBackground,
  hasSession,
  userId,
  nativeExternalActivityResumeGraceActive,
}: {
  fromBackground: boolean;
  hasSession: boolean;
  userId: string | null;
  nativeExternalActivityResumeGraceActive: boolean;
}): boolean {
  if (!fromBackground || !hasSession) return false;
  if (!userId) return false;
  return !nativeExternalActivityResumeGraceActive;
}

function parseErrorCode(error: unknown): number | undefined {
  const e = error as { code?: string | number };
  if (e?.code === undefined || e?.code === null) return undefined;
  const n = typeof e.code === "number" ? e.code : parseInt(String(e.code), 10);
  return Number.isNaN(n) ? undefined : n;
}

/** Annulation ou choix explicite du PIN — afficher le clavier PIN. */
function isUserChosePinOrCancel(error: unknown): boolean {
  const code = parseErrorCode(error);
  if (
    code === NativeBiometricAuthError.USER_CANCEL ||
    code === NativeBiometricAuthError.USER_FALLBACK ||
    code === NativeBiometricAuthError.SYSTEM_CANCEL
  ) {
    return true;
  }
  const msg = (error as Error | undefined)?.message?.toLowerCase() ?? "";
  if (msg.includes("cancel")) return true;
  if (msg.includes("fallback")) return true;
  return false;
}

/**
 * Verrouillage applicatif biométrique + PIN (app native uniquement).
 */
export function useBiometricLock({
  session,
  authLoading,
  onUnlocked,
  onForceSignOut,
}: UseBiometricLockOptions) {
  const [locked, setLocked] = useState(false);
  const [authState, setAuthState] = useState<BiometricLockAuthState>("idle");
  const [pinAttempts, setPinAttempts] = useState(0);
  const [biometricLabel, setBiometricLabel] = useState("Biométrie");
  const [hardwareOk, setHardwareOk] = useState(false);

  const fromBackgroundRef = useRef(false);
  const hasSessionRef = useRef(false);
  const userIdRef = useRef<string | null>(null);

  const userId = session?.user?.id ?? null;
  userIdRef.current = userId;
  const active = shouldUseBiometricLock() && !!userId;

  useEffect(() => {
    if (!active) {
      setLocked(false);
      return;
    }
    void (async () => {
      setBiometricLabel(await getBiometricDisplayLabel());
      setHardwareOk(await isNativeBiometricHardwareAvailable());
    })();
  }, [active]);

  const armLockIfNeeded = useCallback(async () => {
    if (!active || authLoading || !userId) return;
    const enabled = await isBiometricLockEnabledForUser(userId);
    if (enabled) {
      try {
        if (
          typeof sessionStorage !== "undefined" &&
          sessionStorage.getItem("esamba_biometric_skip_lock_once") === "1"
        ) {
          sessionStorage.removeItem("esamba_biometric_skip_lock_once");
          setLocked(false);
          return;
        }
      } catch {
        /* ignore */
      }
      setLocked(true);
      setAuthState("idle");
      setPinAttempts(0);
    } else {
      setLocked(false);
    }
  }, [active, authLoading, userId]);

  /** Verrou au premier chargement si option activée. */
  useEffect(() => {
    if (!active || authLoading) return;
    void armLockIfNeeded();
  }, [active, authLoading, userId, armLockIfNeeded]);

  /** Déverrouillage quand la session disparaît. */
  useEffect(() => {
    if (!session?.user) {
      setLocked(false);
      setAuthState("idle");
      setPinAttempts(0);
    }
    hasSessionRef.current = !!session?.user;
  }, [session]);

  /** Verrou au retour avant-plan (app native). */
  useEffect(() => {
    if (!active || authLoading) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    void import("@capacitor/app").then(({ App }) => {
      if (cancelled) return;
      void App.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) {
          fromBackgroundRef.current = true;
          return;
        }
        if (
          !shouldArmBiometricLockOnAppResume({
            fromBackground: fromBackgroundRef.current,
            hasSession: hasSessionRef.current,
            userId: userIdRef.current,
            nativeExternalActivityResumeGraceActive: isNativeExternalActivityResumeGraceActive(),
          })
        ) {
          fromBackgroundRef.current = false;
          return;
        }
        fromBackgroundRef.current = false;
        const uid = userIdRef.current;
        void (async () => {
          const enabled = await isBiometricLockEnabledForUser(uid);
          if (enabled) {
            setLocked(true);
            setAuthState("idle");
            setPinAttempts(0);
          }
        })();
      }).then((handle) => {
        cleanup = () => {
          void handle.remove();
        };
      });
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [active, authLoading]);

  const tryBiometric = useCallback(async () => {
    if (!active || !locked) return;
    setAuthState("prompting");
    try {
      await promptNativeBiometricUnlock();
      const next = await resumeSupabaseSessionFromVault();
      setAuthState("success");
      setPinAttempts(0);
      setLocked(false);
      onUnlocked(next);
    } catch (e) {
      const code = parseErrorCode(e);
      if (code === NativeBiometricAuthError.AUTHENTICATION_FAILED) {
        setAuthState("failed");
      } else if (isUserChosePinOrCancel(e)) {
        setAuthState("pin");
      } else {
        setAuthState("failed");
      }
    }
  }, [active, locked, onUnlocked]);

  const submitPin = useCallback(
    async (pin: string) => {
      if (!active || !locked) return false;
      const ok = await verifyStoredPin(pin);
      if (ok) {
        try {
          const next = await resumeSupabaseSessionFromVault();
          setPinAttempts(0);
          setAuthState("success");
          setLocked(false);
          onUnlocked(next);
          return true;
        } catch {
          setAuthState("failed");
          await clearBiometricLockStorage();
          await onForceSignOut();
          return false;
        }
      }
      const nextAttempts = pinAttempts + 1;
      setPinAttempts(nextAttempts);
      if (nextAttempts >= BIOMETRIC_MAX_PIN_ATTEMPTS) {
        await clearBiometricLockStorage();
        await onForceSignOut();
      }
      return false;
    },
    [active, locked, pinAttempts, onUnlocked, onForceSignOut],
  );

  const showPinFallback = useCallback(() => {
    setAuthState("pin");
  }, []);

  const resetFailed = useCallback(() => {
    setAuthState("idle");
  }, []);

  return useMemo(
    () => ({
      /** Afficher l’overlay de verrou. */
      locked,
      /** État du flux de déverrouillage. */
      authState,
      pinAttempts,
      maxPinAttempts: BIOMETRIC_MAX_PIN_ATTEMPTS,
      biometricLabel,
      /** Biométrie forte disponible sur l’appareil. */
      hardwareAvailable: hardwareOk,
      /** Relancer le prompt biométrique. */
      tryBiometric,
      /** Valider le code PIN. */
      submitPin,
      /** Passer manuellement au mode PIN. */
      showPinFallback,
      /** Réinitialiser l’état « échec » pour réessayer. */
      resetFailed,
      /** Actif (native + non mock + utilisateur connecté). */
      biometricLockFeatureActive: active,
    }),
    [
      locked,
      authState,
      pinAttempts,
      biometricLabel,
      hardwareOk,
      tryBiometric,
      submitPin,
      showPinFallback,
      resetFailed,
      active,
    ],
  );
}
