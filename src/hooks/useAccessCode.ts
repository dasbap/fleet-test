/**
 * Hook React — validation et consommation de codes d'accès E-Samba.
 */

import { useCallback, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AccessCodeRepository } from "@/repositories/access-code.repository";
import { AccessCodeService } from "@/services/access-code.service";
import {
  guessRoleFromCode,
  guessUniverseFromCode,
  CODE_INPUT_MESSAGES,
} from "@/lib/access/accessCodeGuard";
import type {
  AccessCodeValidationResult,
  AccessCodeConsumeResult,
  AccessCodeValidationSuccess,
} from "@/types/access";

type AccessCodeStatus =
  | "idle"
  | "validating"
  | "validated"
  | "consuming"
  | "success"
  | "error";

interface UseAccessCodeState {
  status: AccessCodeStatus;
  errorMessage: string | null;
  validation: AccessCodeValidationSuccess | null;
  consumeResult: AccessCodeConsumeResult | null;
  formatError: string | null;
}

interface UseAccessCodeReturn extends UseAccessCodeState {
  validate: (code: string) => Promise<AccessCodeValidationResult | null>;
  consume: (code: string) => Promise<AccessCodeConsumeResult | null>;
  reset: () => void;
  guessedRole: ReturnType<typeof guessRoleFromCode>;
  guessedUniverse: ReturnType<typeof guessUniverseFromCode>;
}

const INITIAL_STATE: UseAccessCodeState = {
  status: "idle",
  errorMessage: null,
  validation: null,
  consumeResult: null,
  formatError: null,
};

const accessCodeRepository = new AccessCodeRepository();
const accessCodeService = new AccessCodeService(accessCodeRepository);

export function useAccessCode(): UseAccessCodeReturn {
  const { user } = useAuth();
  const [state, setState] = useState<UseAccessCodeState>(INITIAL_STATE);
  const [rawCode, setRawCode] = useState("");

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    setRawCode("");
  }, []);

  const validate = useCallback(async (code: string): Promise<AccessCodeValidationResult | null> => {
    setRawCode(accessCodeService.normalize(code));

    const formatErr = accessCodeService.getFormatError(code);
    if (formatErr) {
      setState((s) => ({ ...s, formatError: formatErr, status: "idle" }));
      return null;
    }

    setState((s) => ({
      ...s,
      status: "validating",
      errorMessage: null,
      formatError: null,
      validation: null,
    }));

    try {
      const result = await accessCodeService.validateCode(code);
      if (!result) {
        setState((s) => ({ ...s, formatError: accessCodeService.getFormatError(code), status: "idle" }));
        return null;
      }

      if (result.valid) {
        setState((s) => ({
          ...s,
          status: "validated",
          validation: result as AccessCodeValidationSuccess,
        }));
      } else {
        setState((s) => ({
          ...s,
          status: "error",
          errorMessage: result.message,
        }));
      }

      return result;
    } catch {
      setState((s) => ({
        ...s,
        status: "error",
        errorMessage: CODE_INPUT_MESSAGES.networkError,
      }));
      return null;
    }
  }, []);

  const consume = useCallback(
    async (code: string): Promise<AccessCodeConsumeResult | null> => {
      if (!user?.id) {
        setState((s) => ({
          ...s,
          status: "error",
          errorMessage: "Vous devez être connecté pour utiliser un code d'accès.",
        }));
        return null;
      }

      const formatErr = accessCodeService.getFormatError(code);
      if (formatErr) {
        setState((s) => ({ ...s, formatError: formatErr }));
        return null;
      }

      setState((s) => ({
        ...s,
        status: "consuming",
        errorMessage: null,
        formatError: null,
      }));

      try {
        const result = await accessCodeService.consumeCode(code, user.id);
        if (!result) {
          setState((s) => ({ ...s, formatError: accessCodeService.getFormatError(code) }));
          return null;
        }

        if (result.valid) {
          setState((s) => ({
            ...s,
            status: "success",
            consumeResult: result,
            errorMessage: null,
          }));
        } else {
          setState((s) => ({
            ...s,
            status: "error",
            errorMessage: result.message,
          }));
        }

        return result;
      } catch {
        setState((s) => ({
          ...s,
          status: "error",
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
    guessedRole: guessRoleFromCode(rawCode),
    guessedUniverse: guessUniverseFromCode(rawCode),
  };
}
