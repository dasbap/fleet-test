import { AccessCodeRepository } from "@/repositories/access-code.repository";
import { normalizeCode, validateCodeFormat } from "@/lib/access/accessCodeGuard";
import type {
  AccessCodeConsumeResult,
  AccessCodeValidationResult,
} from "@/types/access";

/**
 * Logique métier codes d'accès.
 */
export class AccessCodeService {
  constructor(private repository: AccessCodeRepository) {}

  async validateCode(rawCode: string): Promise<AccessCodeValidationResult | null> {
    const normalized = normalizeCode(rawCode);
    const formatErr = validateCodeFormat(normalized);
    if (formatErr) {
      return null;
    }
    return this.repository.validate(normalized);
  }

  async consumeCode(rawCode: string, userId: string): Promise<AccessCodeConsumeResult | null> {
    if (!userId) {
      throw new Error("L'identifiant utilisateur est requis");
    }

    const normalized = normalizeCode(rawCode);
    const formatErr = validateCodeFormat(normalized);
    if (formatErr) {
      return null;
    }

    return this.repository.consume(normalized, userId);
  }

  normalize(rawCode: string): string {
    return normalizeCode(rawCode);
  }

  getFormatError(rawCode: string): string | null {
    return validateCodeFormat(normalizeCode(rawCode));
  }
}
