/**
 * Hook — Sessions / appareils connectés.
 *
 * - Liste les sessions actives de l'utilisateur courant
 * - Expose revoke (une session) + revokeAll (toutes sauf courante)
 * - Expose trust (marquer appareil de confiance)
 * - Appelle la Edge Function session-tracker au montage pour enregistrer la session courante
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { rowToSession, type UserSession } from '@/types/device-session';

// ── Fingerprint léger (client-side) ──────────────────────────────────────────

function buildFingerprint(): string {
  const ua     = navigator.userAgent;
  const lang   = navigator.language;
  const tz     = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const screen = `${window.screen.width}x${window.screen.height}`;
  return btoa(`${ua}|${lang}|${tz}|${screen}`).slice(0, 64);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseDeviceSessionsReturn {
  sessions:     UserSession[];
  isLoading:    boolean;
  error:        string | null;
  revoke:       (sessionId: string) => Promise<boolean>;
  revokeAll:    () => Promise<number>;
  trust:        (sessionId: string) => Promise<boolean>;
  refetch:      () => Promise<void>;
}

export function useDeviceSessions(): UseDeviceSessionsReturn {
  const [sessions,  setSessions]  = useState<UserSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  // Enregistre la session courante au montage (best-effort, silencieux)
  useEffect(() => {
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        await supabase.functions.invoke('session-tracker', {
          body: {
            fingerprint:          buildFingerprint(),
            supabase_session_id:  session.access_token,
          },
        });
      } catch { /* silencieux — non bloquant */ }
    })();
  }, []);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: dbErr } = await supabase
        .from('user_sessions')
        .select('*')
        .is('revoked_at', null)
        .order('last_active_at', { ascending: false });

      if (dbErr) throw new Error(dbErr.message);
      setSessions((data ?? []).map((r) => rowToSession(r as Record<string, unknown>)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchSessions(); }, [fetchSessions]);

  const revoke = useCallback(async (sessionId: string): Promise<boolean> => {
    const { data, error: fnErr } = await supabase.functions.invoke<{ ok: boolean }>('revoke-session', {
      body: { sessionId },
    });
    if (fnErr || !data?.ok) return false;
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    return true;
  }, []);

  const revokeAll = useCallback(async (): Promise<number> => {
    const { data, error: fnErr } = await supabase.functions.invoke<{ ok: boolean; revoked: number }>('revoke-session', {
      body: { revokeAll: true },
    });
    if (fnErr || !data?.ok) return 0;
    // Garder uniquement la session courante
    setSessions((prev) => prev.filter((s) => s.isCurrent));
    return data.revoked;
  }, []);

  const trust = useCallback(async (sessionId: string): Promise<boolean> => {
    const { error: dbErr } = await supabase.rpc('trust_session', { p_session_id: sessionId });
    if (dbErr) return false;
    setSessions((prev) =>
      prev.map((s) => s.id === sessionId ? { ...s, isTrusted: true } : s),
    );
    return true;
  }, []);

  return {
    sessions,
    isLoading,
    error,
    revoke,
    revokeAll,
    trust,
    refetch: fetchSessions,
  };
}
