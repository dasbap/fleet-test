import type { ZodSchema } from 'zod';

/** Extrait le premier message d'erreur Zod (FR) pour les services métier. */
export function parseSchemaOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Données invalides.';
    throw new Error(message);
  }
  return parsed.data;
}
