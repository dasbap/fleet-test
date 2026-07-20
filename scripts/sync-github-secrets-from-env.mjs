#!/usr/bin/env node
/**
 * Synchronise les secrets GitHub Actions depuis .env.local (sans afficher les valeurs).
 * Usage: node --env-file=.env.local scripts/sync-github-secrets-from-env.mjs
 */
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadEnvWithLocalFallback } from './_env-loader.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
loadEnvWithLocalFallback(root);

const SECRETS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

function ghSecretSet(name, value) {
  const result = spawnSync('gh', ['secret', 'set', name, '--body', value], {
    encoding: 'utf8',
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `Échec gh secret set ${name}`);
  }
}

function main() {
  const envPath = join(root, '.env.local');
  if (!existsSync(envPath)) {
    console.error('ERREUR: .env.local introuvable');
    process.exit(1);
  }

  const gh = spawnSync('gh', ['auth', 'status'], { encoding: 'utf8', shell: true });
  if (gh.status !== 0) {
    console.error('ERREUR: gh CLI non authentifié (gh auth login)');
    process.exit(1);
  }

  const missing = SECRETS.filter((k) => !process.env[k]?.trim());
  if (missing.length) {
    console.error(`ERREUR: variables manquantes dans .env.local: ${missing.join(', ')}`);
    process.exit(1);
  }

  for (const name of SECRETS) {
    ghSecretSet(name, process.env[name].trim());
    console.log(`OK: ${name} mis à jour sur GitHub`);
  }

  console.log('\nSecrets GitHub synchronisés depuis .env.local.');
}

main();
