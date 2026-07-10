import { supabase } from '@/integrations/supabase/client';

import type { CollectionMode } from '@/domain/constants/collectionMode';

export type { CollectionMode };
export type ShiftStatus = 'open' | 'closed';

export interface DriverShift {
  id: string;
  assignment_id: string;
  km_start: number;
  km_end: number | null;
  started_at: string;
  ended_at: string | null;
  status: ShiftStatus;
  // Joined data via assignment
  assignment?: {
    id: string;
    fleet_id: string;
    vehicle_id: string;
    driver_user_id: string;
    vehicle?: {
      id: string;
      registration: string;
      brand: string | null;
      model: string | null;
    } | null;
    driver?: {
      user_id: string;
      full_name: string | null;
    } | null;
  } | null;
}

export interface ShiftClosure {
  id: string;
  shift_id: string;
  revenue_declared: number;
  expected_revenue: number | null;
  revenue_gap: number | null;
  collection_mode: CollectionMode;
  proof_type: string;
  proof_value: string;
  status: 'pending' | 'validated' | 'rejected';
  validated_by: string | null;
  validated_at: string | null;
  created_at: string;
}

export interface ShiftInsert {
  assignment_id: string;
  km_start: number;
  client_idempotency_key?: string | null;
}

export interface ShiftClosureInsert {
  shift_id: string;
  km_end: number;
  revenue_declared: number;
  collection_mode: CollectionMode;
  proof_type: string;
  proof_value: string;
  client_idempotency_key?: string | null;
}

export interface ShiftClosureUpdate {
  status?: 'pending' | 'validated' | 'rejected';
  validated_by?: string | null;
  validated_at?: string | null;
}

/** Clôture en attente de validation, enrichie pour la supervision flotte. */
export interface PendingFleetClosure {
  id: string;
  created_at: string;
  vehicleRegistration: string | null;
  revenue_declared: number;
  collection_mode: CollectionMode;
  kmStart: number | null;
  kmEnd: number | null;
  driverName: string | null;
}

/**
 * Repository pour l'accès aux données des créneaux conducteurs
 */
const SHIFT_ASSIGNMENT_SELECT = `
  *,
  assignment:affectations_vehicules!creneaux_conducteurs_assignment_id_fkey(
    id,
    fleet_id,
    vehicle_id,
    driver_user_id,
    vehicle:vehicules!affectations_vehicules_vehicle_id_fkey(
      id,
      registration,
      brand,
      model
    )
  )
`;

export class DriverShiftRepository {
  private async attachDriverProfiles<T extends DriverShift>(shifts: T[]): Promise<T[]> {
    const driverIds = Array.from(
      new Set(
        shifts
          .map((shift) => shift.assignment?.driver_user_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (driverIds.length === 0) {
      return shifts;
    }

    const { data, error } = await supabase
      .from('profils')
      .select('user_id, full_name')
      .in('user_id', driverIds);

    if (error) {
      console.warn('Unable to enrich shifts with driver profiles:', error);
      return shifts;
    }

    const profilesById = new Map(
      (data || []).map((profile: { user_id: string; full_name: string | null }) => [
        profile.user_id,
        profile,
      ]),
    );

    return shifts.map((shift) => {
      const driverUserId = shift.assignment?.driver_user_id;
      const profile = driverUserId ? profilesById.get(driverUserId) : null;
      if (!shift.assignment || !profile) {
        return shift;
      }

      return {
        ...shift,
        assignment: {
          ...shift.assignment,
          driver: profile,
        },
      };
    });
  }

  private async attachDriverProfile<T extends DriverShift>(shift: T | null): Promise<T | null> {
    if (!shift) {
      return null;
    }

    const [enriched] = await this.attachDriverProfiles([shift]);
    return enriched ?? shift;
  }
  /**
   * Indique si le conducteur a au moins un créneau (toute flotte confondue).
   */
  async hasDriverEverOpenedShift(driverUserId: string): Promise<boolean> {
    const { data: assignments, error: aErr } = await supabase
      .from("affectations_vehicules")
      .select("id")
      .eq("driver_user_id", driverUserId);

    if (aErr || !assignments?.length) return false;

    const assignmentIds = assignments.map((a) => a.id);
    const { count, error } = await supabase
      .from("creneaux_conducteurs")
      .select("id", { count: "exact", head: true })
      .in("assignment_id", assignmentIds);

    if (error) {
      console.error("hasDriverEverOpenedShift:", error);
      return false;
    }
    return (count ?? 0) > 0;
  }

  /**
   * Récupère le créneau actif d'un conducteur
   */
  async findActiveShiftByDriverId(driverId: string): Promise<DriverShift | null> {
    // Récupérer l'affectation active du conducteur
    const { data: assignmentData } = await supabase
      .from('affectations_vehicules')
      .select('id')
      .eq('driver_user_id', driverId)
      .eq('is_active', true)
      .maybeSingle();

    if (!assignmentData) {
      return null;
    }

    // Récupérer le créneau actif pour cette affectation
    const { data, error } = await supabase
      .from('creneaux_conducteurs')
      .select(SHIFT_ASSIGNMENT_SELECT)
      .eq('assignment_id', assignmentData.id)
      .eq('status', 'open')
      .maybeSingle();

    if (error) {
      console.error('Error fetching active shift:', error);
      throw new Error(error.message);
    }

    return this.attachDriverProfile(data as DriverShift | null);
  }

  /**
   * Récupère tous les créneaux d'un conducteur
   */
  async findAllByDriverId(driverId: string, limit: number = 20): Promise<DriverShift[]> {
    // Récupérer toutes les affectations du conducteur
    const { data: assignmentsData } = await supabase
      .from('affectations_vehicules')
      .select('id')
      .eq('driver_user_id', driverId);

    if (!assignmentsData || assignmentsData.length === 0) {
      return [];
    }

    const assignmentIds = assignmentsData.map((a) => a.id);

    // Récupérer les créneaux pour ces affectations
    const { data, error } = await supabase
      .from('creneaux_conducteurs')
      .select(SHIFT_ASSIGNMENT_SELECT)
      .in('assignment_id', assignmentIds)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching shifts:', error);
      throw new Error(error.message);
    }

    return this.attachDriverProfiles((data || []) as DriverShift[]);
  }

  /**
   * Récupère un créneau par son ID
   */
  async findById(shiftId: string): Promise<DriverShift | null> {
    const { data, error } = await supabase
      .from('creneaux_conducteurs')
      .select(SHIFT_ASSIGNMENT_SELECT)
      .eq('id', shiftId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching shift:', error);
      throw new Error(error.message);
    }

    return this.attachDriverProfile((data as DriverShift | null) ?? null);
  }

  /**
   * Crée un nouveau créneau (démarre un créneau)
   */
  async create(shift: ShiftInsert): Promise<DriverShift> {
    const { data, error } = await supabase
      .from('creneaux_conducteurs')
      .insert({
        assignment_id: shift.assignment_id,
        km_start: shift.km_start,
        status: 'open',
        client_idempotency_key: shift.client_idempotency_key ?? null,
      })
      .select(`
        *,
        assignment:affectations_vehicules!creneaux_conducteurs_assignment_id_fkey(
          id,
          fleet_id,
          vehicle_id,
          driver_user_id,
          vehicle:vehicules!affectations_vehicules_vehicle_id_fkey(
            id,
            registration,
            brand,
            model
          )
        )
      `)
      .single();

    if (error) {
      console.error('Error creating shift:', error);
      throw new Error(error.message);
    }

    return data as DriverShift;
  }

  /**
   * Ferme un créneau via la fonction RPC
   */
  async closeShift(closure: ShiftClosureInsert): Promise<void> {
    const { error } = await supabase.rpc('fermer_creneau', {
      p_creneau_id: closure.shift_id,
      p_km_fin: closure.km_end,
      p_revenu_declare: closure.revenue_declared,
      p_mode_collecte: closure.collection_mode,
      p_type_preuve: closure.proof_type,
      p_valeur_preuve: closure.proof_value,
      p_idempotency_key: closure.client_idempotency_key ?? null,
    });

    if (error) {
      console.error('Error closing shift:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Calcule la recette attendue pour un créneau
   */
  async calculateExpectedRevenue(shiftId: string): Promise<void> {
    const { error } = await supabase.rpc('calculer_recette_attendue', {
      p_shift_id: shiftId,
    });

    if (error) {
      console.warn('Error calculating expected revenue:', error);
      // Ne pas bloquer si cette étape échoue
    }
  }

  /**
   * Récupère le véhicule associé à un créneau
   */
  async getVehicleIdByShiftId(shiftId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('creneaux_conducteurs')
      .select(`
        assignment:affectations_vehicules!creneaux_conducteurs_assignment_id_fkey(
          vehicle_id
        )
      `)
      .eq('id', shiftId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching vehicle ID:', error);
      return null;
    }

    return (data as { assignment?: { vehicle_id?: string } } | null)?.assignment
      ?.vehicle_id || null;
  }

  /**
   * Récupère la clôture la plus récente d'un créneau (s'il existe).
   */
  async findClosureByShiftId(shiftId: string): Promise<ShiftClosure | null> {
    const { data, error } = await supabase
      .from('clotures_creneaux')
      .select('*')
      .eq('shift_id', shiftId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching closure by shift:', error);
      throw new Error(error.message);
    }

    return (data as ShiftClosure | null) ?? null;
  }

  /**
   * Récupère toutes les clôtures d'un conducteur
   */
  async findAllClosuresByDriverId(driverId: string): Promise<ShiftClosure[]> {
    // Récupérer les affectations du conducteur
    const { data: assignmentsData } = await supabase
      .from('affectations_vehicules')
      .select('id')
      .eq('driver_user_id', driverId);

    if (!assignmentsData || assignmentsData.length === 0) {
      return [];
    }

    const assignmentIds = assignmentsData.map((a) => a.id);

    // Récupérer les créneaux pour ces affectations
    const { data: shiftsData } = await supabase
      .from('creneaux_conducteurs')
      .select('id')
      .in('assignment_id', assignmentIds);

    if (!shiftsData || shiftsData.length === 0) {
      return [];
    }

    const shiftIds = shiftsData.map((s) => s.id);

    // Récupérer les clôtures pour ces créneaux
    const { data, error } = await supabase
      .from('clotures_creneaux')
      .select('*')
      .in('shift_id', shiftIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching closures:', error);
      return [];
    }

    return (data || []) as ShiftClosure[];
  }

  /**
   * Met à jour une clôture (validation/rejet)
   */
  async updateClosure(closureId: string, updates: ShiftClosureUpdate): Promise<ShiftClosure> {
    const { data, error } = await supabase
      .from('clotures_creneaux')
      .update(updates)
      .eq('id', closureId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error updating closure:', error);
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('Clôture introuvable ou accès refusé');
    }

    return data as ShiftClosure;
  }

  /**
   * Récupère les clôtures en attente de validation
   */
  async findPendingClosures(): Promise<ShiftClosure[]> {
    const { data, error } = await supabase
      .from('clotures_creneaux')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending closures:', error);
      throw new Error(error.message);
    }
    return (data || []) as ShiftClosure[];
  }

  /**
   * Récupère les clôtures validées depuis une date (pour calcul recette)
   */
  async findValidatedClosuresSince(sinceIso: string): Promise<{ revenue_declared: number }[]> {
    const { data, error } = await supabase
      .from('clotures_creneaux')
      .select('revenue_declared')
      .gte('created_at', sinceIso)
      .eq('status', 'validated');

    if (error) {
      console.error('Error fetching validated closures:', error);
      throw new Error(error.message);
    }
    return (data || []) as { revenue_declared: number }[];
  }

  /**
   * Créneaux ouverts pour une flotte (missions / circulation du jour côté supervision).
   */
  async findOpenShiftsByFleetId(fleetId: string): Promise<DriverShift[]> {
    const { data, error } = await supabase
      .from('creneaux_conducteurs')
      .select(SHIFT_ASSIGNMENT_SELECT)
      .eq('status', 'open')
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching open shifts for fleet:', error);
      throw new Error(error.message);
    }

    const rows = await this.attachDriverProfiles((data || []) as DriverShift[]);
    return rows.filter((s) => s.assignment?.fleet_id === fleetId);
  }

  /**
   * Clôtures en attente de validation pour une flotte (via affectations → créneaux).
   */
  async findPendingClosuresForFleet(fleetId: string): Promise<PendingFleetClosure[]> {
    const { data: assignments, error: e1 } = await supabase
      .from('affectations_vehicules')
      .select('id, vehicle_id')
      .eq('fleet_id', fleetId);

    if (e1) {
      console.error('Error fetching assignments for pending closures:', e1);
      throw new Error(e1.message);
    }

    const assignmentIds = (assignments || []).map((a) => a.id);
    if (assignmentIds.length === 0) {
      return [];
    }

    const { data: shifts, error: e2 } = await supabase
      .from('creneaux_conducteurs')
      .select(`
        id,
        assignment_id,
        km_start,
        km_end,
        assignment:affectations_vehicules!creneaux_conducteurs_assignment_id_fkey(
          vehicle_id,
          driver_user_id
        )
      `)
      .in('assignment_id', assignmentIds);

    if (e2) {
      console.error('Error fetching shifts for pending closures:', e2);
      throw new Error(e2.message);
    }

    const shiftIds = (shifts || []).map((s) => s.id as string);
    if (shiftIds.length === 0) {
      return [];
    }

    const { data: vehicles } = await supabase
      .from('vehicules')
      .select('id, registration')
      .in(
        'id',
        (assignments || []).map((a: { vehicle_id: string }) => a.vehicle_id)
      );

    const regByVehicleId = new Map((vehicles || []).map((v: { id: string; registration: string }) => [v.id, v.registration]));
    const driverIds = Array.from(
      new Set(
        (shifts || [])
          .map((s) => (s as { assignment?: { driver_user_id?: string } | null }).assignment?.driver_user_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const { data: profiles, error: profileError } = driverIds.length > 0
      ? await supabase.from('profils').select('user_id, full_name').in('user_id', driverIds)
      : { data: [], error: null };

    if (profileError) {
      console.warn('Unable to enrich pending closures with driver profiles:', profileError);
    }

    const profileById = new Map(
      (profiles || []).map((p: { user_id: string; full_name: string | null }) => [p.user_id, p]),
    );

    type ShiftRow = {
      id: string;
      assignment_id: string;
      km_start: number;
      km_end: number | null;
      assignment?: {
        vehicle_id: string;
        driver_user_id: string;
      } | null;
    };

    const detailsByShift = new Map<
      string,
      {
        vehicleRegistration: string | null;
        kmStart: number;
        kmEnd: number | null;
        driverName: string | null;
      }
    >();

    (shifts || []).forEach((raw) => {
      const s = raw as ShiftRow;
      const vid = s.assignment?.vehicle_id
        ?? (assignments || []).find((a: { id: string }) => a.id === s.assignment_id)?.vehicle_id;
      detailsByShift.set(s.id, {
        vehicleRegistration: vid ? regByVehicleId.get(vid) ?? null : null,
        kmStart: s.km_start,
        kmEnd: s.km_end,
        driverName: s.assignment?.driver_user_id
          ? profileById.get(s.assignment.driver_user_id)?.full_name ?? null
          : null,
      });
    });

    const { data: closures, error: e3 } = await supabase
      .from('clotures_creneaux')
      .select('id, created_at, shift_id, revenue_declared, collection_mode')
      .eq('status', 'pending')
      .in('shift_id', shiftIds)
      .order('created_at', { ascending: false })
      .limit(50);

    if (e3) {
      console.error('Error fetching pending closures:', e3);
      throw new Error(e3.message);
    }

    return (closures || []).map(
      (c: {
        id: string;
        created_at: string;
        shift_id: string;
        revenue_declared: number;
        collection_mode: CollectionMode;
      }) => {
        const details = detailsByShift.get(c.shift_id);
        return {
          id: c.id,
          created_at: c.created_at,
          vehicleRegistration: details?.vehicleRegistration ?? null,
          revenue_declared: c.revenue_declared,
          collection_mode: c.collection_mode,
          kmStart: details?.kmStart ?? null,
          kmEnd: details?.kmEnd ?? null,
          driverName: details?.driverName ?? null,
        };
      },
    );
  }

  /**
   * Nombre d'affectations actives pour une flotte
   */
  async findActiveAssignmentsCountByFleet(fleetId: string): Promise<number> {
    const { count, error } = await supabase
      .from('affectations_vehicules')
      .select('id', { count: 'exact', head: true })
      .eq('fleet_id', fleetId)
      .eq('is_active', true);

    if (error) {
      console.error('Error counting active assignments:', error);
      throw new Error(error.message);
    }
    return count ?? 0;
  }
}
