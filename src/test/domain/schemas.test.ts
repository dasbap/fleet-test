import { describe, expect, it } from 'vitest';
import { incidentCreateSchema, incidentDeclarationFormSchema } from '@/domain/schemas/incident.schema';
import { vehicleInsertSchema, vehicleCreateFormSchema } from '@/domain/schemas/vehicle.schema';
import {
  shiftClosureInsertSchema,
  shiftClosureFormSchema,
  shiftStartSchema,
} from '@/domain/schemas/driver-shift.schema';
import { parseSchemaOrThrow } from '@/domain/lib/parseSchema';

describe('incidentCreateSchema', () => {
  const base = {
    vehicle_id: 'v1',
    driver_user_id: 'd1',
    description: 'Description suffisante pour le terrain',
    severity: 'medium' as const,
  };

  it('rejette une description trop courte', () => {
    expect(() =>
      parseSchemaOrThrow(incidentCreateSchema, { ...base, description: 'court' }),
    ).toThrow(/10 caractères/);
  });

  it('accepte une description valide', () => {
    const parsed = parseSchemaOrThrow(incidentCreateSchema, base);
    expect(parsed.description).toBe(base.description);
  });

  it('exige latitude et longitude ensemble', () => {
    expect(() =>
      parseSchemaOrThrow(incidentCreateSchema, { ...base, latitude: 3.8 }),
    ).toThrow(/ensemble/);
  });
});

describe('incidentDeclarationFormSchema', () => {
  it('aligne la règle min(10) avec le service', () => {
    const result = incidentDeclarationFormSchema.safeParse({
      vehicle_id: 'v1',
      incident_category: 'breakdown',
      severity: 'low',
      description: 'abc',
      attachGeo: false,
    });
    expect(result.success).toBe(false);
  });
});

describe('vehicleInsertSchema', () => {
  it('rejette une immatriculation vide', () => {
    expect(() =>
      parseSchemaOrThrow(vehicleInsertSchema, {
        fleet_id: 'f1',
        registration: '   ',
      }),
    ).toThrow(/immatriculation/i);
  });

  it('accepte un insert minimal', () => {
    const parsed = parseSchemaOrThrow(vehicleInsertSchema, {
      fleet_id: 'f1',
      registration: ' AB-123 ',
    });
    expect(parsed.registration).toBe('AB-123');
  });
});

describe('vehicleCreateFormSchema', () => {
  it('exige marque et modèle', () => {
    const result = vehicleCreateFormSchema.safeParse({
      registration: 'X',
      brand: '',
      model: 'M',
      year: 2020,
      current_km: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('shiftClosureInsertSchema', () => {
  it('rejette un mode de collecte invalide', () => {
    expect(() =>
      parseSchemaOrThrow(shiftClosureInsertSchema, {
        shift_id: 's1',
        km_end: 100,
        revenue_declared: 5000,
        collection_mode: 'crypto',
        proof_type: 'photo',
        proof_value: 'x',
      }),
    ).toThrow(/collecte/i);
  });

  it('accepte cash', () => {
    const parsed = parseSchemaOrThrow(shiftClosureInsertSchema, {
      shift_id: 's1',
      km_end: 100,
      revenue_declared: 5000,
      collection_mode: 'cash',
      proof_type: 'photo',
      proof_value: 'data',
    });
    expect(parsed.collection_mode).toBe('cash');
  });
});

describe('shiftStartSchema', () => {
  it('rejette un km_start négatif', () => {
    expect(() =>
      parseSchemaOrThrow(shiftStartSchema, { assignment_id: 'a1', km_start: -1 }),
    ).toThrow(/négatif/);
  });
});

describe('shiftClosureFormSchema', () => {
  it('accepte le formulaire UI', () => {
    const parsed = parseSchemaOrThrow(shiftClosureFormSchema, {
      kmEnd: 120,
      revenueDeclared: 10000,
      collectionMode: 'momo',
    });
    expect(parsed.collectionMode).toBe('momo');
  });
});
