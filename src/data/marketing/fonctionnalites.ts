import type { LucideIcon } from "lucide-react";
import {
  Car,
  Fuel,
  Wrench,
  DollarSign,
  ShieldCheck,
  Bell,
  Users,
  BarChart3,
} from "lucide-react";

/** Chemin relatif sur le hub marketing (Option A). */
export type MarketingGuidePath = `/${string}`;

export interface FonctionnaliteItem {
  icon: LucideIcon;
  title: string;
  description: string;
  color: "primary" | "accent";
  guidePath: MarketingGuidePath;
}

export const FONCTIONNALITES: readonly FonctionnaliteItem[] = [
  {
    icon: Car,
    title: "Samba-Fleet",
    description:
      "Vue claire de vos véhicules, de leur disponibilité et des actions à suivre au quotidien.",
    color: "primary",
    guidePath: "/guides/gestion-flotte-pme-cemac",
  },
  {
    icon: Fuel,
    title: "Samba-Fuel",
    description:
      "Suivi carburant et signaux d'écart pour garder les dépenses terrain sous contrôle.",
    color: "accent",
    guidePath: "/fonctionnalites/carburant",
  },
  {
    icon: Wrench,
    title: "Samba-Care",
    description:
      "Entretien mieux cadré, interventions plus faciles à suivre et historique exploitable.",
    color: "primary",
    guidePath: "/fonctionnalites/maintenance",
  },
  {
    icon: DollarSign,
    title: "Samba-Cash",
    description:
      "Recettes journalières plus lisibles, rapprochements simplifiés et suivi des écarts.",
    color: "accent",
    guidePath: "/guides/reduire-ecarts-encaissements",
  },
  {
    icon: ShieldCheck,
    title: "Samba-Check",
    description:
      "Accès cadré pour que chaque équipe travaille dans un espace adapté à son rôle.",
    color: "primary",
    guidePath: "/solutions/gestionnaires-flotte",
  },
  {
    icon: Bell,
    title: "Alertes intelligentes",
    description:
      "Rappels et signaux utiles pour réagir avant que les petits oublis deviennent coûteux.",
    color: "accent",
    guidePath: "/fonctionnalites/alertes",
  },
  {
    icon: Users,
    title: "Multi-flottes",
    description:
      "Organisation claire pour suivre plusieurs flottes sans mélanger les responsabilités.",
    color: "primary",
    guidePath: "/guides/kpi-gestionnaire-multi-flottes",
  },
  {
    icon: BarChart3,
    title: "Scoring & KPIs",
    description:
      "Indicateurs simples pour repérer les tendances, comparer les périodes et décider plus vite.",
    color: "accent",
    guidePath: "/fonctionnalites/score-conducteur",
  },
] as const;
