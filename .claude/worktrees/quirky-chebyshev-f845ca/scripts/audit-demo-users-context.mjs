#!/usr/bin/env node
/**
 * Audit ciblé : une ligne par compte démo — rôle « affiché » (hiérarchie app),
 * flotte active par défaut (même ordre que getActiveMembershipsForUser),
 * rôle sur cette flotte, organisation.
 *
 * Lecture seule. Requis : .env.local avec VITE_SUPABASE_URL (ou SUPABASE_URL)
 * et SUPABASE_SERVICE_ROLE_KEY.
 *
 * Usage : node --env-file=.env.local scripts/audit-demo-users-context.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const DEMO_EMAILS = [
  'demo.organizer@esamba.test',
  'demo.manager1@esamba.test',
  'demo.manager2@esamba.test',
  'demo.driver1@esamba.test',
  'demo.driver2@esamba.test',
  'demo.mechanic1@esamba.test',
];

const ROLE_HIERARCHY = ['organizer', 'manager', 'mechanic', 'driver'];

const DEMO_ORG_NAME = 'Organisation DEMO E-Samba';
const DEMO_FLEET_STARTER_NAME = 'Flotte DEMO Starter';

function loadEnvLocal() {
  const p = join(root, '.env.local');
  if (!existsSync(p)) return;
  const content = readFileSync(p, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  });
}

loadEnvLocal();

/** Même logique que FleetMemberService.getActiveMembershipsForUser (dédup par flotte, ordre conservé). */
function membershipsLikeApp(rows) {
  const byFleet = new Map();
  for (const row of rows) {
    if (!byFleet.has(row.fleet_id)) {
      byFleet.set(row.fleet_id, row);
    }
  }
  return Array.from(byFleet.values());
}

function highestRole(roles) {
  for (const r of ROLE_HIERARCHY) {
    if (roles.includes(r)) return r;
  }
  return roles[0] ?? null;
}

function pad(s, n) {
  const t = String(s ?? '');
  return t.length >= n ? t.slice(0, n) : t + ' '.repeat(n - t.length);
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error('Variables manquantes : VITE_SUPABASE_URL / SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const sb = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: listErr } = await sb.auth.admin.listUsers({ perPage: 200, page: 1 });
  if (listErr) {
    console.error(listErr.message);
    process.exit(1);
  }
  const byEmail = new Map(authData.users.filter((u) => u.email).map((u) => [u.email, u]));

  const lines = [];
  /** org_id → effectif (comptes démo dont la flotte par défaut est dans cette org) */
  const orgVotes = new Map();

  for (const email of DEMO_EMAILS) {
    const user = byEmail.get(email);
    if (!user) {
      lines.push({
        email,
        user_id: null,
        role_affiche_app: '(absent)',
        flotte_active_defaut_id: null,
        flotte_active_defaut_nom: null,
        role_sur_flotte_active: null,
        org_id: null,
        org_nom: null,
        nb_flottes_actives: 0,
        note: 'Utilisateur introuvable dans auth.users',
      });
      continue;
    }

    const { data: rawRows, error: adhErr } = await sb
      .from('flotte_adhesions')
      .select('fleet_id, role, is_active, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (adhErr) {
      lines.push({
        email,
        user_id: user.id,
        role_affiche_app: '(erreur)',
        flotte_active_defaut_id: null,
        flotte_active_defaut_nom: null,
        role_sur_flotte_active: null,
        org_id: null,
        org_nom: null,
        nb_flottes_actives: 0,
        note: adhErr.message,
      });
      continue;
    }

    const mships = membershipsLikeApp(rawRows ?? []);
    const roles = mships.map((m) => m.role);
    const roleAffiche = highestRole(roles);
    const first = mships[0] ?? null;
    let fleetName = null;
    let orgId = null;
    let orgName = null;
    if (first?.fleet_id) {
      const { data: f } = await sb
        .from('flottes')
        .select('id, name, org_id, organisations(name)')
        .eq('id', first.fleet_id)
        .maybeSingle();
      fleetName = f?.name ?? null;
      orgId = f?.org_id ?? null;
      orgName = f?.organisations?.name ?? null;
    }

    if (orgId) {
      orgVotes.set(orgId, (orgVotes.get(orgId) ?? 0) + 1);
    }

    lines.push({
      email,
      user_id: user.id,
      role_affiche_app: roleAffiche,
      flotte_active_defaut_id: first?.fleet_id ?? null,
      flotte_active_defaut_nom: fleetName,
      role_sur_flotte_active: first?.role ?? null,
      org_id: orgId,
      org_nom: orgName,
      nb_flottes_actives: mships.length,
      note: '',
    });
  }

  let dominantOrgId = null;
  let maxVotes = 0;
  for (const [oid, n] of orgVotes) {
    if (n > maxVotes) {
      maxVotes = n;
      dominantOrgId = oid;
    }
  }

  let starterFleetId = null;
  let demoOrgNameResolved = null;
  if (dominantOrgId) {
    const { data: orgRow } = await sb
      .from('organisations')
      .select('id, name')
      .eq('id', dominantOrgId)
      .maybeSingle();
    demoOrgNameResolved = orgRow?.name ?? null;
    const { data: fl } = await sb
      .from('flottes')
      .select('id, name')
      .eq('org_id', dominantOrgId)
      .eq('name', DEMO_FLEET_STARTER_NAME)
      .limit(1)
      .maybeSingle();
    starterFleetId = fl?.id ?? null;
  }

  const { data: orgDupes } = await sb.from('organisations').select('id, name').eq('name', DEMO_ORG_NAME);

  for (const row of lines) {
    if (!row.user_id) continue;
    const parts = [];
    if (starterFleetId && row.flotte_active_defaut_id !== starterFleetId) {
      parts.push(
        `Flotte par défaut ≠ ${DEMO_FLEET_STARTER_NAME} ; tests stables : localStorage « esamba.active_fleet_id » = ${starterFleetId}`,
      );
    } else if (starterFleetId && row.flotte_active_defaut_id === starterFleetId) {
      parts.push(`Aligné ${DEMO_FLEET_STARTER_NAME}`);
    }
    if (
      row.role_affiche_app &&
      row.role_sur_flotte_active &&
      row.role_affiche_app !== row.role_sur_flotte_active
    ) {
      parts.push(
        'Incohérence : rôle global (hiérarchie) ≠ rôle sur la flotte active par défaut → écrans / RLS incohérents',
      );
    }
    row.note = parts.join(' · ');
  }

  console.log(
    JSON.stringify(
      {
        reference_demo: {
          org_nom_cible: DEMO_ORG_NAME,
          org_id_dominant_comptes_demo: dominantOrgId,
          org_nom_resolu: demoOrgNameResolved,
          flotte_starter_nom: DEMO_FLEET_STARTER_NAME,
          flotte_starter_id: starterFleetId,
          localStorage_key: 'esamba.active_fleet_id',
          alerte_homonymes_org:
            (orgDupes?.length ?? 0) > 1
              ? `${orgDupes.length} lignes « ${DEMO_ORG_NAME} » : utiliser org_id_dominant + flotte Starter de cette org pour les tests.`
              : null,
        },
        comptes: lines,
      },
      null,
      2,
    ),
  );

  console.log('\n--- Résumé tabulaire (copier dans un ticket) ---\n');
  const wEmail = 32;
  const wRole = 10;
  const wFleet = 38;
  const wOrg = 28;
  console.log(
    `${pad('email', wEmail)} ${pad('role_app', wRole)} ${pad('role_flotte', wRole)} ${pad('fleet_id', wFleet)} ${pad('org', wOrg)}`,
  );
  for (const row of lines) {
    console.log(
      `${pad(row.email, wEmail)} ${pad(row.role_affiche_app, wRole)} ${pad(row.role_sur_flotte_active, wRole)} ${pad(row.flotte_active_defaut_id, wFleet)} ${pad(row.org_nom ?? row.org_id, wOrg)}`,
    );
  }
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
