#!/usr/bin/env node
/**
 * Déploie les Edge Functions présentes dans supabase/functions/ mais absentes en prod.
 * Prérequis : SUPABASE_ACCESS_TOKEN + project ref lié (supabase link) ou --project-ref.
 *
 * Usage :
 *   node scripts/deploy-missing-edge-functions.mjs
 *   node scripts/deploy-missing-edge-functions.mjs --dry-run
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const FUNCTIONS_DIR = join(ROOT, 'supabase', 'functions');
const DRY_RUN = process.argv.includes('--dry-run');

/** Fonctions déployées sous un autre slug en prod — ne pas redéployer en doublon. */
const PROD_ALIASES = {
  'whatsapp-webhook': 'whatsapp-bot',
};

/** JWT désactivé : webhooks, crons, OTP pré-auth. */
const NO_JWT = new Set([
  'otp-send',
  'whatsapp-webhook',
  'process-whatsapp-retries',
  'notch-pay-webhook',
  'billing-lifecycle-cron',
  'expire-demo-accounts',
  'expire-prospect-accounts',
  'demo-magic-link',
  'retention-nudge',
  'refresh-analytics',
  'process-notification-queue',
  'generate-scheduled-report',
  'dashcam-ai-webhook',
  'support-notify',
  'create-prospect-account',
]);

const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF?.trim() || 'zqxjvmejoktwlcqshnwi';

/** npx supabase est fiable ; le binaire .cache peut crasher sous Windows (0xC0000005). */
function resolveSupabaseCli() {
  return 'npx supabase';
}

function listRepoFunctions() {
  return readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== '_shared')
    .map((d) => d.name)
    .filter((name) => existsSync(join(FUNCTIONS_DIR, name, 'index.ts')))
    .sort();
}

function deployOne(cli, name) {
  const noJwt = NO_JWT.has(name);
  const jwtFlag = noJwt ? '--no-verify-jwt' : '';
  const cmd = `${cli} functions deploy ${name} --project-ref ${PROJECT_REF} ${jwtFlag}`.trim();
  console.log(`→ ${cmd}`);
  if (!DRY_RUN) {
    execSync(cmd, { cwd: ROOT, stdio: 'inherit', env: process.env });
  }
}

const repoFns = listRepoFunctions();
console.log(`Fonctions dans le dépôt (${repoFns.length}) :`);
console.log(repoFns.join(', '));
console.log('');
console.log(
  DRY_RUN
    ? 'Mode dry-run — aucun déploiement.'
    : 'Déploiement de toutes les fonctions du dépôt (idempotent).',
);
console.log('Alias prod connus :', PROD_ALIASES);
console.log(`Projet cible : ${PROJECT_REF}`);
console.log('');

const cli = resolveSupabaseCli();
for (const name of repoFns) {
  if (PROD_ALIASES[name]) {
    console.log(`⊘ ${name} → prod utilise « ${PROD_ALIASES[name]} », ignoré`);
    continue;
  }
  try {
    deployOne(cli, name);
  } catch (err) {
    console.error(`✗ Échec ${name}:`, err.message ?? err);
    process.exitCode = 1;
  }
}

console.log('\nTerminé.');
