import { supabase } from "@/integrations/supabase/client";
import type {
  AccessCodeConsumeResult,
  AccessCodeValidationResult,
} from "@/types/access";

/**
 * Accès RPC codes d'accès (validate / consume).
 */
export class AccessCodeRepository {
  async validate(code: string): Promise<AccessCodeValidationResult> {
    const { data, error } = await supabase.rpc("access_code_validate", {
      p_code: code,
    });

    if (error) {
      console.error("Erreur access_code_validate:", error);
      throw new Error(error.message);
    }

    return data as AccessCodeValidationResult;
  }

  async consume(code: string, userId: string): Promise<AccessCodeConsumeResult> {
    const { data, error } = await supabase.rpc("access_code_consume", {
      p_code: code,
      p_user_id: userId,
    });

    if (error) {
      console.error("Erreur access_code_consume:", error);
      throw new Error(error.message);
    }

    return data as AccessCodeConsumeResult;
  }
}
