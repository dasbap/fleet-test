import { supabase } from '@/integrations/supabase/client';

export interface FlotteContextRow {
  fleet_id: string;
  fleet_name: string;
  role: 'organizer' | 'manager' | 'driver' | 'mechanic';
  org_id: string;
  org_name: string;
  plan_code: string;
  plan_name: string;
  abo_status: string;
  abo_ends_at: string;
  abo_valid: boolean;
  enables_finance: boolean;
  enables_ai: boolean;
  enables_reports: boolean;
  enables_driver_scoring: boolean;
  max_vehicles: number;
}

export interface ProfilContextRow {
  user_id: string;
  full_name: string;
  phone: string | null;
}

export interface UserSessionContextRpc {
  route: 'dashboard' | 'start' | 'auth';
  active_fleet_id: string | null;
  profil: ProfilContextRow | null;
  flottes: FlotteContextRow[];
}

/**
 * Repository — contexte session post-login (RPC unique).
 */
export class SessionContextRepository {
  async getUserSessionContext(): Promise<UserSessionContextRpc> {
    const { data, error } = await supabase.rpc('get_user_session_context');
    if (error) {
      console.error('Error fetching session context:', error);
      throw new Error(error.message);
    }
    const raw = data as UserSessionContextRpc;
    return {
      route: raw?.route ?? 'auth',
      active_fleet_id: raw?.active_fleet_id ?? null,
      profil: raw?.profil ?? null,
      flottes: raw?.flottes ?? [],
    };
  }
}
