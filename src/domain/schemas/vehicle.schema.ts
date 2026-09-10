import { z } from 'zod';

const currentYear = new Date().getFullYear();

export const vehicleCreateFormSchema = z.object({
  registration: z.string().min(1, "L'immatriculation est requise").max(15, "Immatriculation trop longue"),
  subscription_id: z.string().min(1, "L'abonnement est requis"),
  brand: z.string().min(1, 'La marque est requise'),
  model: z.string().min(1, 'Le modèle est requis'),
  year: z.coerce.number().min(1990, 'Année invalide').max(currentYear + 1, 'Année invalide'),
  current_km: z.coerce.number().min(0, 'Kilométrage invalide'),
  registration_certificate_number: z.string().trim().min(1, 'Le numéro de carte grise est requis'),
  insurer_name: z.string().trim().min(1, "Le nom de l'assureur est requis"),
  insurance_policy_number: z.string().trim().min(1, "Le numéro de police d'assurance est requis"),
  insurance_issued_at: z.string().min(1, "La date de prise d'effet de l'assurance est requise"),
  insurance_expires_at: z.string().min(1, "La date d'expiration de l'assurance est requise"),
  technical_inspection_number: z.string().trim().min(1, 'Le numéro de visite technique est requis'),
  technical_inspection_issued_at: z.string().min(1, 'La date de visite technique est requise'),
  technical_inspection_expires_at: z.string().min(1, "La date d'expiration de la visite technique est requise"),
  road_tax_reference: z.string().trim().optional(),
  road_tax_expires_at: z.string().optional(),
  transport_license_number: z.string().trim().optional(),
  transport_license_expires_at: z.string().optional(),
}).superRefine((values, ctx) => {
  if (values.insurance_issued_at && values.insurance_expires_at && values.insurance_expires_at < values.insurance_issued_at) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['insurance_expires_at'], message: "L'expiration doit être postérieure à la prise d'effet" });
  }
  if (values.technical_inspection_issued_at && values.technical_inspection_expires_at && values.technical_inspection_expires_at < values.technical_inspection_issued_at) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['technical_inspection_expires_at'], message: "L'expiration doit être postérieure à la visite" });
  }
});

export type VehicleCreateFormValues = z.infer<typeof vehicleCreateFormSchema>;

export const vehicleInsertSchema = z.object({
  fleet_id: z.string().min(1, "L'ID de la flotte est requis"),
  subscription_id: z.string().trim().min(1, "L'abonnement est requis").optional(),
  registration: z.string().trim().min(1, "Le numéro d'immatriculation est requis").max(15, "Immatriculation trop longue"),
  brand: z.string().trim().min(1, 'La marque est requise').optional(),
  model: z.string().trim().min(1, 'Le modèle est requis').optional(),
  year: z.number().min(1990).max(currentYear + 1).optional(),
  current_km: z.number().min(0, 'Le kilométrage ne peut pas être négatif').optional(),
});

export type VehicleInsertParsed = z.infer<typeof vehicleInsertSchema>;
