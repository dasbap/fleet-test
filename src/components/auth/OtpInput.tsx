/**
 * Saisie OTP — 6 cases individuelles auto-avance.
 *
 * UX :
 *   - Frappe avance automatiquement vers la case suivante
 *   - Backspace revient à la case précédente
 *   - Coller 6 chiffres remplit toutes les cases
 *   - Auto-soumission quand toutes les cases sont remplies
 *   - Shake animé sur erreur
 */

import { useRef, useCallback, useEffect, KeyboardEvent, ClipboardEvent } from 'react';

const OTP_LENGTH = 6;

interface OtpInputProps {
  value:       string;   // Chaîne de 0 à 6 chiffres
  onChange:    (val: string) => void;
  onComplete?: (val: string) => void;
  isLoading?:  boolean;
  hasError?:   boolean;
  className?:  string;
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  isLoading  = false,
  hasError   = false,
  className  = '',
}: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // Focus la première case vide au montage
  useEffect(() => {
    const idx = Math.min(value.length, OTP_LENGTH - 1);
    inputsRef.current[idx]?.focus();
  }, []);

  // Clé dans une case
  const handleKeyDown = useCallback((idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (value[idx]) {
        // Effacer la case courante
        onChange(value.slice(0, idx) + value.slice(idx + 1));
      } else if (idx > 0) {
        // Revenir à la case précédente et l'effacer
        onChange(value.slice(0, idx - 1) + value.slice(idx));
        inputsRef.current[idx - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < OTP_LENGTH - 1) {
      inputsRef.current[idx + 1]?.focus();
    } else if (e.key === 'Enter' && value.length === OTP_LENGTH) {
      onComplete?.(value);
    }
  }, [value, onChange, onComplete]);

  // Frappe dans une case
  const handleChange = useCallback((idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const digit = e.target.value.replace(/\D/g, '').slice(-1);
    if (!digit) return;

    const next = value.slice(0, idx) + digit + value.slice(idx + 1);
    onChange(next);

    if (next.length === OTP_LENGTH) {
      onComplete?.(next);
    } else if (idx < OTP_LENGTH - 1) {
      inputsRef.current[idx + 1]?.focus();
    }
  }, [value, onChange, onComplete]);

  // Coller du texte (ex: depuis SMS)
  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    onChange(pasted.padEnd(OTP_LENGTH, ' ').slice(0, OTP_LENGTH).trimEnd());
    if (pasted.length === OTP_LENGTH) {
      onComplete?.(pasted);
    } else {
      inputsRef.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
    }
  }, [onChange, onComplete]);

  const shakeClass = hasError ? 'animate-[shake_0.4s_ease-in-out]' : '';

  return (
    <div
      className={`flex gap-2 justify-center ${shakeClass} ${className}`}
      role="group"
      aria-label="Code à 6 chiffres"
    >
      {Array.from({ length: OTP_LENGTH }, (_, i) => {
        const digit   = value[i] ?? '';
        const isFocus = !isLoading && i === Math.min(value.length, OTP_LENGTH - 1);

        return (
          <input
            key={i}
            ref={(el) => { inputsRef.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            disabled={isLoading}
            aria-label={`Chiffre ${i + 1}`}
            className={`
              w-11 h-14 text-center text-xl font-bold rounded-xl border-2
              outline-none transition-all caret-transparent select-none
              ${digit
                ? 'border-primary bg-primary/8 text-primary'
                : 'border-input bg-muted/50 text-foreground'}
              ${hasError ? 'border-destructive bg-destructive/8 text-destructive' : ''}
              ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-ring focus:border-primary focus:bg-background focus:shadow-sm'}
            `}
          />
        );
      })}
    </div>
  );
}
