#!/usr/bin/env node
/**
 * Vérifie la présence et la cohérence du seed TEST Yaoundé.
 * Requis : .env.local avec VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { loadEnvWithLocalFallback, getMissingEnv } from './_env-loader.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

loadEnvWithLocalFallback(root);

const REQUIRED_ENV = ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const TEST_ORG_NAME = 'TEST Organisation Yaoundé';
const TEST_FLEET_NAME = 'TEST Flotte Taxi Yaoundé';
const TEST_REGISTRATIONS = ['TEST-YAO-001', 'TEST-YAO-002', 'TEST-YAO-003'];

function fail(message, payload) {
  console.error(`ERREUR: ${message}`);
  if (payload !== undefined) console.error(payload);
  process.exit(1);
}

async function main() {
  const missing = getMissingEnv(REQUIRED_ENV);
  if (missing.length > 0) {
    fail(`variables manquantes: ${missing.join(', ')}`);
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

  const { data: planFree, error: planError } = await supabase
    .from('plans')
    .select(
      'id, code, max_vehicles, is_active, enables_finance, enables_ai, enables_reports, enables_driver_scoring, enables_anomaly_insights',
    )
    .eq('code', 'free')
    .maybeSingle();
  if (planError) fail('lecture plan free impossible', planError.message);
  if (!planFree) fail('plan free introuvable');

  const freePlanOk =
    planFree.max_vehicles === 3 &&
    planFree.is_active === true &&
    planFree.enables_finance === false &&
    planFree.enables_ai === false &&
    planFree.enables_reports === false &&
    planFree.enables_driver_scoring === false &&
    planFree.enables_anomaly_insights === false;
  if (!freePlanOk) fail('plan free incohérent', planFree);

  const { data: org, error: orgError } = await supabase
    .from('organisations')
    .select('id, name, country_code')
    .eq('name', TEST_ORG_NAME)
    .maybeSingle();
  if (orgError) fail('lecture organisation impossible', orgError.message);
  if (!org) fail(`organisation absente: ${TEST_ORG_NAME}`);

  const { data: fleet, error: fleetError } = await supabase
    .from('flottes')
    .select('id, name, collection_policy')
    .eq('org_id', org.id)
    .eq('name', TEST_FLEET_NAME)
    .maybeSingle();
  if (fleetError) fail('lecture flotte impossible', fleetError.message);
  if (!fleet) fail(`flotte absente: ${TEST_FLEET_NAME}`);
  if (fleet.collection_policy !== 'mix') fail('collection_policy de la flotte incohérent', fleet);

  const { data: activeFreeSubscriptions, error: subError } = await supabase
    .from('abonnements')
    .select('id, status, starts_at, ends_at, plan_id')
    .eq('fleet_id', fleet.id)
    .eq('plan_id', planFree.id)
    .eq('status', 'active')
    .gte('ends_at', new Date().toISOString());
  if (subError) fail('lecture abonnements impossible', subError.message);
  if (!activeFreeSubscriptions || activeFreeSubscriptions.length === 0) {
    fail('aucun abonnement actif free trouvé pour la flotte TEST');
  }

  const { data: vehicles, error: vehiclesError } = await supabase
    .from('vehicules')
    .select('registration')
    .eq('fleet_id', fleet.id)
    .in('registration', TEST_REGISTRATIONS);
  if (vehiclesError) fail('lecture véhicules impossible', vehiclesError.message);

  const registrations = new Set((vehicles || []).map((v) => v.registration));
  const missingVehicles = TEST_REGISTRATIONS.filter((registration) => !registrations.has(registration));
  if (missingVehicles.length > 0) {
    fail(`véhicules manquants: ${missingVehicles.join(', ')}`);
  }

  console.log('OK: seed TEST Yaoundé cohérent.');
  console.log(
    JSON.stringify(
      {
        organisation: org.name,
        flotte: fleet.name,
        active_free_subscriptions: activeFreeSubscriptions.length,
        vehicles_found: TEST_REGISTRATIONS.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => fail('échec inattendu du script de vérification', error));
