#!/usr/bin/env node
/** Vérifie la cohérence clôtures pending ↔ véhicules flotte (compte gestionnaire). */
import { createClient } from '@supabase/supabase-js';
import { loadEnvWithLocalFallback } from './_env-loader.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

loadEnvWithLocalFallback(join(dirname(fileURLToPath(import.meta.url)), '..'));

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const fleetId = process.env.VERIFY_FLEET_ID ?? process.argv[2];

if (!url || !key) {
  console.error('ERREUR: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function fetchPendingClosures(fId) {
  const { data: assignments, error: e1 } = await supabase
    .from('affectations_vehicules')
    .select('id, vehicle_id')
    .eq('fleet_id', fId);

  if (e1) throw new Error(`affectations: ${e1.message}`);

  const assignmentIds = (assignments ?? []).map((a) => a.id);
  if (assignmentIds.length === 0) return [];

  const { data: shifts, error: e2 } = await supabase
    .from('creneaux_conducteurs')
    .select('id, km_start, km_end, assignment_id')
    .in('assignment_id', assignmentIds);

  if (e2) throw new Error(`creneaux: ${e2.message}`);

  const shiftIds = (shifts ?? []).map((s) => s.id);
  if (shiftIds.length === 0) return [];

  const { data: closures, error: e3 } = await supabase
    .from('clotures_creneaux')
    .select('id, shift_id, status, revenue_declared, created_at')
    .in('shift_id', shiftIds)
    .eq('status', 'pending');

  if (e3) throw new Error(`clotures: ${e3.message}`);

  const vehicleIds = [...new Set((assignments ?? []).map((a) => a.vehicle_id))];
  const { data: vehicles } = await supabase
    .from('vehicules')
    .select('id, registration, current_km')
    .in('id', vehicleIds);

  const regByVehicle = new Map((vehicles ?? []).map((v) => [v.id, v]));
  const shiftById = new Map((shifts ?? []).map((s) => [s.id, s]));
  const assignById = new Map((assignments ?? []).map((a) => [a.id, a]));

  return (closures ?? []).map((c) => {
    const shift = shiftById.get(c.shift_id);
    const assign = shift ? assignById.get(shift.assignment_id) : null;
    const vehicle = assign ? regByVehicle.get(assign.vehicle_id) : null;
    return {
      closureId: c.id,
      vehicleRegistration: vehicle?.registration ?? null,
      vehicleCurrentKm: vehicle?.current_km ?? null,
      kmStart: shift?.km_start ?? null,
      kmEnd: shift?.km_end ?? null,
      revenue: c.revenue_declared,
    };
  });
}

async function resolveFleetId() {
  if (fleetId) return fleetId;

  const { data, error } = await supabase.from('flottes').select('id, name').limit(1).single();
  if (error || !data) {
    throw new Error('Aucune flotte trouvée — passer VERIFY_FLEET_ID ou argv[2]');
  }
  console.log(`Flotte auto-sélectionnée: ${data.name} (${data.id})\n`);
  return data.id;
}

async function main() {
  console.log('=== Cohérence clôtures pending / flotte ===\n');

  const fId = await resolveFleetId();
  const pending = await fetchPendingClosures(fId);

  console.log(`Flotte: ${fId}`);
  console.log(`Clôtures pending: ${pending.length}\n`);

  if (pending.length === 0) {
    console.log('OK: aucune clôture en attente (rien à valider).');
    process.exit(0);
  }

  let issues = 0;

  for (const row of pending) {
    const checks = [];

    if (!row.vehicleRegistration) {
      checks.push('immatriculation véhicule introuvable');
      issues += 1;
    }

    if (row.kmEnd != null && row.kmStart != null && row.kmEnd < row.kmStart) {
      checks.push(`km incohérent: ${row.kmStart} → ${row.kmEnd}`);
      issues += 1;
    }

    if (
      row.kmEnd != null &&
      row.vehicleCurrentKm != null &&
      row.vehicleCurrentKm < row.kmEnd
    ) {
      checks.push(
        `current_km véhicule (${row.vehicleCurrentKm}) < km_fin clôture (${row.kmEnd})`,
      );
      issues += 1;
    }

    const status = checks.length === 0 ? 'OK' : 'KO';
    console.log(
      `${status} ${row.vehicleRegistration ?? '?'} | km ${row.kmStart ?? '—'} → ${row.kmEnd ?? '—'} | recette ${row.revenue} FCFA`,
    );
    if (checks.length > 0) {
      checks.forEach((c) => console.log(`     → ${c}`));
    }
  }

  console.log('');
  if (issues > 0) {
    console.error(`KO: ${issues} incohérence(s) détectée(s).`);
    process.exit(2);
  }

  console.log('OK: toutes les clôtures pending sont cohérentes avec la flotte.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
