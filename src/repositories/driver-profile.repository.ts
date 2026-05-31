import { supabase } from '@/integrations/supabase/client';

export interface DriverProfile {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  employee_code: string | null;
  hire_date: string | null;
  contract_type: 'cdi' | 'cdd' | 'interim' | 'consultant' | 'other' | null;
  employment_status: 'active' | 'suspended' | 'inactive' | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  rh_notes: string | null;
  created_at: string;
}

export interface DriverProfileUpdate {
  full_name?: string | null;
  phone?: string | null;
  employee_code?: string | null;
  hire_date?: string | null;
  contract_type?: 'cdi' | 'cdd' | 'interim' | 'consultant' | 'other' | null;
  employment_status?: 'active' | 'suspended' | 'inactive' | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  rh_notes?: string | null;
}

/** Colonnes garanties sur tous les environnements Supabase déployés. */
const PROFILE_CORE_COLUMNS = `
  user_id,
  full_name,
  phone,
  created_at
`;

export class DriverProfileRepository {
  async findByDriverAndFleet(driverUserId: string, fleetId: string): Promise<DriverProfile | null> {
    const { data, error } = await supabase
      .from('flotte_adhesions')
      .select(
        `
        user_id,
        role,
        is_active,
        profile:profils!flotte_adhesions_user_id_fkey(
          ${PROFILE_CORE_COLUMNS}
        )
      `,
      )
      .eq('fleet_id', fleetId)
      .eq('user_id', driverUserId)
      .eq('role', 'driver')
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const profile = (data as { profile?: DriverProfile | null } | null)?.profile;
    return profile ?? null;
  }

  async updateByDriverId(driverUserId: string, updates: DriverProfileUpdate): Promise<DriverProfile> {
    const { data, error } = await supabase
      .from('profils')
      .update(updates)
      .eq('user_id', driverUserId)
      .select(PROFILE_CORE_COLUMNS)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return data as DriverProfile;
    }

    // Profil absent (edge signup) — création minimale pour le conducteur connecté
    const { data: inserted, error: insertError } = await supabase
      .from('profils')
      .insert({ user_id: driverUserId, ...updates })
      .select(PROFILE_CORE_COLUMNS)
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    return inserted as DriverProfile;
  }
}
