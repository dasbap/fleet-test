#!/usr/bin/env node
/**
 * Applique le seed TEST Yaoundé via Supabase service-role.
 * Idempotent : relançable sans doublons.
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
const TEST_VEHICLES = [
  { registration: 'TEST-YAO-001', brand: 'Toyota', model: 'Hiace', year: 2020, current_km: 120000 },
  { registration: 'TEST-YAO-002', brand: 'Hyundai', model: 'H1', year: 2021, current_km: 86000 },
  { registration: 'TEST-YAO-003', brand: 'Peugeot', model: 'Boxer', year: 2019, current_km: 144000 },
];

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

  const { error: plansError } = await supabase.from('plans').upsert(
    [
      {
        code: 'free',
        name: 'Free Test',
        price_per_vehicle: 0,
        max_vehicles: 3,
        is_active: true,
        enables_finance: false,
        enables_ai: false,
        enables_reports: false,
        enables_driver_scoring: false,
        enables_anomaly_insights: false,
      },
      {
        code: 'pro',
        name: 'Pro Test',
        price_per_vehicle: 8000,
        max_vehicles: 100,
        is_active: true,
        enables_finance: true,
        enables_ai: true,
        enables_reports: true,
        enables_driver_scoring: true,
        enables_anomaly_insights: true,
      },
    ],
    { onConflict: 'code' },
  );
  if (plansError) fail('upsert plans impossible', plansError.message);

  const { data: existingOrg, error: existingOrgError } = await supabase
    .from('organisations')
    .select('id')
    .eq('name', TEST_ORG_NAME)
    .maybeSingle();
  if (existingOrgError) fail('lecture organisation impossible', existingOrgError.message);

  let orgId = existingOrg?.id;
  if (!orgId) {
    const { data: createdOrg, error: createdOrgError } = await supabase
      .from('organisations')
      .insert({
        name: TEST_ORG_NAME,
        country_code: 'CM',
      })
      .select('id')
      .single();
    if (createdOrgError) fail('création organisation impossible', createdOrgError.message);
    orgId = createdOrg.id;
  }

  const { data: existingFleet, error: existingFleetError } = await supabase
    .from('flottes')
    .select('id')
    .eq('org_id', orgId)
    .eq('name', TEST_FLEET_NAME)
    .maybeSingle();
  if (existingFleetError) fail('lecture flotte impossible', existingFleetError.message);

  let fleetId = existingFleet?.id;
  if (!fleetId) {
    const { data: createdFleet, error: createdFleetError } = await supabase
      .from('flottes')
      .insert({
        org_id: orgId,
        name: TEST_FLEET_NAME,
        collection_policy: 'mix',
      })
      .select('id')
      .single();
    if (createdFleetError) fail('création flotte impossible', createdFleetError.message);
    fleetId = createdFleet.id;
  }

  const { data: freePlan, error: freePlanError } = await supabase
    .from('plans')
    .select('id')
    .eq('code', 'free')
    .single();
  if (freePlanError) fail('lecture plan free impossible', freePlanError.message);

  const { data: activeFreeSubscription, error: subLookupError } = await supabase
    .from('abonnements')
    .select('id')
    .eq('fleet_id', fleetId)
    .eq('plan_id', freePlan.id)
    .eq('status', 'active')
    .gte('ends_at', new Date().toISOString())
    .limit(1)
    .maybeSingle();
  if (subLookupError) fail('lecture abonnement impossible', subLookupError.message);

  if (!activeFreeSubscription) {
    const { error: subInsertError } = await supabase.from('abonnements').insert({
      fleet_id: fleetId,
      plan_id: freePlan.id,
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      vehicle_slots: TEST_VEHICLES.length,
    });
    if (subInsertError) fail('création abonnement impossible', subInsertError.message);
  } else {
    const { error: subUpdateError } = await supabase
      .from('abonnements')
      .update({ vehicle_slots: TEST_VEHICLES.length })
      .eq('id', activeFreeSubscription.id);
    if (subUpdateError) fail('mise a jour slots abonnement impossible', subUpdateError.message);
  }

  const vehiclesPayload = TEST_VEHICLES.map((vehicle) => ({
    fleet_id: fleetId,
    status: 'ok',
    ...vehicle,
  }));
  const { error: vehiclesError } = await supabase
    .from('vehicules')
    .upsert(vehiclesPayload, { onConflict: 'fleet_id,registration' });
  if (vehiclesError) fail('upsert véhicules impossible', vehiclesError.message);

  console.log('OK: seed TEST Yaoundé appliqué avec succès.');
}

main().catch((error) => fail('échec inattendu lors du seed TEST Yaoundé', error));
