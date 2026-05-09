import { z } from "zod";
import { INCIDENT_CATEGORY_VALUES, type IncidentCategory } from "@/types/incident-declaration";

const categoryTuple = INCIDENT_CATEGORY_VALUES as unknown as [
  IncidentCategory,
  ...IncidentCategory[],
];

export const incidentDeclarationSchema = z.object({
  vehicle_id: z.string().min(1, "Sélectionnez un véhicule"),
  incident_category: z.enum(categoryTuple),
  severity: z.enum(["low", "medium", "high", "critical"]),
  description: z
    .string()
    .min(10, "Décrivez la situation (au moins 10 caractères)")
    .max(4000, "Texte trop long"),
  attachGeo: z.boolean(),
  evidenceDataUrl: z.string().optional().nullable(),
});

export type IncidentDeclarationFormValues = z.infer<typeof incidentDeclarationSchema>;
