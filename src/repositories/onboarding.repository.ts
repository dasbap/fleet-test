import { supabase } from '@/integrations/supabase/client';
import { formatPostgrestError } from '@/lib/mapSupabaseError';
import type { OnboardingData, OnboardingProgress } from '@/types/onboarding';
import type { VehicleDto } from '@/types/dto/vehicle.dto';

interface OnboardingUpsertPayload {
  org_id: string;
  user_id: string;
  step: 1 | 2 | 3 | 4;
  completed: boolean;
  steps_data: OnboardingData;
  updated_at: string;
}

type PostgrestErrorLike = { code?: string; message?: string; details?: string };

function isMissingRpcFunction(error: PostgrestErrorLike | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === 'PGRST202'
    || msg.includes('could not find the function')
    || msg.includes('sauvegarder_progression_onboarding')
    || msg.includes('finaliser_onboarding')
  );
}

function mentionsUnknownColumn(error: PostgrestErrorLike, column: string): boolean {
  const text = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return text.includes(column.toLowerCase());
}

/** Normalise une ligne DB (colonne legacy `data` ou `steps_data`). */
function normalizeProgressRow(row: Record<string, unknown>): OnboardingProgress {
  const steps_data = (row.steps_data ?? row.data ?? {}) as OnboardingData;
  return { ...(row as OnboardingProgress), steps_data };
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

  /** Repli REST si la RPC n'est pas encore déployée sur le projet Supabase. */
  private async upsertProgressViaRest(payload: OnboardingUpsertPayload): Promise<OnboardingProgress> {
    const base = {
      org_id: payload.org_id,
      user_id: payload.user_id,
      step: payload.step,
      completed: payload.completed,
      updated_at: payload.updated_at,
    };

    const attempt = async (jsonKey: 'steps_data' | 'data') => {
      const row = { ...base, [jsonKey]: payload.steps_data };
      return supabase
        .from('onboarding_progress')
        .upsert(row, { onConflict: 'org_id' })
        .select('*')
        .single();
    };

    let { data, error } = await attempt('steps_data');

    if (error && mentionsUnknownColumn(error, 'steps_data')) {
      ({ data, error } = await attempt('data'));
    }

    if (error) {
      console.error("Erreur lors de la sauvegarde de l'onboarding (REST) :", error);
      throw new Error(formatPostgrestError(error) || error.message);
    }

    return normalizeProgressRow(data as Record<string, unknown>);
  }

  async upsertProgress(payload: OnboardingUpsertPayload): Promise<OnboardingProgress> {
    const { data, error } = await supabase.rpc('sauvegarder_progression_onboarding', {
      p_org_id: payload.org_id,
      p_step: payload.step,
      p_completed: payload.completed,
      p_steps_data: payload.steps_data,
    });

    if (!error) {
      const row = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
      return normalizeProgressRow(row);
    }

    if (isMissingRpcFunction(error)) {
      console.warn(
        "[onboarding] RPC sauvegarder_progression_onboarding absente — exécutez scripts/apply-onboarding-fix-remote.sql sur Supabase.",
      );
      return this.upsertProgressViaRest(payload);
    }

    console.error("Erreur lors de la sauvegarde de l'onboarding (RPC) :", error);
    throw new Error(formatPostgrestError(error) || error.message);
  }

  async markCompleted(orgId: string): Promise<void> {
    const { error } = await supabase.rpc('finaliser_onboarding', {
      p_org_id: orgId,
    });

    if (!error) {
      return;
    }

    if (isMissingRpcFunction(error)) {
      const { error: updateError } = await supabase
        .from('onboarding_progress')
        .update({ completed: true, updated_at: new Date().toISOString() })
        .eq('org_id', orgId);

      if (updateError) {
        console.error("Erreur lors de la finalisation de l'onboarding (REST) :", updateError);
        throw new Error(formatPostgrestError(updateError) || updateError.message);
      }
      return;
    }

    console.error("Erreur lors de la finalisation de l'onboarding (RPC) :", error);
    throw new Error(formatPostgrestError(error) || error.message);
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
    const { data: vehicleId, error: rpcError } = await supabase.rpc('creer_vehicule_esamba', {
      p_fleet_id: payload.fleet_id,
      p_registration: payload.registration,
      p_brand: payload.brand,
      p_model: payload.model || null,
      p_year: null,
      p_current_km: payload.current_km,
    });

    if (rpcError || !vehicleId) {
      console.error('Erreur lors de la création du premier véhicule (RPC) :', rpcError);
      throw new Error(formatPostgrestError(rpcError) || 'Impossible de créer le véhicule.');
    }

    const { data, error } = await supabase
      .from('vehicules')
      .select('*')
      .eq('id', vehicleId as string)
      .single<VehicleDto>();

    if (error) {
      console.error('Erreur lors de la lecture du véhicule créé :', error);
      throw new Error(error.message);
    }

    return data;
  }
}
