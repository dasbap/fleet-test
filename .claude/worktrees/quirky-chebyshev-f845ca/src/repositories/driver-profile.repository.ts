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
          user_id,
          full_name,
          phone,
          employee_code,
          hire_date,
          contract_type,
          employment_status,
          emergency_contact_name,
          emergency_contact_phone,
          rh_notes,
          created_at
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
      .select(
        `
        user_id,
        full_name,
        phone,
        employee_code,
        hire_date,
        contract_type,
        employment_status,
        emergency_contact_name,
        emergency_contact_phone,
        rh_notes,
        created_at
      `,
      )
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as DriverProfile;
  }
}
