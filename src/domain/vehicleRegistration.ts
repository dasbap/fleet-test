export interface VehicleRegistrationRule {
  countryCode: string;
  label: string;
  placeholder: string;
  minCompactLength: number;
  maxCompactLength: number;
  maxInputLength: number;
}

const DEFAULT_RULE: VehicleRegistrationRule = {
  countryCode: "OTHER",
  label: "Immatriculation",
  placeholder: "ABC 1234",
  minCompactLength: 4,
  maxCompactLength: 12,
  maxInputLength: 15,
};

export const VEHICLE_REGISTRATION_RULES: Record<string, VehicleRegistrationRule> = {
  CM: {
    countryCode: "CM",
    label: "Immatriculation Cameroun",
    placeholder: "LT 1234 A",
    minCompactLength: 6,
    maxCompactLength: 9,
    maxInputLength: 11,
  },
  CF: {
    countryCode: "CF",
    label: "Immatriculation Centrafrique",
    placeholder: "1234 AB",
    minCompactLength: 5,
    maxCompactLength: 10,
    maxInputLength: 12,
  },
  TD: {
    countryCode: "TD",
    label: "Immatriculation Tchad",
    placeholder: "AB 1234",
    minCompactLength: 5,
    maxCompactLength: 10,
    maxInputLength: 12,
  },
  CG: {
    countryCode: "CG",
    label: "Immatriculation Congo",
    placeholder: "1234 AB 1",
    minCompactLength: 5,
    maxCompactLength: 10,
    maxInputLength: 12,
  },
  GA: {
    countryCode: "GA",
    label: "Immatriculation Gabon",
    placeholder: "1234 G1",
    minCompactLength: 5,
    maxCompactLength: 10,
    maxInputLength: 12,
  },
  GQ: {
    countryCode: "GQ",
    label: "Immatriculation Guinée équatoriale",
    placeholder: "1234 ABC",
    minCompactLength: 5,
    maxCompactLength: 10,
    maxInputLength: 12,
  },
};

export function getVehicleRegistrationRule(
  countryCode: string | null | undefined,
): VehicleRegistrationRule {
  const normalized = countryCode?.trim().toUpperCase() ?? "";
  return VEHICLE_REGISTRATION_RULES[normalized] ?? {
    ...DEFAULT_RULE,
    countryCode: normalized || DEFAULT_RULE.countryCode,
  };
}

export function normalizeVehicleRegistration(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9 -]/g, "")
    .replace(/\s+/g, " ")
    .trimStart();
}

export function compactVehicleRegistration(value: string): string {
  return normalizeVehicleRegistration(value).replace(/[^A-Z0-9]/g, "");
}

export function validateVehicleRegistrationForCountry(
  value: string,
  countryCode: string | null | undefined,
): string | null {
  const rule = getVehicleRegistrationRule(countryCode);
  const normalized = normalizeVehicleRegistration(value);
  const compact = compactVehicleRegistration(value);

  if (!normalized.trim()) {
    return "L'immatriculation est requise.";
  }
  if (!/^[A-Z0-9 -]+$/.test(normalized)) {
    return "Utilisez uniquement des lettres, chiffres, espaces ou tirets.";
  }
  if (
    compact.length < rule.minCompactLength ||
    compact.length > rule.maxCompactLength
  ) {
    return `Pour ${rule.countryCode}, l'immatriculation doit contenir entre ${rule.minCompactLength} et ${rule.maxCompactLength} caractères utiles.`;
  }
  return null;
}
