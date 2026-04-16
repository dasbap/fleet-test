/**
 * Tarifs publics landing — alignés sur les seeds / catalogue `plans` (Supabase).
 * Ne remplace pas la facturation serveur ; évite la dérive entre marketing et DB.
 */

/** FCFA / véhicule / mois (plan `free`) */
export const PUBLIC_PRICE_FREE_PER_VEHICLE_XAF = 0;

/** FCFA / véhicule / mois (plan `starter`) */
export const PUBLIC_PRICE_STARTER_PER_VEHICLE_XAF = 15_000;

/** FCFA / véhicule / mois (plan `pro`) */
export const PUBLIC_PRICE_PRO_PER_VEHICLE_XAF = 21_000;

export const PUBLIC_CURRENCY_LABEL = "FCFA";

export const PUBLIC_BILLING_PERIOD_LABEL = "/ véhicule / mois";

/** Libellé carte Enterprise (pas de montant fixe en catalogue). */
export const PUBLIC_PRICE_ENTERPRISE_LABEL = "Sur devis";

/** Formate un montant entier FCFA pour l’affichage marketing (espaces fines). */
export function formatPublicPriceXaf(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(amount);
}
