import { useEffect, useRef, useState } from "react";
import { Loader2, Fingerprint, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import type { BiometricLockAuthState } from "@/hooks/useBiometricLock";

interface BiometricLockOverlayProps {
  biometricLabel: string;
  authState: BiometricLockAuthState;
  pinAttempts: number;
  maxPinAttempts: number;
  onBiometric: () => void;
  onSubmitPin: (pin: string) => Promise<boolean>;
  onShowPin: () => void;
  onRetry: () => void;
}

/**
 * Écran plein écran : déverrouillage biométrique ou code PIN (app native).
 */
export function BiometricLockOverlay({
  biometricLabel,
  authState,
  pinAttempts,
  maxPinAttempts,
  onBiometric,
  onSubmitPin,
  onShowPin,
  onRetry,
}: BiometricLockOverlayProps) {
  const [pin, setPin] = useState("");
  const submitInFlight = useRef(false);

  useEffect(() => {
    setPin("");
  }, [authState]);

  const showPin = authState === "pin";
  const busy = authState === "prompting";

  const handlePinComplete = async (value: string) => {
    if (value.length !== 4 || submitInFlight.current) return;
    submitInFlight.current = true;
    try {
      await onSubmitPin(value);
    } finally {
      submitInFlight.current = false;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background p-6 text-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="biometric-lock-title"
      aria-describedby="biometric-lock-desc"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Shield className="h-8 w-8" aria-hidden />
      </div>
      <h1 id="biometric-lock-title" className="font-heading text-xl font-semibold">
        Flotte E-Samba
      </h1>
      <p id="biometric-lock-desc" className="mt-2 max-w-sm text-sm text-muted-foreground">
        {showPin
          ? "Saisissez votre code PIN à 4 chiffres pour continuer."
          : `Authentifiez-vous avec ${biometricLabel} pour reprendre votre session.`}
      </p>

      {!showPin ? (
        <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
          <Button
            type="button"
            size="lg"
            className="w-full gap-2"
            onClick={() => void onBiometric()}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <Fingerprint className="h-5 w-5" aria-hidden />
            )}
            {busy ? "Vérification…" : `Utiliser ${biometricLabel}`}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onShowPin}
            disabled={busy}
          >
            Utiliser le code PIN
          </Button>
          {authState === "failed" && (
            <p className="text-sm text-destructive" role="alert">
              Échec de l’authentification. Réessayez ou utilisez le code PIN.
            </p>
          )}
          {authState === "failed" && (
            <Button type="button" variant="outline" onClick={onRetry}>
              Réessayer
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-8 flex w-full max-w-xs flex-col items-center gap-4">
          <InputOTP
            maxLength={4}
            value={pin}
            onChange={(v) => {
              setPin(v);
              if (v.length === 4) void handlePinComplete(v);
            }}
            containerClassName="justify-center gap-2"
            autoFocus
            inputMode="numeric"
            pattern="[0-9]*"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>
          {pinAttempts > 0 && (
            <p className="text-sm text-destructive" role="alert">
              Code incorrect. Tentative {pinAttempts} / {maxPinAttempts}.
            </p>
          )}
          <Button type="button" variant="link" onClick={onRetry}>
            Retour à {biometricLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
