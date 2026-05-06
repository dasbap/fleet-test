import { describe, expect, it, beforeAll } from 'vitest';
import {
  bootstrapIntegrationAuth,
  canRunIntegrationAuthBootstrap,
  getMissingAuthEnv,
} from './_auth';

function computeFuelConsumptionLitersPer100km(liters: number, kmDelta: number): number | null {
  if (kmDelta <= 0) return null;
  return (liters / kmDelta) * 100;
}

function detectFuelAnomaly(consumption: number | null):
  | 'invalid_km'
  | 'high_consumption'
  | 'suspicious_low_consumption'
  | 'normal' {
  if (consumption === null) return 'invalid_km';
  if (consumption > 18) return 'high_consumption';
  if (consumption < 3) return 'suspicious_low_consumption';
  return 'normal';
}

const canRunIntegrationSuite = canRunIntegrationAuthBootstrap();
const describeIntegration = canRunIntegrationSuite ? describe : describe.skip;

describeIntegration('Fraude carburant - scoring simple', () => {
  let supabaseAdmin: Awaited<ReturnType<typeof bootstrapIntegrationAuth>>['admin'];

  beforeAll(async () => {
    const context = await bootstrapIntegrationAuth();
    supabaseAdmin = context.admin;
  });

  it('detecte une surconsommation suspecte', () => {
    const consumption = computeFuelConsumptionLitersPer100km(45, 150);
    const anomaly = detectFuelAnomaly(consumption);

    expect(Math.round(consumption!)).toBe(30);
    expect(anomaly).toBe('high_consumption');
  });

  it('detecte un kilometrage invalide', () => {
    const consumption = computeFuelConsumptionLitersPer100km(20, 0);
    const anomaly = detectFuelAnomaly(consumption);

    expect(consumption).toBeNull();
    expect(anomaly).toBe('invalid_km');
  });

  it('verifie qu un vehicule test existe avant scoring reel', async () => {
    const { data, error } = await supabaseAdmin
      .from('vehicules')
      .select('id,registration,current_km')
      .eq('registration', 'TEST-YAO-001')
      .single();

    expect(error).toBeNull();
    expect(data?.registration).toBe('TEST-YAO-001');
  });
});

if (!canRunIntegrationSuite) {
  // Commentaire explicite dans la sortie Vitest quand la suite est ignoree.
  console.warn(
    `[tests/integration] Suite ignoree: variables manquantes (${getMissingAuthEnv().join(', ')})`,
  );
}
