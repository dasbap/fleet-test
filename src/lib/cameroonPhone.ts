/**
 * Validation et normalisation des numéros mobile Cameroun (+237) pour SMS Orange.
 * Les identifiants restent en anglais ; les messages utilisateur sont gérés par les composants.
 */

/** Chiffres nationaux sans indicatif : 9 chiffres commençant par 6 (mobile). */
const CM_NATIONAL_MOBILE = /^6[0-9]{8}$/;

/**
 * Extrait les chiffres d'une saisie utilisateur (espaces, +237, etc.).
 */
export function extractDigits(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Indique si la chaîne représente un mobile CM valide (avec ou sans +237).
 */
export function isValidCameroonMobileInput(raw: string): boolean {
  const d = extractDigits(raw);
  if (d.length === 9 && CM_NATIONAL_MOBILE.test(d)) return true;
  if (d.length === 12 && d.startsWith("237") && CM_NATIONAL_MOBILE.test(d.slice(3))) return true;
  return false;
}

/**
 * Normalise vers le format stocké côté profil (préférence : +237XXXXXXXXX).
 */
export function normalizeCameroonPhoneE164(raw: string): string {
  const d = extractDigits(raw);
  const national = d.length === 12 && d.startsWith("237") ? d.slice(3) : d.length === 9 ? d : "";
  if (!CM_NATIONAL_MOBILE.test(national)) {
    throw new Error("Numéro mobile Cameroun invalide");
  }
  return `+237${national}`;
}
