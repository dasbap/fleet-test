/**
 * Edge Function : revoke-session
 *
 * Révoque une session distante et invalide le token Supabase Auth correspondant.
 * Seul le propriétaire du compte peut révoquer ses propres sessions.
 *
 * Body : { sessionId: string } ou { revokeAll: true }
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://www.e-samba.com',
  'https://e-samba.com',
  'https://app.e-samba.com',
  'capacitor://localhost',
  'http://localhost:5173',
  'https://localhost',
];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

Deno.serve(async (req: Request): Promise<Response> => {
  const CORS = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== 'POST')   return new Response('Method not allowed', { status: 405, headers: CORS });

  const auth = req.headers.get('authorization');
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });

  let body: { sessionId?: string; revokeAll?: boolean } = {};
  try { body = await req.json(); } catch { /* ignore */ }

  if (!body.sessionId && !body.revokeAll) {
    return new Response(JSON.stringify({ error: 'sessionId ou revokeAll requis' }), { status: 400, headers: CORS });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { authorization: auth } } },
  );
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
  }

  if (body.revokeAll) {
    // Récupérer tous les supabase_session_id avant de révoquer
    const { data: sessions } = await admin
      .from('user_sessions')
      .select('id, supabase_session_id')
      .eq('user_id', user.id)
      .eq('is_current', false)
      .is('revoked_at', null);

    // Révoquer en DB via RPC
    const { data: revokedCount, error: rpcErr } = await admin.rpc('revoke_all_other_sessions');
    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message }), { status: 500, headers: CORS });
    }

    // Invalider les sessions Supabase Auth correspondantes
    if (sessions && sessions.length > 0) {
      await Promise.allSettled(
        sessions
          .filter((s) => s.supabase_session_id)
          .map((s) => admin.auth.admin.signOut(s.supabase_session_id!, 'others')),
      );
    }

    return new Response(
      JSON.stringify({ ok: true, revoked: revokedCount }),
      { status: 200, headers: { ...corsHeaders(req), 'content-type': 'application/json' } },
    );
  }

  // Révocation d'une session spécifique
  const sessionId = body.sessionId!;

  // Vérifier ownership + récupérer supabase_session_id
  const { data: sessionRow } = await admin
    .from('user_sessions')
    .select('user_id, supabase_session_id, is_current')
    .eq('id', sessionId)
    .single();

  if (!sessionRow || sessionRow.user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Session introuvable ou non autorisée' }), { status: 403, headers: CORS });
  }

  if (sessionRow.is_current) {
    return new Response(
      JSON.stringify({ error: 'Impossible de révoquer la session courante via cet endpoint. Utilisez sign-out.' }),
      { status: 400, headers: CORS },
    );
  }

  // Révoquer en DB
  const { data: ok, error: rpcErr } = await admin.rpc('revoke_session', { p_session_id: sessionId });
  if (rpcErr || !ok) {
    return new Response(JSON.stringify({ error: rpcErr?.message ?? 'Révocation échouée' }), { status: 500, headers: CORS });
  }

  // Invalider le token Supabase Auth si connu
  if (sessionRow.supabase_session_id) {
    try {
      await admin.auth.admin.signOut(sessionRow.supabase_session_id, 'others');
    } catch {
      // Non bloquant — la session DB est déjà révoquée
    }
  }

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: { ...corsHeaders(req), 'content-type': 'application/json' } },
  );
});
