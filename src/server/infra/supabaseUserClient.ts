import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "../env.js";

function decodeBase64UrlJson(segment: string): Record<string, unknown> | null {
  try {
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const json = Buffer.from(padded, "base64").toString("utf8");
    const parsed = JSON.parse(json) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Extrait l'URL du projet Supabase depuis le claim `iss` du JWT utilisateur.
 * La valeur n'est jamais considérée comme authentifiée ici : elle sert uniquement
 * à sélectionner l'endpoint qui vérifiera ensuite le JWT via `auth.getUser()`.
 */
export function getSupabaseUrlFromAccessToken(accessToken: string): string | null {
  const parts = accessToken.split(".");
  if (parts.length !== 3) return null;

  const payload = decodeBase64UrlJson(parts[1]);
  const issuer = typeof payload?.iss === "string" ? payload.iss.trim() : "";
  const match = issuer.match(/^https:\/\/([a-z0-9]{20})\.supabase\.co\/auth\/v1\/?$/i);
  if (!match) return null;

  return `https://${match[1].toLowerCase()}.supabase.co`;
}

/**
 * Client Supabase dont les requêtes s'exécutent avec le JWT utilisateur (RLS identique au navigateur).
 *
 * Pour les requêtes authentifiées, le projet porté par le JWT est prioritaire sur
 * SUPABASE_URL. Cela évite qu'un runtime Vercel mal aligné vérifie une session
 * navigateur contre un autre projet Supabase.
 */
export function createSupabaseUserClient(accessToken: string): SupabaseClient {
  const tokenUrl = getSupabaseUrlFromAccessToken(accessToken);
  const url = tokenUrl ?? getSupabaseUrl();
  const anon = getSupabaseAnonKey();
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-client-info": "smart-fleet-africa-bff@1.0.0",
      },
    },
  });
}
