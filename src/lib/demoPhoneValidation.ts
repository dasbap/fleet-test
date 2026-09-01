export const DEMO_PHONE_RULES = {
  CM: { dialCode: "+237", nationalLength: 9 },
  CF: { dialCode: "+236", nationalLength: 8 },
  TD: { dialCode: "+235", nationalLength: 8 },
  CG: { dialCode: "+242", nationalLength: 9 },
  GA: { dialCode: "+241", nationalLength: 8 },
  GQ: { dialCode: "+240", nationalLength: 9 },
} as const;

export type DemoPhoneCountryCode = keyof typeof DEMO_PHONE_RULES;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizeDemoPhone(phone: string, countryCode: string): string {
  const normalizedCountry = countryCode.trim().toUpperCase() as DemoPhoneCountryCode;
  const rule = DEMO_PHONE_RULES[normalizedCountry];
  if (!rule) throw new Error("Sélectionnez un pays d'Afrique centrale.");

  const raw = phone.trim();
  if (!raw) throw new Error("Le numéro de téléphone est requis.");

  if (raw.startsWith("+")) {
    const international = `+${digitsOnly(raw)}`;
    if (!international.startsWith(rule.dialCode)) {
      throw new Error(`Le numéro doit correspondre au pays sélectionné (${rule.dialCode}).`);
    }
    const national = international.slice(rule.dialCode.length);
    if (national.length !== rule.nationalLength) {
      throw new Error(`Le numéro ${rule.dialCode} doit contenir ${rule.nationalLength} chiffres après l'indicatif.`);
    }
    return `${rule.dialCode}${national}`;
  }

  let national = digitsOnly(raw);
  if (national.startsWith("0")) national = national.slice(1);
  if (national.length !== rule.nationalLength) {
    throw new Error(`Le numéro doit contenir ${rule.nationalLength} chiffres pour ce pays.`);
  }
  return `${rule.dialCode}${national}`;
}
