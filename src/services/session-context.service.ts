import {
  SessionContextRepository,
  type FlotteContextRow,
  type ProfilContextRow,
  type UserSessionContextRpc,
} from '@/repositories/session-context.repository';

export type { FlotteContextRow as FlotteContext, ProfilContextRow as ProfilContext };
export type SessionRoute = 'dashboard' | 'start' | 'auth' | 'loading';

export interface SessionContextResult {
  route: SessionRoute;
  active_fleet_id: string | null;
  profil: ProfilContextRow | null;
  flottes: FlotteContextRow[];
  currentFleet: FlotteContextRow | null;
}

/**
 * Service — agrégation du contexte session (sans appel Supabase direct).
 */
export class SessionContextService {
  constructor(private repository: SessionContextRepository) {}

  buildContext(raw: UserSessionContextRpc): SessionContextResult {
    const flottes = raw.flottes ?? [];
    const currentFleet =
      flottes.find((f) => f.fleet_id === raw.active_fleet_id) ?? flottes[0] ?? null;

    return {
      route: raw.route,
      active_fleet_id: raw.active_fleet_id,
      profil: raw.profil,
      flottes,
      currentFleet,
    };
  }

  async fetchSessionContext(): Promise<SessionContextResult> {
    const raw = await this.repository.getUserSessionContext();
    return this.buildContext(raw);
  }
}
