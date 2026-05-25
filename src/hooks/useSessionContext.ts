/**
 * Contexte de session post-login — passe par SessionContextService (RPC unique).
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SessionContextRepository } from '@/repositories/session-context.repository';
import {
  SessionContextService,
  type FlotteContext,
  type ProfilContext,
  type SessionContextResult,
  type SessionRoute,
} from '@/services/session-context.service';

export type { FlotteContext, ProfilContext, SessionRoute };

export type SessionContext = SessionContextResult;

const sessionContextRepository = new SessionContextRepository();
const sessionContextService = new SessionContextService(sessionContextRepository);

const INITIAL: SessionContext = {
  route: 'loading',
  active_fleet_id: null,
  profil: null,
  flottes: [],
  currentFleet: null,
};

export function useSessionContext() {
  const [context, setContext] = useState<SessionContext>(INITIAL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContext = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setContext({ ...INITIAL, route: 'auth' });
        return;
      }

      const built = await sessionContextService.fetchSessionContext();
      setContext(built);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : 'Erreur de chargement du contexte';
      setError(message);
      setContext({ ...INITIAL, route: 'auth' });
    } finally {
      setLoading(false);
    }
  }, []);

  const setActiveFleet = useCallback((fleetId: string) => {
    setContext((prev) => {
      const fleet = prev.flottes.find((f) => f.fleet_id === fleetId) ?? null;
      return { ...prev, active_fleet_id: fleetId, currentFleet: fleet };
    });
  }, []);

  useEffect(() => {
    void fetchContext();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') void fetchContext();
      if (event === 'SIGNED_OUT') setContext({ ...INITIAL, route: 'auth' });
    });
    return () => subscription.unsubscribe();
  }, [fetchContext]);

  return { context, loading, error, refetch: fetchContext, setActiveFleet };
}
