import { supabase } from '@/integrations/supabase/client';
import type { OnboardingData, OnboardingProgress } from '@/types/onboarding';
import type { VehicleDto } from '@/types/dto/vehicle.dto';

interface OnboardingUpsertPayload {
  org_id: string;
  user_id: string;
  step: 1 | 2 | 3;
  completed: boolean;
  data: OnboardingData;
  updated_at: string;
}

export class OnboardingRepository {
  async findByOrgId(orgId: string): Promise<OnboardingProgress | null> {
    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('org_id', orgId)
      .maybeSingle();

    if (error) {
      console.error("Erreur lors de la lecture de l'onboarding :", error);
      throw new Error(error.message);
    }

    return (data as OnboardingProgress | null) ?? null;
  }

  async getAuthenticatedUserId(): Promise<string> {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error("Erreur lors de la récupération de l'utilisateur :", error);
      throw new Error(error.message);
    }

    if (!data.user?.id) {
      throw new Error('Utilisateur non connecté.');
    }

    return data.user.id;
  }

  async upsertProgress(payload: OnboardingUpsertPayload): Promise<OnboardingProgress> {
    const { data, error } = await supabase
      .from('onboarding_progress')
      .upsert(payload, { onConflict: 'org_id' })
      .select('*')
      .single();

    if (error) {
      console.error("Erreur lors de la sauvegarde de l'onboarding :", error);
      throw new Error(error.message);
    }

    return data as OnboardingProgress;
  }

  async markCompleted(orgId: string): Promise<void> {
    const { error } = await supabase
      .from('onboarding_progress')
      .update({ completed: true, updated_at: new Date().toISOString() })
      .eq('org_id', orgId);

    if (error) {
      console.error("Erreur lors de la finalisation de l'onboarding :", error);
      throw new Error(error.message);
    }
  }

  async findFleetIdByOrgId(orgId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('flottes')
      .select('id')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (error) {
      console.error("Erreur lors de la récupération de la flotte de l'organisation :", error);
      throw new Error(error.message);
    }

    return data?.id ?? null;
  }

  async findFirstVehicleByFleetId(fleetId: string): Promise<VehicleDto | null> {
    const { data, error } = await supabase
      .from('vehicules')
      .select('*')
      .eq('fleet_id', fleetId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle<VehicleDto>();

    if (error) {
      console.error('Erreur lors de la lecture du premier véhicule :', error);
      throw new Error(error.message);
    }

    return data ?? null;
  }

  async createVehicleForFleet(payload: {
    fleet_id: string;
    registration: string;
    brand: string;
    model: string;
    current_km: number;
  }): Promise<VehicleDto> {
    const { data, error } = await supabase
      .from('vehicules')
      .insert({
        fleet_id: payload.fleet_id,
        registration: payload.registration,
        brand: payload.brand,
        model: payload.model,
        current_km: payload.current_km,
        status: 'ok',
      })
      .select('*')
      .single<VehicleDto>();

    if (error) {
      console.error('Erreur lors de la création du premier véhicule :', error);
      throw new Error(error.message);
    }

    return data;
  }
}
