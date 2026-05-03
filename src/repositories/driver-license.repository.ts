import { supabase } from '@/integrations/supabase/client';

export type DriverLicenseVerificationStatus = 'pending' | 'verified' | 'rejected' | 'expired';

export interface DriverLicense {
  id: string;
  fleet_id: string;
  driver_user_id: string;
  license_number: string;
  license_category: string;
  issued_at: string | null;
  expires_at: string | null;
  issuing_country: string;
  verification_status: DriverLicenseVerificationStatus;
  document_url: string | null;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DriverLicenseInsert {
  fleet_id: string;
  driver_user_id: string;
  license_number: string;
  license_category: string;
  issued_at?: string | null;
  expires_at?: string | null;
  issuing_country?: string;
  document_url?: string | null;
}

export interface DriverLicenseUpdate {
  license_number?: string;
  license_category?: string;
  issued_at?: string | null;
  expires_at?: string | null;
  issuing_country?: string;
  verification_status?: DriverLicenseVerificationStatus;
  document_url?: string | null;
}

export class DriverLicenseRepository {
  async findByDriverAndFleet(driverUserId: string, fleetId: string): Promise<DriverLicense[]> {
    const { data, error } = await supabase
      .from('driver_licenses')
      .select('*')
      .eq('fleet_id', fleetId)
      .eq('driver_user_id', driverUserId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []) as DriverLicense[];
  }

  async create(input: DriverLicenseInsert): Promise<DriverLicense> {
    const { data, error } = await supabase
      .from('driver_licenses')
      .insert({
        fleet_id: input.fleet_id,
        driver_user_id: input.driver_user_id,
        license_number: input.license_number,
        license_category: input.license_category,
        issued_at: input.issued_at ?? null,
        expires_at: input.expires_at ?? null,
        issuing_country: input.issuing_country ?? 'CM',
        document_url: input.document_url ?? null,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as DriverLicense;
  }

  async update(id: string, updates: DriverLicenseUpdate): Promise<DriverLicense> {
    const { data, error } = await supabase
      .from('driver_licenses')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as DriverLicense;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('driver_licenses').delete().eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
  }

  /** Permis expirant dans les prochains `withinDays` jours (ou déjà expirés). */
  async findExpiringByFleet(fleetId: string, withinDays = 30): Promise<DriverLicense[]> {
    const today = new Date().toISOString().slice(0, 10);
    const horizon = new Date(Date.now() + withinDays * 86_400_000).toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('driver_licenses')
      .select('*')
      .eq('fleet_id', fleetId)
      .not('expires_at', 'is', null)
      .lte('expires_at', horizon)
      .order('expires_at', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []) as DriverLicense[];
  }
}
