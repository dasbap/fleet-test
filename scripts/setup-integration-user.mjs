#!/usr/bin/env node
/**
 * Provisionne un utilisateur d'intégration dédié pour les tests Supabase.
 *
 * Objectif :
 * - garantir un TEST_INTEGRATION_USER_ID réel (non skip)
 * - rester idempotent (création ou mise à jour)
 * - mettre à jour .env.local automatiquement avec sauvegarde .bak
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const INTEGRATION_EMAIL = 'integration.tests@esamba.test';
const INTEGRATION_PASSWORD = 'Integration2025!';
const INTEGRATION_USER_ID_KEY = 'TEST_INTEGRATION_USER_ID';

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

function log(msg, kind = '') {
  const prefix =
    kind === 'ok' ? 'OK: ' : kind === 'err' ? 'ERREUR: ' : kind === 'warn' ? 'ATTENTION: ' : '';
  console.log(prefix + msg);
}

async function findUserByEmail(supabase, email) {
  const perPage = 200;
  let page = 1;
  const maxPages = 5000;

  while (page <= maxPages) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const user = data.users.find((item) => item.email === email);
    if (user) return user;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

function upsertEnvVar(filePath, key, value) {
  const fileExists = existsSync(filePath);
  const rawContent = fileExists ? readFileSync(filePath, 'utf8') : '';
  const normalized = rawContent.replace(/^\uFEFF/, '');
  const lines = normalized.length > 0 ? normalized.split(/\r?\n/) : [];
  const entry = `${key}=${value}`;
  const keyRegex = new RegExp(`^\\s*${key}\\s*=`);

  let replaced = false;
  const updatedLines = lines.map((line) => {
    if (keyRegex.test(line)) {
      replaced = true;
      return entry;
    }
    return line;
  });

  if (!replaced) {
    if (updatedLines.length > 0 && updatedLines[updatedLines.length - 1] !== '') {
      updatedLines.push('');
    }
    updatedLines.push(entry);
  }

  const backupPath = `${filePath}.bak`;
  if (fileExists) {
    writeFileSync(backupPath, rawContent, 'utf8');
  }

  writeFileSync(filePath, `${updatedLines.join('\n')}\n`, 'utf8');
  return { backupPath, fileExists };
}

async function main() {
  loadEnvLocal();

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

  let user = await findUserByEmail(supabase, INTEGRATION_EMAIL);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: INTEGRATION_EMAIL,
      password: INTEGRATION_PASSWORD,
      email_confirm: true,
    });

    if (error) {
      log(`Impossible de créer ${INTEGRATION_EMAIL} : ${error.message}`, 'err');
      process.exit(1);
    }

    user = data.user;
    log(`Utilisateur créé: ${INTEGRATION_EMAIL}`, 'ok');
  } else {
    log(`Utilisateur existant détecté: ${INTEGRATION_EMAIL}`, 'ok');
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password: INTEGRATION_PASSWORD,
  });

  if (updateError) {
    log(`Impossible de réinitialiser le mot de passe: ${updateError.message}`, 'err');
    process.exit(1);
  }

  const { error: profileError } = await supabase
    .from('profils')
    .upsert(
      {
        user_id: user.id,
        full_name: 'Integration Tests',
      },
      { onConflict: 'user_id' },
    );

  if (profileError) {
    log(`Impossible d'assurer le profil lié: ${profileError.message}`, 'err');
    process.exit(1);
  }

  const envPath = join(root, '.env.local');
  const { backupPath, fileExists } = upsertEnvVar(envPath, INTEGRATION_USER_ID_KEY, user.id);

  log(`Mot de passe réinitialisé pour ${INTEGRATION_EMAIL}`, 'ok');
  log('Profil utilisateur d’intégration assuré dans public.profils', 'ok');
  log(`${INTEGRATION_USER_ID_KEY}=${user.id}`, 'ok');
  if (fileExists) {
    log(`Sauvegarde créée: ${backupPath}`, 'ok');
  }
  log(`.env.local mis à jour: ${INTEGRATION_USER_ID_KEY}`, 'ok');
}

main().catch((e) => {
  log(e?.message ?? String(e), 'err');
  process.exit(1);
});
