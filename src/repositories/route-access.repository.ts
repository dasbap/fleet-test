import { supabase } from '@/integrations/supabase/client';

interface OnboardingCompletedRow {
  completed: boolean;
}

export class RouteAccessRepository {
  async isOnboardingCompleted(orgId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('completed')
      .eq('org_id', orgId)
      .maybeSingle<OnboardingCompletedRow>();

    if (error) {
      console.error("Erreur lors de la lecture de l'état d'onboarding :", error);
      throw new Error(error.message);
    }

    return Boolean(data?.completed);
  }
}
