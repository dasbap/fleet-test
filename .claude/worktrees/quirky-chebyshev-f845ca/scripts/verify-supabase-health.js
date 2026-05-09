#!/usr/bin/env node
/**
 * Vérification complète Supabase : env, connexion (projet actif), migrations appliquées.
 * Lit .env.local. Optionnel : SUPABASE_SERVICE_ROLE_KEY pour comparer les migrations via RPC.
 * Usage : node scripts/verify-supabase-health.js
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

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
  const candidatePaths = [
    join(root, '.env.local'),
    join(process.cwd(), '.env.local'),
  ];

  for (const envPath of candidatePaths) {
    if (!existsSync(envPath)) continue;
    const content = readFileSync(envPath, 'utf8');
    parseEnvContent(content);
  }
}

loadEnvLocal();

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function log(msg, status = '') {
  const prefix = status === 'ok' ? 'OK: ' : status === 'err' ? 'ERREUR: ' : status === 'warn' ? 'ATTENTION: ' : '';
  console.log(prefix + msg);
}

/** Liste attendue : noms de fichiers *.sql dans supabase/migrations, triés. */
function getExpectedMigrations() {
  const dir = join(root, 'supabase', 'migrations');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

/** Normalise un nom de version pour comparaison (avec ou sans .sql). */
function normalizeVersion(v) {
  if (!v || typeof v !== 'string') return '';
  return v.trim().toLowerCase().replace(/\.sql$/i, '') || v.trim().toLowerCase();
}

/** Extrait l'identifiant migration (timestamp 14 chiffres) quand disponible. */
function extractMigrationId(v) {
  const normalized = normalizeVersion(v);
  const match = normalized.match(/^(\d{14})/);
  return match ? match[1] : normalized;
}

/** Compare appliquées vs attendues ; retourne { ok, missing, extra }. */
function compareMigrations(applied, expected) {
  const aSet = new Set(applied.map(extractMigrationId));
  const eList = expected.map((f) => extractMigrationId(f));
  const missing = eList.filter((e) => !aSet.has(e));
  const eSet = new Set(eList);
  const extra = applied.filter((v) => !eSet.has(extractMigrationId(v)));
  return {
    ok: missing.length === 0,
    missing: expected.filter((f) => missing.includes(extractMigrationId(f))),
    extra,
  };
}

/** Récupère les migrations appliquées via RPC (service_role). */
async function fetchMigrationsViaRpc() {
  if (!serviceRoleKey || !url) return null;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
    const { data, error } = await supabase.rpc('liste_migrations_appliquees');
    if (error) {
      if (error.code === '42883' || error.message?.includes('does not exist')) return null;
      throw error;
    }
    return Array.isArray(data) ? data : [];
  } catch (e) {
    if (e.code === '42883') return null;
    throw e;
  }
}

/** Récupère les migrations appliquées via CLI (supabase migration list). */
function fetchMigrationsViaCli() {
  const ref = url ? url.replace(/^https?:\/\//, '').split('.')[0] : '';
  const args = ref ? ['migration', 'list', '--project-ref', ref] : ['migration', 'list'];
  const result = spawnSync('supabase', args, {
    cwd: root,
    encoding: 'utf8',
    shell: true,
  });
  if (result.status !== 0 || result.stderr) return null;
  const out = (result.stdout || '').trim();
  const lines = out.split('\n').filter(Boolean);
  const versions = [];
  for (const line of lines) {
    const match = line.match(/(\d{14}_[^\s]+(?:\.sql)?)/);
    if (match) versions.push(match[1].replace(/\.sql$/i, '') + (match[1].endsWith('.sql') ? '' : '.sql'));
  }
  if (versions.length === 0 && lines.length > 0) {
    lines.forEach((l) => {
      const v = l.trim().split(/\s+/).find((s) => /^\d{14}_/.test(s));
      if (v) versions.push(v.endsWith('.sql') ? v : v + '.sql');
    });
  }
  return versions.length ? versions : null;
}

async function main() {
  const report = { env: false, connection: false, migrations: 'skip' };

  log('Vérification Supabase (env, connexion, migrations)', '');
  log('');

  if (!url || !anonKey) {
    log('VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY requis dans .env.local', 'err');
    process.exit(1);
  }
  if (url.match(/votre-projet|example\.com/) || anonKey.length < 50 || anonKey.match(/votre_cle|example/)) {
    log('Configurez de vraies valeurs dans .env.local (pas les placeholders).', 'err');
    process.exit(1);
  }
  report.env = true;
  log('Variables d’environnement (URL + clé anon) : OK', 'ok');
  log('');

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
  try {
    const { data, error } = await supabase.from('organisations').select('id').limit(1);
    if (error) {
      log('Connexion API : ' + error.message, 'err');
      if (error.message && error.message.includes('schema')) {
        log('Le projet est peut-être en pause ou les migrations ne sont pas appliquées.', 'warn');
      }
      process.exit(1);
    }
    report.connection = true;
    log('Connexion API : OK (projet actif, pas en pause)', 'ok');
    log('Organisations (échantillon) : ' + (Array.isArray(data) ? data.length : 0) + ' ligne(s)', '');
  } catch (err) {
    log('Connexion réseau / config : ' + (err.message || err), 'err');
    process.exit(1);
  }
  log('');

  if (!serviceRoleKey) {
    report.migrations = 'skip';
    log('SUPABASE_SERVICE_ROLE_KEY non défini : vérification des migrations non effectuée.', 'warn');
    log('');
    log('Comment vérifier les migrations manuellement :', '');
    log('  1. Dashboard Supabase → Database → Migrations (ou SQL Editor).', '');
    log('  2. Exécuter le script supabase/list-applied-migrations.sql dans le SQL Editor.', '');
    log('  3. Comparer la liste obtenue avec la liste attendue dans docs/verification-connexion-supabase.md § 3.2.', '');
    log('  Ou : après application de la migration RPC (liste_migrations_appliquees_rpc) et ajout de SUPABASE_SERVICE_ROLE_KEY dans .env.local, une nouvelle exécution fera la comparaison des migrations automatiquement.', '');
    log('');
    return;
  }

  const expected = getExpectedMigrations();
  if (expected.length === 0) {
    log('Aucun fichier de migration trouvé dans supabase/migrations/', 'warn');
    log('');
    process.exit(0);
  }

  let applied = null;
  let source = '';

  try {
    applied = await fetchMigrationsViaRpc();
    if (applied !== null) source = 'RPC';
  } catch (e) {
    log('RPC liste_migrations_appliquees : ' + (e.message || e), 'warn');
  }

  if (applied === null) {
    applied = fetchMigrationsViaCli();
    if (applied !== null) source = 'CLI';
  }

  if (applied === null || applied.length === 0) {
    report.migrations = 'skip';
    log('Migrations : non vérifiées automatiquement.', 'warn');
    log('  Exécuter supabase/list-applied-migrations.sql dans le SQL Editor, puis comparer avec docs/verification-connexion-supabase.md § 3.2.', '');
    log('');
    process.exit(0);
  }

  const normApplied = applied.map((v) => (v.endsWith('.sql') ? v : v + '.sql'));
  const cmp = compareMigrations(normApplied, expected);
  report.migrations = cmp.ok ? 'ok' : 'missing';

  if (cmp.ok) {
    log('Migrations (' + source + ') : OK (' + applied.length + ' appliquée(s), liste attendue respectée).', 'ok');
  } else {
    log('Migrations (' + source + ') : des migrations attendues ne sont pas appliquées.', 'err');
    cmp.missing.forEach((m) => log('  - ' + m, ''));
    if (cmp.extra.length) {
      log('  (En plus sur le projet : ' + cmp.extra.slice(0, 5).join(', ') + (cmp.extra.length > 5 ? '…' : '') + ')', '');
    }
  }
  log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
