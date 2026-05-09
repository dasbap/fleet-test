import { supabase } from '@/integrations/supabase/client';

export interface EsambaVerificationRow {
  organisation: boolean;
  flotte: boolean;
  membership_organizer: boolean;
  vehicule_esamba_001: boolean;
  invitation_esamba_2024: boolean;
}

export class EsambaVerificationRepository {
  async verify(): Promise<EsambaVerificationRow | null> {
    const { data, error } = await supabase.rpc('verifier_esamba_2024');
    if (error) {
      console.error('Error verifying esamba data:', error);
      throw new Error(error.message);
    }
    return data && Array.isArray(data) && data.length > 0 ? (data[0] as EsambaVerificationRow) : null;
  }
}
