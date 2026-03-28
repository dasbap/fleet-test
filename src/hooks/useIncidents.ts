import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { storageService } from '@/lib/storage/storageService';
import { IncidentService } from '@/services/incident.service';
import { IncidentRepository } from '@/repositories/incident.repository';
import { IncidentEvidenceRepository } from '@/repositories/incident-evidence.repository';
import { MaintenanceService } from '@/services/maintenance.service';
import { MaintenanceRepository } from '@/repositories/maintenance.repository';
import type { IncidentCategory } from '@/types/incident-declaration';

// Instances singleton des services et repositories
const incidentRepository = new IncidentRepository();
const incidentEvidenceRepository = new IncidentEvidenceRepository();
const incidentService = new IncidentService(incidentRepository, incidentEvidenceRepository);
const maintenanceRepository = new MaintenanceRepository();
const maintenanceService = new MaintenanceService(maintenanceRepository);

// Réexporter les types pour compatibilité
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Incident {
  id: string;
  vehicle_id: string;
  driver_user_id: string;
  severity: IncidentSeverity;
  description: string;
  incident_category: string | null;
  evidence_path: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  // Joined data
  vehicle?: {
    id: string;
    registration: string;
    brand: string | null;
    model: string | null;
    fleet_id: string;
  } | null;
  driver?: {
    user_id: string;
    full_name: string | null;
  } | null;
}

export interface IncidentInsert {
  vehicle_id: string;
  description: string;
  severity?: IncidentSeverity;
  incident_category?: string | null;
  evidence_path?: string;
  latitude?: number | null;
  longitude?: number | null;
}

/** Entrée du formulaire « Déclarer un incident » (sans driver_user_id, géré par le hook). */
export interface DeclareIncidentInput {
  vehicle_id: string;
  description: string;
  severity: IncidentSeverity;
  incident_category: IncidentCategory;
  attachGeo: boolean;
  latitude?: number | null;
  longitude?: number | null;
  /** Data URL ou chaîne base64 (photo). */
  evidenceDataUrl?: string | null;
}

const MAX_OFFLINE_PHOTO_CHARS = 2_000_000;

function buildIncidentInsertFromDeclare(
  input: DeclareIncidentInput,
  driverUserId: string,
) {
  const geo =
    input.attachGeo &&
    input.latitude != null &&
    input.longitude != null &&
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude)
      ? { latitude: input.latitude, longitude: input.longitude }
      : {};
  return {
    vehicle_id: input.vehicle_id,
    driver_user_id: driverUserId,
    description: input.description.trim(),
    severity: input.severity,
    incident_category: input.incident_category,
    ...geo,
  };
}

export function useIncidents(fleetId?: string) {
  return useQuery({
    queryKey: ['incidents', fleetId],
    queryFn: () => incidentService.getIncidents(fleetId),
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();
  const { user, userFleetId } = useAuth();

  return useMutation({
    mutationFn: async (incident: IncidentInsert) => {
      if (!user) throw new Error('Utilisateur non connecté');

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (!userFleetId) {
          throw new Error(
            'Contexte flotte indisponible : reconnectez-vous pour signaler hors ligne.',
          );
        }
        const draft = storageService.saveIncidentDeclarationDraft({
          fleetId: userFleetId,
          vehicleId: incident.vehicle_id,
          driverUserId: user.id,
          description: incident.description,
          severity: incident.severity ?? 'medium',
        });
        return { kind: 'queued' as const, draftId: draft.id };
      }

      const created = await incidentService.createIncident({
        ...incident,
        driver_user_id: user.id,
      });
      return { kind: 'created' as const, incident: created };
    },
    onSuccess: (data) => {
      if (data.kind === 'queued') {
        toast({
          title: 'Hors ligne',
          description:
            'Signalement enregistré sur l’appareil. Il sera synchronisé à la reconnexion.',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast({
        title: 'Incident signalé',
        description: 'L\'incident a été enregistré avec succès.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeclareIncident() {
  const queryClient = useQueryClient();
  const { user, userFleetId } = useAuth();

  return useMutation({
    mutationFn: async (input: DeclareIncidentInput) => {
      if (!user) throw new Error('Utilisateur non connecté');
      if (!userFleetId) {
        throw new Error('Aucune flotte active. Sélectionnez une flotte avant de signaler.');
      }

      const evidence = input.evidenceDataUrl?.trim() ?? null;
      if (
        evidence &&
        typeof navigator !== 'undefined' &&
        !navigator.onLine &&
        evidence.length > MAX_OFFLINE_PHOTO_CHARS
      ) {
        throw new Error(
          'Photo trop volumineuse hors ligne. Réduisez la taille ou envoyez sans photo.',
        );
      }

      const base = buildIncidentInsertFromDeclare(input, user.id);

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const hasGeo =
          input.attachGeo &&
          input.latitude != null &&
          input.longitude != null &&
          Number.isFinite(input.latitude) &&
          Number.isFinite(input.longitude);
        const draft = storageService.saveIncidentDeclarationDraft({
          fleetId: userFleetId,
          vehicleId: input.vehicle_id,
          driverUserId: user.id,
          description: base.description,
          severity: base.severity ?? 'medium',
          incidentCategory: input.incident_category,
          latitude: hasGeo ? input.latitude! : null,
          longitude: hasGeo ? input.longitude! : null,
          evidenceDataUrl: evidence,
        });
        return { kind: 'queued' as const, draftId: draft.id };
      }

      const created = await incidentService.declareIncidentWithOptionalEvidence({
        fleetId: userFleetId,
        incident: base,
        evidenceDataUrl: evidence,
      });
      return { kind: 'created' as const, incident: created };
    },
    onSuccess: (data) => {
      if (data.kind === 'queued') {
        toast({
          title: 'Enregistré hors ligne',
          description:
            'Votre signalement est en brouillon sur l’appareil. Il sera synchronisé à la reconnexion.',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast({
        title: 'Incident enregistré',
        description: 'Le signalement a bien été transmis.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Hook to create a maintenance job from an incident
export function useCreateMaintenanceFromIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      incident_id,
      vehicle_id,
      fleet_id,
      priority,
    }: {
      incident_id: string;
      vehicle_id: string;
      fleet_id: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
    }) => {
      return maintenanceService.createFromIncident(incident_id, vehicle_id, fleet_id, priority);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-jobs'] });
      toast({
        title: 'Intervention créée',
        description: 'L\'incident a été converti en intervention de maintenance.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
