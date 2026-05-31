import { z } from 'zod';

export const PLANNED_SHIFT_STATUS_VALUES = [
  'draft',
  'confirmed',
  'started',
  'cancelled',
  'missed',
] as const;

/** Création d'un créneau planifié (manager). */
export const plannedShiftCreateSchema = z
  .object({
    fleet_id: z.string().min(1, "L'identifiant de flotte est requis"),
    driver_user_id: z.string().min(1, 'Le conducteur est requis'),
    vehicle_id: z.string().min(1, 'Le véhicule est requis'),
    planned_start: z.string().datetime({ message: 'Date de début invalide' }),
    planned_end: z.string().datetime({ message: 'Date de fin invalide' }).optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
  })
  .refine(
    (data) => !data.planned_end || new Date(data.planned_end) > new Date(data.planned_start),
    { message: 'La fin doit être postérieure au début', path: ['planned_end'] },
  );

export type PlannedShiftCreateParsed = z.infer<typeof plannedShiftCreateSchema>;
