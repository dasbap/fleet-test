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
 * Résout email → utilisateur en paginant listUsers jusqu’à couvrir tous les emails cibles ou épuiser les pages.
 */
async function collectUsersByEmail(supabase, targetSet) {
  const found = new Map();
  const perPage = 200;
  let page = 1;
  const maxPages = 5000;

  while (found.size < targetSet.size && page <= maxPages) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }
    for (const user of data.users) {
      if (user.email && targetSet.has(user.email)) {
        found.set(user.email, user);
      }
    }
    if (data.users.length < perPage) {
      break;
    }
    page += 1;
  }

  return found;
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
    found = await collectUsersByEmail(supabase, targetSet);
  } catch (e) {
    log(e?.message ?? String(e), 'err');
    process.exit(1);
  }

  const missingEmails = DEMO_EMAILS.filter((e) => !found.has(e));
  for (const email of missingEmails) {
    log(`Aucun utilisateur trouvé pour ${email} (compte absent ou email différent).`, 'warn');
  }

  let failures = 0;
  for (const email of DEMO_EMAILS) {
    const user = found.get(email);
    if (!user) {
      failures += 1;
      continue;
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
    process.exit(1);
  }

  log('Tous les comptes démo présents ont été mis à jour.', 'ok');
}

main().catch((e) => {
  log(e?.message ?? String(e), 'err');
  process.exit(1);
});
