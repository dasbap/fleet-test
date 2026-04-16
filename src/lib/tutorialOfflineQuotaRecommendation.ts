export type DeviceTier = "entry" | "mid" | "high";

export interface OfflineQuotaRecommendation {
  tier: DeviceTier;
  recommendedQuotaMb: number;
  rationale: string;
}

interface DeviceHints {
  deviceMemoryGb: number | null;
  hardwareConcurrency: number | null;
}

function getDeviceHints(): DeviceHints {
  if (typeof navigator === "undefined") {
    return { deviceMemoryGb: null, hardwareConcurrency: null };
  }
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    deviceMemoryGb: typeof nav.deviceMemory === "number" ? nav.deviceMemory : null,
    hardwareConcurrency:
      typeof navigator.hardwareConcurrency === "number"
        ? navigator.hardwareConcurrency
        : null,
  };
}

export function recommendTutorialOfflineQuota(): OfflineQuotaRecommendation {
  const { deviceMemoryGb, hardwareConcurrency } = getDeviceHints();

  const lowMemory = deviceMemoryGb !== null && deviceMemoryGb <= 3;
  const highMemory = deviceMemoryGb !== null && deviceMemoryGb >= 6;
  const lowCpu = hardwareConcurrency !== null && hardwareConcurrency <= 4;
  const highCpu = hardwareConcurrency !== null && hardwareConcurrency >= 8;

  if (highMemory || highCpu) {
    return {
      tier: "high",
      recommendedQuotaMb: 500,
      rationale: "Appareil haut de gamme détecté (mémoire/CPU élevés).",
    };
  }

  if (lowMemory || lowCpu) {
    return {
      tier: "entry",
      recommendedQuotaMb: 120,
      rationale: "Appareil entrée de gamme détecté (ressources limitées).",
    };
  }

  return {
    tier: "mid",
    recommendedQuotaMb: 250,
    rationale: "Profil intermédiaire détecté, équilibre stockage/performance.",
  };
}
