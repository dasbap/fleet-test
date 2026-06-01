import type { LucideIcon } from "lucide-react";
import { Car, Wrench, BadgeDollarSign, ShieldCheck } from "lucide-react";
import type { MarketingGuidePath } from "@/data/marketing/fonctionnalites";

export interface ModuleItem {
  icon: LucideIcon;
  name: string;
  subtitle: string;
  description: string;
  features: readonly string[];
  gradient: string;
  guidePath: MarketingGuidePath;
}

export const MODULES: readonly ModuleItem[] = [
  {
    icon: Car,
    name: "Organisateur",
    subtitle: "Vue d'ensemble multi-flottes",
    description:
      "Supervisez plusieurs flottes depuis un tableau de bord unique. Rapports consolidés, seuils d'alerte personnalisables, arbitrage des décisions critiques.",
    features: [
      "Supervision multi-flottes",
      "Rapports & analytics",
      "Configuration des seuils",
      "Gestion des gestionnaires",
    ],
    gradient: "from-primary to-primary/60",
    guidePath: "/guides/kpi-gestionnaire-multi-flottes",
  },
  {
    icon: ShieldCheck,
    name: "Gestionnaire",
    subtitle: "Pilotage d'une flotte",
    description:
      "Gérez votre flotte de 2 à 50 véhicules. Affectations, validations, encaissements quotidiens et suivi des chauffeurs.",
    features: [
      "Affectation véhicules/chauffeurs",
      "Validation des clôtures",
      "Suivi des encaissements",
      "Sanctions & récompenses",
    ],
    gradient: "from-accent to-accent/60",
    guidePath: "/solutions/gestionnaires-flotte",
  },
  {
    icon: BadgeDollarSign,
    name: "Chauffeur",
    subtitle: "Gestion quotidienne simplifiée",
    description:
      "Interface mobile-first pour les chauffeurs. Déclaration kilométrique, clôture journalière obligatoire, score visible en temps réel.",
    features: [
      "KM début/fin de journée",
      "Déclaration des incidents",
      "Clôture obligatoire",
      "Score discipline visible",
    ],
    gradient: "from-info to-info/60",
    guidePath: "/guides/donnees-terrain-tableau-de-bord",
  },
  {
    icon: Wrench,
    name: "Mécanicien",
    subtitle: "Gestion atelier professionnelle",
    description:
      "Suivi des interventions multi-flottes avec photos obligatoires, rapports techniques et scoring qualité.",
    features: [
      "Interventions multi-flottes",
      "Photos obligatoires",
      "Checklists techniques",
      "Score qualité & récurrence",
    ],
    gradient: "from-destructive to-destructive/60",
    guidePath: "/guides/brief-maintenance-preventive",
  },
] as const;
