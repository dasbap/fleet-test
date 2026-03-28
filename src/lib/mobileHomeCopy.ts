import type { AppRole } from "@/hooks/useAuth";

export interface MobileHomeCopy {
  subtitle: string;
  missionsLabel: string;
  labels?: Partial<{
    active: string;
    immobilized: string;
    maintenance: string;
    alerts: string;
  }>;
}

const copyByRole: Record<NonNullable<AppRole>, MobileHomeCopy> = {
  organizer: {
    subtitle: "Vue d’ensemble de votre flotte.",
    missionsLabel: "Missions / trajets en cours",
  },
  manager: {
    subtitle: "Pilotage opérationnel du jour.",
    missionsLabel: "Missions en cours",
  },
  mechanic: {
    subtitle: "Atelier et véhicules à traiter en priorité.",
    missionsLabel: "Interventions terrain actives",
  },
  driver: {
    subtitle: "Votre journée et votre véhicule assigné.",
    missionsLabel: "Course / service en cours",
    labels: {
      active: "Véhicule assigné (actif)",
      immobilized: "Immobilisé",
      maintenance: "Entretien prévu (sem.)",
      alerts: "Mes alertes critiques",
    },
  },
};

export function getMobileHomeCopy(role: AppRole | null): MobileHomeCopy {
  const r = role ?? "organizer";
  return copyByRole[r];
}
