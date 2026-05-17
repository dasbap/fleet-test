/**
 * Formatage et validation des numéros de téléphone africains.
 *
 * Priorité CEMAC : CM, CD, GA, CG, CF, TD, GQ
 * Format cible : E164 (ex: +237612345678)
 */

import type { AfricanCountry } from '@/types/auth-phone';

// ─── Annuaire pays CEMAC + voisins ────────────────────────────────────────────

export const AFRICAN_COUNTRIES: AfricanCountry[] = [
  {
    code:           'CM',
    dialCode:       '+237',
    name:           'Cameroun',
    nameEn:         'Cameroon',
    flag:           '🇨🇲',
    localLength:    9,
    mobilePrefixes: ['6', '2'],
    operators:      ['Orange', 'MTN', 'Camtel'],
  },
  {
    code:           'CD',
    dialCode:       '+243',
    name:           'RD Congo',
    nameEn:         'DR Congo',
    flag:           '🇨🇩',
    localLength:    9,
    mobilePrefixes: ['08', '09', '07'],
    operators:      ['Airtel', 'Vodacom', 'Orange', 'MTN'],
  },
  {
    code:           'GA',
    dialCode:       '+241',
    name:           'Gabon',
    nameEn:         'Gabon',
    flag:           '🇬🇦',
    localLength:    8,
    mobilePrefixes: ['06', '07', '04', '05'],
    operators:      ['Airtel', 'Moov'],
  },
  {
    code:           'CG',
    dialCode:       '+242',
    name:           'Congo',
    nameEn:         'Republic of the Congo',
    flag:           '🇨🇬',
    localLength:    9,
    mobilePrefixes: ['05', '06', '04'],
    operators:      ['Airtel', 'MTN'],
  },
  {
    code:           'CF',
    dialCode:       '+236',
    name:           'Centrafrique',
    nameEn:         'Central African Republic',
    flag:           '🇨🇫',
    localLength:    8,
    mobilePrefixes: ['7', '8', '72', '75'],
    operators:      ['Airtel', 'Moov'],
  },
  {
    code:           'TD',
    dialCode:       '+235',
    name:           'Tchad',
    nameEn:         'Chad',
    flag:           '🇹🇩',
    localLength:    8,
    mobilePrefixes: ['6', '9', '63', '66'],
    operators:      ['Airtel', 'Moov'],
  },
  {
    code:           'GQ',
    dialCode:       '+240',
    name:           'Guinée équatoriale',
    nameEn:         'Equatorial Guinea',
    flag:           '🇬🇶',
    localLength:    9,
    mobilePrefixes: ['222', '333'],
    operators:      ['Orange', 'Hits Mobile'],
  },
];

/** Pays par défaut — Cameroun */
export const DEFAULT_COUNTRY = AFRICAN_COUNTRIES[0];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Retire tout ce qui n'est pas un chiffre */
function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

/**
 * Normalise un numéro en E164.
 *
 * Gère les cas :
 *   - '0612345678' + CM → '+237612345678'
 *   - '+237612345678'   → '+237612345678' (déjà E164)
 *   - '612345678'       → '+237612345678'
 *   - '237612345678'    → '+237612345678'
 */
export function toE164(raw: string, country: AfricanCountry): string | null {
  const clean = digitsOnly(raw);
  if (!clean) return null;

  const dialDigits = digitsOnly(country.dialCode); // ex: '237'
  const localLen   = country.localLength;

  // Déjà E164 avec indicatif
  if (clean.startsWith(dialDigits) && clean.length === dialDigits.length + localLen) {
    return `+${clean}`;
  }

  // Commence par 00 + indicatif
  if (clean.startsWith(`00${dialDigits}`) && clean.length === 2 + dialDigits.length + localLen) {
    return `+${clean.slice(2)}`;
  }

  // Commence par 0 (numéro local avec 0 initial)
  if (clean.startsWith('0') && clean.length === localLen + 1) {
    return `+${dialDigits}${clean.slice(1)}`;
  }

  // Numéro local direct
  if (clean.length === localLen) {
    return `+${dialDigits}${clean}`;
  }

  return null;
}

/**
 * Valide un numéro E164 pour un pays donné.
 * Vérifie la longueur et les préfixes mobiles attendus.
 */
export function validatePhone(
  e164: string,
  country: AfricanCountry,
): { valid: boolean; error?: string } {
  if (!e164.startsWith('+')) {
    return { valid: false, error: 'Format invalide — doit commencer par +' };
  }

  const dialDigits  = digitsOnly(country.dialCode);
  const localPart   = digitsOnly(e164).slice(dialDigits.length);

  if (localPart.length !== country.localLength) {
    return {
      valid: false,
      error: `Numéro invalide — ${country.localLength} chiffres attendus pour ${country.name}`,
    };
  }

  // Vérifier le préfixe mobile
  const hasValidPrefix = country.mobilePrefixes.some((p) => localPart.startsWith(p));
  if (!hasValidPrefix) {
    return {
      valid: false,
      error: `Numéro non reconnu comme mobile ${country.name} (${country.operators.join(', ')})`,
    };
  }

  return { valid: true };
}

/**
 * Formate un numéro E164 pour affichage lisible.
 * Ex: '+237612345678' → '🇨🇲 +237 612 345 678'
 */
export function formatPhoneDisplay(e164: string, country: AfricanCountry): string {
  const dialDigits = digitsOnly(country.dialCode);
  const local      = digitsOnly(e164).slice(dialDigits.length);

  // Groupes de 3
  const groups = local.match(/.{1,3}/g) ?? [local];

  return `${country.flag} ${country.dialCode} ${groups.join(' ')}`;
}

/**
 * Détecte automatiquement le pays depuis un numéro E164.
 * Utile quand le numéro vient du profil Supabase.
 */
export function detectCountry(e164: string): AfricanCountry | null {
  for (const country of AFRICAN_COUNTRIES) {
    if (e164.startsWith(country.dialCode)) return country;
  }
  return null;
}

/**
 * Formate un numéro pour affichage masqué (confidentialité).
 * Ex: '+237612345678' → '+237 6•• ••• 678'
 */
export function maskPhone(e164: string): string {
  if (e164.length < 8) return e164;
  const visible = e164.slice(-3);
  const masked  = '•'.repeat(Math.max(0, e164.length - 4 - visible.length));
  return `${e164.slice(0, 4)} ${masked} ${visible}`;
}
