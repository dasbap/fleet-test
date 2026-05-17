/**
 * Hook React — validation et consommation de codes d'accès E-Samba.
 *
 * Cycle :
 *   idle → validating → validated → consuming → success | error
 *
 * La validation (validate) vérifie le code sans le consommer.
 * La consommation (consume) lie le code à l'utilisateur connecté et crée son profil.
 */

import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  validateCodeFormat,
  normalizeCode,
  guessRoleFromCode,
  guessUniverseFromCode,
  CODE_INPUT_MESSAGES,
} from "@/lib/access/accessCodeGuard";
import type {
  AccessCodeValidationResult,
  AccessCodeConsumeResult,
  AccessCodeValidationSuccess,
} from "@/types/access";

// ─── Types locaux ─────────────────────────────────────────────────────────────

type AccessCodeStatus =
  | "idle"
  | "validating"
  | "validated"
  | "consuming"
  | "success"
  | "error";

interface UseAccessCodeState {
  status:        AccessCodeStatus;
  /** Message d'erreur en français, ou null si pas d'erreur. */
  errorMessage:  string | null;
  /** Résultat de la validation serveur (après validate()). */
  validation:    AccessCodeValidationSuccess | null;
  /** Résultat de la consommation (après consume()). */
  consumeResult: AccessCodeConsumeResult | null;
  /** Erreur de format locale (avant appel réseau). */
  formatError:   string | null;
}

interface UseAccessCodeReturn extends UseAccessCodeState {
  /** Valide le code sans le consommer (pré-visualisation). */
  validate: (code: string) => Promise<AccessCodeValidationResult | null>;
  /** Consomme le code et crée le profil de l'utilisateur connecté. */
  consume:  (code: string) => Promise<AccessCodeConsumeResult | null>;
  /** Réinitialise l'état du hook. */
  reset:    () => void;
  /** Rôle probable déduit du préfixe (avant validation serveur). */
  guessedRole:    ReturnType<typeof guessRoleFromCode>;
  guessedUniverse: ReturnType<typeof guessUniverseFromCode>;
}

// ─── État initial ─────────────────────────────────────────────────────────────

const INITIAL_STATE: UseAccessCodeState = {
  status:        "idle",
  errorMessage:  null,
  validation:    null,
  consumeResult: null,
  formatError:   null,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAccessCode(): UseAccessCodeReturn {
  const { user } = useAuth();
  const [state, setState] = useState<UseAccessCodeState>(INITIAL_STATE);
  const [rawCode, setRawCode] = useState("");

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    setRawCode("");
  }, []);

  // ── Validation (sans consommation) ──────────────────────────────────────────

  const validate = useCallback(
    async (code: string): Promise<AccessCodeValidationResult | null> => {
      const normalized = normalizeCode(code);
      setRawCode(normalized);

      // Pré-validation locale de format
      const formatErr = validateCodeFormat(normalized);
      if (formatErr) {
        setState((s) => ({ ...s, formatError: formatErr, status: "idle" }));
        return null;
      }

      setState((s) => ({
        ...s,
        status:      "validating",
        errorMessage: null,
        formatError:  null,
        validation:   null,
      }));

      try {
        const { data, error } = await supabase.rpc("access_code_validate", {
          p_code: normalized,
        });

        if (error) throw error;

        const result = data as AccessCodeValidationResult;

        if (result.valid) {
          setState((s) => ({
            ...s,
            status:     "validated",
            validation: result as AccessCodeValidationSuccess,
          }));
        } else {
          setState((s) => ({
            ...s,
            status:       "error",
            errorMessage: result.message,
          }));
        }

        return result;
      } catch {
        setState((s) => ({
          ...s,
          status:       "error",
          errorMessage: CODE_INPUT_MESSAGES.networkError,
        }));
        return null;
      }
    },
    [],
  );

  // ── Consommation ────────────────────────────────────────────────────────────

  const consume = useCallback(
    async (code: string): Promise<AccessCodeConsumeResult | null> => {
      if (!user?.id) {
        setState((s) => ({
          ...s,
          status:       "error",
          errorMessage: "Vous devez être connecté pour utiliser un code d'accès.",
        }));
        return null;
      }

      const normalized = normalizeCode(code);

      // Pré-validation locale
      const formatErr = validateCodeFormat(normalized);
      if (formatErr) {
        setState((s) => ({ ...s, formatError: formatErr }));
        return null;
      }

      setState((s) => ({
        ...s,
        status:       "consuming",
        errorMessage: null,
        formatError:  null,
      }));

      try {
        const { data, error } = await supabase.rpc("access_code_consume", {
          p_code:    normalized,
          p_user_id: user.id,
        });

        if (error) throw error;

        const result = data as AccessCodeConsumeResult;

        if (result.valid) {
          setState((s) => ({
            ...s,
            status:        "success",
            consumeResult: result,
            errorMessage:  null,
          }));
        } else {
          setState((s) => ({
            ...s,
            status:       "error",
            errorMessage: result.message,
          }));
        }

        return result;
      } catch {
        setState((s) => ({
          ...s,
          status:       "error",
          errorMessage: CODE_INPUT_MESSAGES.networkError,
        }));
        return null;
      }
    },
    [user?.id],
  );

  return {
    ...state,
    validate,
    consume,
    reset,
    guessedRole:     guessRoleFromCode(rawCode),
    guessedUniverse: guessUniverseFromCode(rawCode),
  };
}
