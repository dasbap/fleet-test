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
      "Gestion complète de vos véhicules : immatriculation, affectations, historique et statuts en temps réel.",
    color: "primary",
    guidePath: "/guides/gestion-flotte-pme-cemac",
  },
  {
    icon: Fuel,
    title: "Samba-Fuel",
    description:
      "Planification et suivi des entretiens. Alertes automatiques pour ne jamais manquer une maintenance.",
    color: "accent",
    guidePath: "/fonctionnalites/carburant",
  },
  {
    icon: Wrench,
    title: "Samba-Care",
    description:
      "Gestion atelier avec photos obligatoires, checklists et suivi qualité des interventions.",
    color: "primary",
    guidePath: "/fonctionnalites/maintenance",
  },
  {
    icon: DollarSign,
    title: "Samba-Cash",
    description:
      "Encaissements journaliers, Mobile Money intégré, clôture obligatoire et écarts visibles.",
    color: "accent",
    guidePath: "/guides/reduire-ecarts-encaissements",
  },
  {
    icon: ShieldCheck,
    title: "Samba-Check",
    description:
      "Gestion des rôles et permissions. Chaque utilisateur voit uniquement ce qui le concerne.",
    color: "primary",
    guidePath: "/solutions/gestionnaires-flotte",
  },
  {
    icon: Bell,
    title: "Alertes intelligentes",
    description:
      "Notifications push, email et SMS pour les seuils critiques et rappels importants.",
    color: "accent",
    guidePath: "/fonctionnalites/alertes",
  },
  {
    icon: Users,
    title: "Multi-tenant",
    description:
      "Architecture multi-organisations avec flottes isolées et données sécurisées.",
    color: "primary",
    guidePath: "/guides/kpi-gestionnaire-multi-flottes",
  },
  {
    icon: BarChart3,
    title: "Scoring & KPIs",
    description:
      "Système de scoring chauffeurs et mécaniciens avec incitations et sanctions automatiques.",
    color: "accent",
    guidePath: "/fonctionnalites/score-conducteur",
  },
] as const;
