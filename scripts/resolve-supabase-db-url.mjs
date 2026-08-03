#!/usr/bin/env node
import { fileURLToPath } from "node:url";

export function resolveSupabaseDbUrl(env = process.env) {
  const password = env.SUPABASE_DB_PASSWORD?.trim();
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim();
  const ref = supabaseUrl?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
  if (password && ref) {
    const host = env.SUPABASE_POOLER_HOST?.trim() || "aws-1-eu-west-1.pooler.supabase.com";
    return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@${host}:5432/postgres`;
  }

  return (
    env.DATABASE_URL?.trim() ||
    env.DIRECT_URL?.trim() ||
    env.SUPABASE_DB_URL?.trim() ||
    null
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const url = resolveSupabaseDbUrl();
  if (!url) {
    console.error(
      "Missing DATABASE_URL, DIRECT_URL, SUPABASE_DB_URL, or SUPABASE_DB_PASSWORD + VITE_SUPABASE_URL.",
    );
    process.exit(1);
  }

  console.log(url);
}
