/**
 * Constantes partagées — démo Flotte E-Samba (Sénégal / exploitation réelle).
 */

export const DEMO_FLEET_ID = "fleet-esamba-sn";
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
