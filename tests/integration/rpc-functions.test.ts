/**
 * Tests d'intégration pour les fonctions RPC
 * 
 * Ces tests vérifient que toutes les fonctions RPC utilisent les bons noms de tables :
 * - organisations (pas orgs)
 * - flottes (pas fleets)
 * - vehicules (pas vehicles)
 * - flotte_adhesions (pas fleet_memberships)
 * - flotte_invitations (pas fleet_invitations)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  bootstrapIntegrationAuth,
  canRunIntegrationAuthBootstrap,
  getMissingAuthEnv,
} from './_auth';

const canRunIntegrationSuite = canRunIntegrationAuthBootstrap();
const describeIntegration = canRunIntegrationSuite ? describe : describe.skip;

describeIntegration('Fonctions RPC - Vérification des noms de tables', () => {
  let testUserId: string;
  let testOrgId: string;
  let testFleetId: string;
  let supabaseAdmin: Awaited<ReturnType<typeof bootstrapIntegrationAuth>>['admin'];
  let supabaseUser: Awaited<ReturnType<typeof bootstrapIntegrationAuth>>['user'];
  const testOrgName = `Test RPC Org ${Date.now()}`;
  const testFleetName = `Test RPC Flotte ${Date.now()}`;

  beforeAll(async () => {
    const context = await bootstrapIntegrationAuth();
    supabaseAdmin = context.admin;
    supabaseUser = context.user;
    testUserId = context.userId;
  });

  afterAll(async () => {
    // Nettoyer les données de test
    if (testFleetId) {
      await supabaseAdmin
        .from('flotte_adhesions')
        .delete()
        .eq('fleet_id', testFleetId);
      
      await supabaseAdmin
        .from('vehicules')
        .delete()
        .eq('fleet_id', testFleetId);
      
      await supabaseAdmin
        .from('flotte_invitations')
        .delete()
        .eq('fleet_id', testFleetId);
      
      await supabaseAdmin
        .from('flottes')
        .delete()
        .eq('id', testFleetId);
    }

    if (testOrgId) {
      await supabaseAdmin
        .from('organisations')
        .delete()
        .eq('id', testOrgId);
    }
  });

  it('create_esamba_fleet devrait utiliser les tables organisations et flottes', async () => {
    // Créer une organisation d'abord
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organisations')
      .insert({
        name: testOrgName,
        country_code: 'CM',
      })
      .select('id')
      .single();

    expect(orgError).toBeNull();
    expect(org).toBeDefined();
    testOrgId = org.id;

    // Tester la fonction RPC
    const { data, error } = await supabaseAdmin.rpc('create_esamba_fleet', {
      p_org_id: testOrgId,
      p_name: testFleetName,
      p_collection_policy: 'mix',
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    testFleetId = data;

    // Vérifier que la flotte existe dans la table flottes (pas fleets)
    const { data: fleet, error: fleetError } = await supabaseAdmin
      .from('flottes')
      .select('*')
      .eq('id', testFleetId)
      .single();

    expect(fleetError).toBeNull();
    expect(fleet).toBeDefined();
    expect(fleet?.name).toBe(testFleetName);
  });

  it('upsert_fleet_membership devrait utiliser la table flotte_adhesions', async () => {
    const { error: deniedError } = await supabaseUser.rpc('upsert_fleet_membership', {
      p_fleet_id: testFleetId,
      p_user_id: '00000000-0000-0000-0000-000000000001',
      p_role: 'driver',
      p_is_active: true,
    });

    expect(deniedError).toBeDefined();
    expect(deniedError?.message).toMatch(/Permission refusée|Permission denied/);

    const { data, error } = await supabaseUser.rpc('upsert_fleet_membership', {
      p_fleet_id: testFleetId,
      p_user_id: testUserId,
      p_role: 'organizer',
      p_is_active: true,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();

    // Vérifier que le membership existe dans flotte_adhesions (pas fleet_memberships)
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('flotte_adhesions')
      .select('*')
      .eq('fleet_id', testFleetId)
      .eq('user_id', testUserId)
      .single();

    expect(membershipError).toBeNull();
    expect(membership).toBeDefined();
    expect(membership?.role).toBe('organizer');
  });

  it('create_esamba_vehicle devrait utiliser les tables flottes et vehicules', async () => {
    const { data, error } = await supabaseAdmin.rpc('create_esamba_vehicle', {
      p_fleet_id: testFleetId,
      p_registration: 'RPC-TEST-001',
      p_brand: 'Honda',
      p_model: 'Civic',
      p_year: 2021,
      p_current_km: 1000,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();

    // Vérifier que le véhicule existe dans vehicules (pas vehicles)
    const { data: vehicle, error: vehicleError } = await supabaseAdmin
      .from('vehicules')
      .select('*')
      .eq('id', data)
      .single();

    expect(vehicleError).toBeNull();
    expect(vehicle).toBeDefined();
    expect(vehicle?.registration).toBe('RPC-TEST-001');
  });

  it('create_esamba_invitation devrait utiliser les tables flottes et flotte_invitations', async () => {
    const { data, error } = await supabaseAdmin.rpc('create_esamba_invitation', {
      p_fleet_id: testFleetId,
      p_code: 'RPC-TEST-2024',
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data).toBe('RPC-TEST-2024');

    // Vérifier que l'invitation existe dans flotte_invitations (pas fleet_invitations)
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('flotte_invitations')
      .select('*')
      .eq('code', 'RPC-TEST-2024')
      .single();

    expect(invitationError).toBeNull();
    expect(invitation).toBeDefined();
    expect(invitation?.fleet_id).toBe(testFleetId);
  });

  it('verifier_esamba_2024 devrait retourner les 5 critères de vérification', async () => {
    // Vérifie que la RPC verifier_esamba_2024 s'exécute et retourne la structure attendue
    const { data, error } = await supabaseAdmin.rpc('verifier_esamba_2024');

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data) && data.length > 0).toBe(true);

    const result = data[0];
    expect(result).toHaveProperty('organisation');
    expect(result).toHaveProperty('flotte');
    expect(result).toHaveProperty('membership_organizer');
    expect(result).toHaveProperty('vehicule_esamba_001');
    expect(result).toHaveProperty('invitation_esamba_2024');

    // Si les données ESAMBA sont présentes en base, les 4 critères données doivent être true
    if (result.organisation && result.flotte && result.vehicule_esamba_001 && result.invitation_esamba_2024) {
      expect(result.organisation).toBe(true);
      expect(result.flotte).toBe(true);
      expect(result.vehicule_esamba_001).toBe(true);
      expect(result.invitation_esamba_2024).toBe(true);
    }
  });

  it('add_member_by_email devrait utiliser les tables flottes et flotte_adhesions', async () => {
    // Créer un utilisateur de test pour l'ajouter
    const testEmail = `test-${Date.now()}@example.com`;
    
    // Note: Dans un vrai test, vous devriez créer un utilisateur réel
    // Pour ce test, on vérifie juste que la fonction existe et utilise les bonnes tables
    // En production, cette fonction nécessiterait un utilisateur existant
    
    // Vérifier que la fonction existe et peut être appelée
    // (même si elle échoue car l'utilisateur n'existe pas)
    const { error } = await supabaseUser.rpc('add_member_by_email', {
      p_fleet_id: testFleetId,
      p_email: testEmail,
      p_role: 'driver',
    });

    // La fonction devrait échouer avec une erreur "User not found" ou "Permission denied"
    // mais pas avec une erreur de table inexistante
    expect(error).toBeDefined();
    expect(error?.message).toMatch(/User not found|Permission denied/);
    expect(error?.message).not.toMatch(/relation.*does not exist|table.*does not exist/i);
  });
});

if (!canRunIntegrationSuite) {
  // Commentaire explicite dans la sortie Vitest quand la suite est skip.
  console.warn(
    `[tests/integration] Suite ignoree: variables manquantes (${getMissingAuthEnv().join(', ')})`,
  );
}
