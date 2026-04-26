/**
 * Tests d'intégration pour la création de flotte
 * 
 * Ces tests vérifient le flux complet de création d'une flotte :
 * 1. Création d'une organisation
 * 2. Création d'une flotte
 * 3. Ajout de l'utilisateur comme organizer
 * 4. Vérification que toutes les données sont créées correctement
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Configuration pour les tests
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const testIntegrationUserId = process.env.TEST_INTEGRATION_USER_ID || '';
const testIntegrationEmail = process.env.TEST_INTEGRATION_EMAIL || 'integration.tests@esamba.test';
const testIntegrationPassword = process.env.TEST_INTEGRATION_PASSWORD || 'Integration2025!';

if (!supabaseUrl) {
  throw new Error('La variable d\'environnement VITE_SUPABASE_URL doit être définie');
}

const canRunIntegrationSuite = Boolean(
  supabaseServiceRoleKey && supabaseAnonKey && testIntegrationUserId,
);
const describeIntegration = canRunIntegrationSuite ? describe : describe.skip;

const supabaseAdmin = canRunIntegrationSuite
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

const supabaseUser = canRunIntegrationSuite
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

describeIntegration('Création de flotte - Tests d\'intégration', () => {
  let testUserId: string;
  let testOrgId: string;
  let testFleetId: string;
  const testOrgName = `Test Organisation ${Date.now()}`;
  const testFleetName = `Test Flotte ${Date.now()}`;

  beforeAll(async () => {
    testUserId = testIntegrationUserId;
    const { error } = await supabaseUser!.auth.signInWithPassword({
      email: testIntegrationEmail,
      password: testIntegrationPassword,
    });
    expect(error).toBeNull();
  });

  afterAll(async () => {
    // Nettoyer les données de test
    if (testFleetId) {
      // Supprimer les membreships
      await supabaseAdmin!
        .from('flotte_adhesions')
        .delete()
        .eq('fleet_id', testFleetId);
      
      // Supprimer la flotte
      await supabaseAdmin!
        .from('flottes')
        .delete()
        .eq('id', testFleetId);
    }

    if (testOrgId) {
      // Supprimer l'organisation
      await supabaseAdmin!
        .from('organisations')
        .delete()
        .eq('id', testOrgId);
    }
  });

  it('devrait créer une organisation', async () => {
    const { data, error } = await supabaseAdmin!
      .from('organisations')
      .insert({
        name: testOrgName,
        country_code: 'CM',
      })
      .select('id')
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.id).toBeDefined();
    testOrgId = data.id;
  });

  it('devrait créer une flotte via la fonction RPC creer_flotte_esamba', async () => {
    const { data, error } = await supabaseAdmin!.rpc('creer_flotte_esamba', {
      p_org_id: testOrgId,
      p_name: testFleetName,
      p_collection_policy: 'mix',
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(typeof data).toBe('string'); // UUID de la flotte
    testFleetId = data;
  });

  it('devrait ajouter l\'utilisateur comme organizer via creer_ou_mettre_a_jour_adhesion_flotte', async () => {
    const { data, error } = await supabaseUser!.rpc('creer_ou_mettre_a_jour_adhesion_flotte', {
      p_fleet_id: testFleetId,
      p_user_id: testUserId,
      p_role: 'organizer',
      p_is_active: true,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(typeof data).toBe('string'); // UUID du membership
  });

  it('devrait vérifier que le membership existe', async () => {
    const { data, error } = await supabaseAdmin!
      .from('flotte_adhesions')
      .select('*')
      .eq('fleet_id', testFleetId)
      .eq('user_id', testUserId)
      .eq('role', 'organizer')
      .eq('is_active', true)
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.role).toBe('organizer');
    expect(data?.is_active).toBe(true);
  });

  it('devrait créer un véhicule via la fonction RPC creer_vehicule_esamba', async () => {
    const { data, error } = await supabaseAdmin!.rpc('creer_vehicule_esamba', {
      p_fleet_id: testFleetId,
      p_registration: 'TEST-001',
      p_brand: 'Toyota',
      p_model: 'Corolla',
      p_year: 2020,
      p_current_km: 0,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(typeof data).toBe('string'); // UUID du véhicule
  });

  it('devrait créer une invitation via la fonction RPC creer_invitation_esamba', async () => {
    const { data, error } = await supabaseAdmin!.rpc('creer_invitation_esamba', {
      p_fleet_id: testFleetId,
      p_code: 'TEST-2024',
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data).toBe('TEST-2024');
  });

  it('devrait vérifier que toutes les données sont créées (verifier_esamba_2024)', async () => {
    // Note: Cette fonction vérifie spécifiquement les données ESAMBA-2024
    // Pour les tests, on vérifie manuellement les données créées
    const { data: fleet } = await supabaseAdmin!
      .from('flottes')
      .select('*')
      .eq('id', testFleetId)
      .single();

    expect(fleet).toBeDefined();
    expect(fleet?.name).toBe(testFleetName);

    const { data: membership } = await supabaseAdmin!
      .from('flotte_adhesions')
      .select('*')
      .eq('fleet_id', testFleetId)
      .eq('user_id', testUserId)
      .single();

    expect(membership).toBeDefined();
    expect(membership?.role).toBe('organizer');
  });
});
