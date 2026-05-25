import { z } from 'zod';
import { COLLECTION_MODE_VALUES } from '@/domain/constants/collectionMode';

const collectionModeTuple = COLLECTION_MODE_VALUES;

/** Formulaire de clôture de créneau (UI). */
export const shiftClosureFormSchema = z.object({
  kmEnd: z.coerce.number().min(0, 'Kilométrage invalide'),
  revenueDeclared: z.coerce.number().min(0, 'Montant invalide'),
  collectionMode: z.enum(collectionModeTuple),
  notes: z.string().optional(),
});

export type ShiftClosureFormValues = z.infer<typeof shiftClosureFormSchema>;

/** Payload RPC clôture (`ShiftClosureInsert`). */
export const shiftClosureInsertSchema = z.object({
  shift_id: z.string().min(1, "L'ID du créneau est requis"),
  km_end: z.number().min(0, 'Le kilométrage de fin doit être valide et positif'),
  revenue_declared: z.number().min(0, 'La recette déclarée ne peut pas être négative'),
  collection_mode: z.enum(collectionModeTuple, {
    errorMap: () => ({ message: 'Le mode de collecte doit être cash, momo ou mix' }),
  }),
  proof_type: z.string().min(1, 'Le type de preuve est requis'),
  proof_value: z.string().min(1, 'La valeur de preuve est requise'),
});

export type ShiftClosureInsertParsed = z.infer<typeof shiftClosureInsertSchema>;

/** Démarrage de créneau. */
export const shiftStartSchema = z.object({
  assignment_id: z.string().min(1, "L'ID de l'affectation est requis"),
  km_start: z.number().min(0, 'Le kilométrage de départ ne peut pas être négatif'),
});
