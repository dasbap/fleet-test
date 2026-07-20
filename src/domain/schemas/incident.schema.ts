import { z } from 'zod';
import {
  INCIDENT_CATEGORY_VALUES,
  type IncidentCategory,
} from '@/domain/constants/incidentCategories';

const incidentCategoryTuple = INCIDENT_CATEGORY_VALUES as unknown as [
  IncidentCategory,
  ...IncidentCategory[],
];

const incidentSeverityTuple = ['low', 'medium', 'high', 'critical'] as const;

export const incidentSeveritySchema = z.enum(incidentSeverityTuple);

/** Création / mise à jour côté service (aligné repository `IncidentInsert`). */
export const incidentCreateSchema = z
  .object({
    vehicle_id: z.string().min(1, "L'ID du véhicule est requis"),
    driver_user_id: z.string().min(1, "L'ID du conducteur est requis"),
    description: z
      .string()
      .trim()
      .min(10, 'Décrivez la situation (au moins 10 caractères)')
      .max(4000, 'Texte trop long'),
    severity: incidentSeveritySchema.optional(),
    incident_category: z.enum(incidentCategoryTuple).nullable().optional(),
    evidence_path: z.string().nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const hasLat = data.latitude != null;
    const hasLng = data.longitude != null;
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Latitude et longitude doivent être fournies ensemble',
        path: ['latitude'],
      });
    }
  });

/** Formulaire terrain « Déclarer un incident ». */
export const incidentDeclarationFormSchema = z.object({
  vehicle_id: z.string().min(1, 'Sélectionnez un véhicule'),
  incident_category: z.enum(incidentCategoryTuple),
  severity: incidentSeveritySchema,
  description: z
    .string()
    .min(10, 'Décrivez la situation (au moins 10 caractères)')
    .max(4000, 'Texte trop long'),
  attachGeo: z.boolean(),
  evidenceDataUrl: z.string().optional().nullable(),
});

export type IncidentDeclarationFormValues = z.infer<typeof incidentDeclarationFormSchema>;

/** Dialogue « Signaler un incident » (dashboard /dashboard/incidents). */
export const incidentReportFormSchema = z.object({
  vehicle_id: z.string().min(1, 'Sélectionnez un véhicule'),
  severity: incidentSeveritySchema,
  description: z
    .string()
    .trim()
    .min(10, 'Décrivez la situation (au moins 10 caractères)')
    .max(4000, 'Texte trop long'),
  attachGeo: z.boolean(),
});

export type IncidentReportFormValues = z.infer<typeof incidentReportFormSchema>;
