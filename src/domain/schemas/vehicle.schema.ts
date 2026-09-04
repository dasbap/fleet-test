import { z } from 'zod';

const currentYear = new Date().getFullYear();

/** Formulaire d'ajout véhicule (dashboard). */
export const vehicleCreateFormSchema = z.object({
  registration: z.string().min(1, "L'immatriculation est requise").max(15, "Immatriculation trop longue"),
  subscription_id: z.string().min(1, "L'abonnement est requis"),
  brand: z.string().min(1, 'La marque est requise'),
  model: z.string().min(1, 'Le modèle est requis'),
  year: z.coerce
    .number()
    .min(1990, 'Année invalide')
    .max(currentYear + 1, 'Année invalide'),
  current_km: z.coerce.number().min(0, 'Kilométrage invalide'),
});

export type VehicleCreateFormValues = z.infer<typeof vehicleCreateFormSchema>;

/** Insertion persistance (`vehicules`). */
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
