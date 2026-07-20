#!/usr/bin/env node
/**
 * Réinitialise le mot de passe des comptes démo E-Samba (@esamba.test) via l’API Admin Supabase.
 * Aligné avec src/features/auth/data/demoCredentials.ts et docs/DEMO-CREDENTIALS.md.
 *
 * Requis : VITE_SUPABASE_URL (ou SUPABASE_URL) et SUPABASE_SERVICE_ROLE_KEY dans l’environnement
 * ou dans .env.local à la racine du dépôt.
 *
 * Usage : node --env-file=.env.local scripts/reset-demo-passwords.mjs
 *         npm run reset:demo-passwords
 *
 * Gouvernance :
 * - Ne jamais committer de secrets (clés API, service role, mots de passe).
 * - SUPABASE_SERVICE_ROLE_KEY : uniquement poste local ou CI avec secrets chiffrés ;
 *   jamais dans le navigateur, jamais dans le bundle client, jamais dans un dépôt public.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

/** Même liste que DEMO_CREDENTIAL_ACCOUNTS (emails uniquement). */
const DEMO_EMAILS = [
  'demo.organizer@esamba.test',
  'demo.manager1@esamba.test',
  'demo.manager2@esamba.test',
  'demo.driver1@esamba.test',
  'demo.driver2@esamba.test',
  'demo.mechanic1@esamba.test',
];

const DEMO_PASSWORD = 'Demo2025!';

function parseEnvContent(content) {
  const normalized = content.replace(/^\uFEFF/, '');
  normalized.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return;

    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  });
}

function loadEnvLocal() {
  const candidatePaths = [join(root, '.env.local'), join(process.cwd(), '.env.local')];
  for (const envPath of candidatePaths) {
    if (!existsSync(envPath)) continue;
    parseEnvContent(readFileSync(envPath, 'utf8'));
  }
}

loadEnvLocal();

function log(msg, kind = '') {
  const prefix =
    kind === 'ok' ? 'OK: ' : kind === 'err' ? 'ERREUR: ' : kind === 'warn' ? 'ATTENTION: ' : '';
  console.log(prefix + msg);
}

/**
 * Résout email → utilisateur : d’abord lookup REST par email, sinon pagination listUsers.
 */
async function collectUsersByEmail(supabase, url, serviceRoleKey, emails) {
  const found = new Map();

  for (const email of emails) {
    try {
      const user = await findUserByEmailRest(url, serviceRoleKey, email);
      if (user) found.set(email, user);
    } catch {
      /* fallback pagination ci-dessous */
    }
  }

  if (found.size === emails.length) {
    return found;
  }

  const targetSet = new Set(emails.filter((e) => !found.has(e)));
  const perPage = 200;
  let page = 1;
  const maxPages = 5000;

  while (targetSet.size > 0 && page <= maxPages) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      if (found.size > 0) return found;
      throw error;
    }
    for (const user of data.users) {
      if (user.email && targetSet.has(user.email)) {
        found.set(user.email, user);
        targetSet.delete(user.email);
      }
    }
    if (data.users.length < perPage) break;
    page += 1;
  }

  return found;
}

async function findUserByEmailRest(url, serviceRoleKey, email) {
  const endpoint = new URL('/auth/v1/admin/users', url);
  endpoint.searchParams.set('page', '1');
  endpoint.searchParams.set('per_page', '1');
  endpoint.searchParams.set('filter', email);

  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Admin lookup ${email} : ${res.status} ${body.slice(0, 120)}`);
  }

  const json = await res.json();
  const users = json.users ?? json;
  if (Array.isArray(users) && users.length > 0 && users[0].email === email) {
    return users[0];
  }
  return null;
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    const missing = [];
    if (!url) missing.push('VITE_SUPABASE_URL ou SUPABASE_URL');
    if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    log(`Variables manquantes : ${missing.join(', ')}`, 'err');
    log('Chargez .env.local ou exportez ces variables avant d’exécuter le script.', 'err');
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const targetSet = new Set(DEMO_EMAILS);
  let found;
  try {
    found = await collectUsersByEmail(supabase, url, serviceRoleKey, DEMO_EMAILS);
  } catch (e) {
    log(e?.message ?? String(e), 'err');
    process.exit(1);
  }

  const missingEmails = DEMO_EMAILS.filter((e) => !found.has(e));
  for (const email of missingEmails) {
    log(`Aucun utilisateur trouvé pour ${email} (compte absent ou email différent).`, 'warn');
  }

  let failures = 0;
  let skipped = 0;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const probeClient = anonKey ? createClient(url, anonKey) : null;

  for (const email of DEMO_EMAILS) {
    const user = found.get(email);
    if (!user) {
      failures += 1;
      continue;
    }

    if (probeClient) {
      const { error: signErr } = await probeClient.auth.signInWithPassword({
        email,
        password: DEMO_PASSWORD,
      });
      if (!signErr) {
        log(`Connexion OK — mot de passe inchangé : ${email}`, 'ok');
        skipped += 1;
        continue;
      }
    }

    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: DEMO_PASSWORD,
    });
    if (error) {
      failures += 1;
      log(`${email} : ${error.message}`, 'err');
    } else {
      log(`Mot de passe réinitialisé pour ${email}`, 'ok');
    }
  }

  if (failures > 0) {
    log(`${failures} compte(s) non mis à jour.`, 'err');
    log('Alternative : exécuter supabase/scripts/setup/reset-demo-passwords.sql dans le SQL Editor.', 'warn');
    process.exit(1);
  }

  log(
    skipped === DEMO_EMAILS.length
      ? 'Tous les comptes démo se connectent déjà avec Demo2025! — aucune mise à jour nécessaire.'
      : 'Tous les comptes démo présents ont été mis à jour.',
    'ok',
  );
}

main().catch((e) => {
  log(e?.message ?? String(e), 'err');
  process.exit(1);
});
