#!/usr/bin/env node
/**
 * Vérifie que la RPC get_fleet_billing_context expose les champs requis par /dashboard/billing.
 * Lit .env.local pour VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.
 *
 * Usage :
 *   node scripts/verify-billing-context.mjs
 *   FLEET_ID=<uuid> node scripts/verify-billing-context.mjs
 *
 * Code de sortie : 0 si OK, 1 sinon.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const REQUIRED_KEYS = [
  'billing_status',
  'plan_code',
  'plan_name',
  'vehicle_count',
  'max_vehicles',
  'vehicle_slots',
  'active_vehicles',
  'finance_enabled',
  'subscription_ends_at',
  'grace_until',
  'trial_ends_at',
];

function loadEnvLocal() {
  for (const rel of ['.env.local', '.env']) {
    const envPath = join(root, rel);
    if (!existsSync(envPath)) continue;
    const content = readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m) {
        const v = m[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[m[1]]) process.env[m[1]] = v;
      }
    });
  }
}

loadEnvLocal();

async function ensureIntegrationFleetAccess(adminClient, userId, fleetId) {
  const { data: existing } = await adminClient
    .from('flotte_adhesions')
    .select('id')
    .eq('fleet_id', fleetId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing?.id) return;

  const { error } = await adminClient.from('flotte_adhesions').insert({
    fleet_id: fleetId,
    user_id: userId,
    role: 'organizer',
    is_active: true,
  });

  if (error) {
    throw new Error(`Impossible d'assurer l'adhésion test : ${error.message}`);
  }
}

async function resolveFleetId(supabase, userId) {
  const fromEnv = process.env.FLEET_ID?.trim();
  if (fromEnv) return fromEnv;

  if (userId) {
    const { data: adhesion, error: adhErr } = await supabase
      .from('flotte_adhesions')
      .select('fleet_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .in('role', ['organizer', 'manager'])
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!adhErr && adhesion?.fleet_id) return adhesion.fleet_id;
  }

  const { data, error } = await supabase
    .from('flottes')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Impossible de résoudre une flotte : ${error.message}`);
  if (!data?.id) throw new Error('Aucune flotte trouvée — définissez FLEET_ID ou seedez la base.');
  return data.id;
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const integrationEmail =
    process.env.TEST_INTEGRATION_EMAIL?.trim() || 'integration.tests@esamba.test';
  const integrationPassword =
    process.env.TEST_INTEGRATION_PASSWORD?.trim() || 'Integration2025!';

  if (!url || (!anonKey && !serviceRoleKey)) {
    console.error(
      'ERREUR: VITE_SUPABASE_URL et (VITE_SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY) requis.',
    );
    process.exit(1);
  }

  const { createClient } = await import('@supabase/supabase-js');

  // Client RPC : session authenticated (la RPC refuse service_role sans auth.uid())
  const userClient = createClient(url, anonKey ?? serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: signInErr } = await userClient.auth.signInWithPassword({
    email: integrationEmail,
    password: integrationPassword,
  });
  if (signInErr) {
    console.error('ERREUR auth:', signInErr.message);
    console.error(
      'Astuce: npm run setup:integration-user ou définissez TEST_INTEGRATION_EMAIL / TEST_INTEGRATION_PASSWORD.',
    );
    process.exit(1);
  }

  const adminClient = serviceRoleKey
    ? createClient(url, serviceRoleKey, { auth: { persistSession: false } })
    : userClient;

  const { data: sessionData } = await userClient.auth.getSession();
  const userId = sessionData.session?.user?.id ?? null;

  console.log('Vérification RPC get_fleet_billing_context (page /dashboard/billing)...\n');

  let fleetId = process.env.FLEET_ID?.trim() || null;

  if (!fleetId) {
    const { data: bootstrap, error: bootErr } = await userClient.rpc('get_user_bootstrap');
    if (!bootErr && bootstrap?.active_fleet_id) {
      fleetId = bootstrap.active_fleet_id;
    }
  }

  if (!fleetId) {
    fleetId = await resolveFleetId(adminClient, userId);
  }

  if (userId && serviceRoleKey) {
    await ensureIntegrationFleetAccess(adminClient, userId, fleetId);
  }

  console.log(`Flotte cible : ${fleetId}\n`);

  const { data, error } = await userClient.rpc('get_fleet_billing_context', {
    p_fleet_id: fleetId,
  });

  if (error) {
    console.error('ERREUR RPC:', error.message);
    if (error.code) console.error('Code:', error.code);
    process.exit(1);
  }

  if (!data || typeof data !== 'object') {
    console.error('ERREUR: réponse RPC vide ou invalide.');
    process.exit(1);
  }

  let allOk = true;
  for (const key of REQUIRED_KEYS) {
    const present = Object.prototype.hasOwnProperty.call(data, key);
    if (!present) allOk = false;
    console.log(present ? '  OK' : '  KO', key, present ? `= ${JSON.stringify(data[key])}` : '(absent)');
  }

  const validStatuses = ['trial', 'active', 'grace', 'suspended', 'enterprise'];
  const statusOk = validStatuses.includes(data.billing_status);
  if (!statusOk) {
    allOk = false;
    console.log('  KO billing_status valeur', data.billing_status);
  } else {
    console.log('  OK billing_status valeur valide');
  }

  console.log('');
  if (allOk) {
    console.log('Résultat : contexte facturation complet pour la page billing.');
    process.exit(0);
  }

  console.log('Résultat : champs manquants — appliquez la migration 20260530140000_extend_get_fleet_billing_context_lifecycle.');
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
