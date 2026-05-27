/**
 * Edge Function : session-tracker
 *
 * Appelée côté client juste après une connexion réussie.
 * Récupère le contexte réseau (IP, géoloc), parse le User-Agent,
 * insère/met à jour la session dans user_sessions,
 * et crée une security_notification si c'est un nouvel appareil.
 *
 * Body attendu (JSON) :
 *   { fingerprint: string, supabase_session_id?: string }
 *
 * La requête doit porter le Bearer token JWT de l'utilisateur connecté.
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

// ── Parsing User-Agent léger (sans dépendance externe) ────────────────────────

interface ParsedUA {
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  browser:    string;
  os:         string;
}

function parseUserAgent(ua: string): ParsedUA {
  const isMobile  = /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet  = /iPad|Tablet|PlayBook/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua));
  const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : /Win|Mac|Linux|X11/i.test(ua) ? 'desktop' : 'unknown';

  // Navigateur
  let browser = 'Navigateur inconnu';
  if (/Edg\//i.test(ua))              browser = 'Microsoft Edge';
  else if (/OPR\//i.test(ua))         browser = 'Opera';
  else if (/SamsungBrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/Chrome\/\d/i.test(ua))    browser = 'Chrome';
  else if (/Firefox\/\d/i.test(ua))   browser = 'Firefox';
  else if (/Safari\/\d/i.test(ua))    browser = 'Safari';

  // OS
  let os = 'OS inconnu';
  if (/Windows NT 10/i.test(ua))      os = 'Windows 10/11';
  else if (/Windows NT/i.test(ua))    os = 'Windows';
  else if (/iPhone OS (\d+)/i.test(ua)) {
    const v = ua.match(/iPhone OS (\d+)/i)?.[1] ?? '';
    os = `iOS ${v}`;
  } else if (/iPad.*OS (\d+)/i.test(ua)) {
    const v = ua.match(/iPad.*OS (\d+)/i)?.[1] ?? '';
    os = `iPadOS ${v}`;
  } else if (/Android (\d+)/i.test(ua)) {
    const v = ua.match(/Android (\d+)/i)?.[1] ?? '';
    os = `Android ${v}`;
  } else if (/Mac OS X/i.test(ua))    os = 'macOS';
  else if (/Linux/i.test(ua))         os = 'Linux';

  // Nom lisible de l'appareil
  let deviceName = `${browser} sur ${os}`;
  if (/iPhone/i.test(ua))    deviceName = `iPhone — ${browser}`;
  else if (/iPad/i.test(ua)) deviceName = `iPad — ${browser}`;
  else if (/Samsung/i.test(ua) || /SM-/i.test(ua)) deviceName = `Samsung — ${browser}`;
  else if (isTablet)         deviceName = `Tablette — ${browser}`;
  else if (isMobile)         deviceName = `Mobile — ${browser}`;

  return { deviceName, deviceType, browser, os };
}

// ── Géolocalisation IP via ip-api.com (gratuit, 45 req/min) ──────────────────

interface GeoResult {
  city:        string;
  region:      string;
  countryCode: string;
  countryName: string;
}

async function geolocateIp(ip: string): Promise<GeoResult> {
  const fallback: GeoResult = { city: '', region: '', countryCode: '', countryName: '' };
  // Ignorer les IPs privées / loopback
  if (!ip || /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::1|localhost)/.test(ip)) {
    return fallback;
  }
  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,city,regionName,countryCode,country&lang=fr`,
      { signal: AbortSignal.timeout(2000) },
    );
    if (!res.ok) return fallback;
    const data = await res.json() as Record<string, string>;
    if (data.status !== 'success') return fallback;
    return {
      city:        data.city        ?? '',
      region:      data.regionName  ?? '',
      countryCode: data.countryCode ?? '',
      countryName: data.country     ?? '',
    };
  } catch {
    return fallback;
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  const CORS = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== 'POST')   return new Response('Method not allowed', { status: 405, headers: CORS });

  // Récupérer l'IP réelle (Vercel / CDN forwarding)
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    '';

  const userAgent = req.headers.get('user-agent') ?? '';
  const auth      = req.headers.get('authorization');
  if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });

  // Body
  let body: { fingerprint?: string; supabase_session_id?: string } = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const fingerprint = body.fingerprint ?? `${userAgent}:${ip}`;

  // Client Supabase avec le token utilisateur
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { authorization: auth } } },
  );
  // Admin client pour insérer sans RLS
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
  }

  // Parse UA + géoloc en parallèle
  const [parsed, geo] = await Promise.all([
    Promise.resolve(parseUserAgent(userAgent)),
    geolocateIp(ip),
  ]);

  // Appel RPC track_session
  const { data, error } = await admin.rpc('track_session', {
    p_user_id:              user.id,
    p_fingerprint:          fingerprint,
    p_device_name:          parsed.deviceName,
    p_device_type:          parsed.deviceType,
    p_browser:              parsed.browser,
    p_os:                   parsed.os,
    p_ip:                   ip,
    p_city:                 geo.city,
    p_region:               geo.region,
    p_country_code:         geo.countryCode,
    p_country_name:         geo.countryName,
    p_supabase_session_id:  body.supabase_session_id ?? null,
  });

  if (error) {
    console.error('track_session error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS });
  }

  const [row] = data as Array<{ session_id: string; is_new_device: boolean }>;

  // Nouvelle connexion → notification de sécurité
  if (row?.is_new_device) {
    const location = [geo.city, geo.countryName].filter(Boolean).join(', ') || 'localisation inconnue';
    await admin.from('security_notifications').insert({
      user_id:    user.id,
      session_id: row.session_id,
      type:       'new_device',
      title:      'Nouvelle connexion détectée',
      body:       `${parsed.deviceName} — ${location}. Si ce n'est pas vous, déconnectez cet appareil.`,
    });
  }

  return new Response(
    JSON.stringify({ ok: true, sessionId: row?.session_id, isNewDevice: row?.is_new_device }),
    { status: 200, headers: { ...corsHeaders(req), 'content-type': 'application/json' } },
  );
});
