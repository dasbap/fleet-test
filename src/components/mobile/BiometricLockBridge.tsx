import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBiometricLock } from "@/hooks/useBiometricLock";
import { signOut } from "@/lib/auth-actions";
import { BiometricLockOverlay } from "@/components/mobile/BiometricLockOverlay";

/**
 * Verrou biométrique natif : monté sous AuthProvider, sans impact navigateur web.
 */
export function BiometricLockBridge() {
  const navigate = useNavigate();
  const { session, isLoading } = useAuth();
  const promptStartedRef = useRef(false);

  const {
    locked,
    authState,
    pinAttempts,
    maxPinAttempts,
    biometricLabel,
    tryBiometric,
    submitPin,
    showPinFallback,
    resetFailed,
    biometricLockFeatureActive,
  } = useBiometricLock({
    session,
    authLoading: isLoading,
    onUnlocked: () => {
      /* La session est déjà synchronisée via supabase.auth.refreshSession → onAuthStateChange */
    },
    onForceSignOut: async () => {
      await signOut();
      navigate("/", { replace: true });
    },
  });

  useEffect(() => {
    if (!locked) {
      promptStartedRef.current = false;
    }
  }, [locked]);

  useEffect(() => {
    if (!locked || authState !== "idle") {
      return;
    }
    if (promptStartedRef.current) return;
    promptStartedRef.current = true;
    void tryBiometric();
  }, [locked, authState, tryBiometric]);

  if (!biometricLockFeatureActive) {
    return null;
  }
  if (!locked) {
    return null;
  }

  const handleReset = () => {
    promptStartedRef.current = false;
    resetFailed();
  };

  return (
    <BiometricLockOverlay
      biometricLabel={biometricLabel}
      authState={authState}
      pinAttempts={pinAttempts}
      maxPinAttempts={maxPinAttempts}
      onBiometric={tryBiometric}
      onSubmitPin={submitPin}
      onShowPin={showPinFallback}
      onRetry={handleReset}
    />
  );
}
