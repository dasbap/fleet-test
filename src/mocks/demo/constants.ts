/**
 * Constantes partagées — démo Flotte E-Samba (Sénégal / exploitation réelle).
 */
import { isValidUuid } from "@/lib/isUuid";

const envFleet = import.meta.env.VITE_DEMO_FLEET_ID as string | undefined;

/** UUID par défaut pour les mocks locaux (jamais un slug : les colonnes Supabase sont uuid). */
const DEFAULT_DEMO_FLEET_UUID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

/**
 * Identifiant de flotte pour auth mock / données démo.
 * Pour aligner sur une vraie flotte Supabase : `VITE_DEMO_FLEET_ID=<uuid depuis Table Editor → flottes>`.
 */
export const DEMO_FLEET_ID =
  envFleet && isValidUuid(envFleet.trim()) ? envFleet.trim() : DEFAULT_DEMO_FLEET_UUID;
export const DEMO_FLEET_NAME = "E-Samba Transport & Logistique";
export const DEMO_FLEET_REGION = "Dakar — Thiès — Saint-Louis";

/** Horodatage ISO relatif à maintenant (pour données dynamiques crédibles). */
export function demoIsoFuture(days: number, hours = 0): string {
  return new Date(
    Date.now() + days * 86_400_000 + hours * 3_600_000
  ).toISOString();
}

export function demoIsoPast(days: number, hours = 0): string {
  return new Date(
    Date.now() - days * 86_400_000 - hours * 3_600_000
  ).toISOString();
}
