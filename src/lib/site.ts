/**
 * Configuration SEO et URL du site.
 * Source de vérité pour canonical, og:url et métadonnées par route.
 */

const DEFAULT_BASE = "https://www.e-samba.com";

export const SITE_BASE_URL =
  (import.meta?.env?.VITE_APP_URL as string | undefined)?.trim() || DEFAULT_BASE;

export interface RouteMeta {
  title: string;
  description: string;
}

const DEFAULT_META: RouteMeta = {
  title: "E-Samba",
  description:
    "E-Samba est une application web et mobile de gestion de flotte de transport en Afrique Centrale. Suivi des véhicules, gestion des entretiens, alertes automatisées et supervision intelligente des opérations quotidiennes.",
};

/** Map pathname → métadonnées (titre, description). Les clés sont normalisées sans trailing slash (sauf "/"). */
export const ROUTE_META: Record<string, RouteMeta> = {
  "/": {
    title: "E-Samba | Gestion intelligente de flotte en Afrique Centrale",
    description:
      "E-Samba est une application web et mobile de gestion de flotte de transport en Afrique Centrale. Suivi des véhicules, gestion des entretiens, alertes automatisées et supervision intelligente des opérations quotidiennes.",
  },
  "/auth": {
    title: "Connexion – E-Samba",
    description: "Connectez-vous à E-Samba pour accéder à votre tableau de bord de gestion de flotte.",
  },
  "/dashboard": {
    title: "Tableau de bord – E-Samba",
    description: "Supervision de votre flotte, véhicules, chauffeurs et indicateurs en temps réel.",
  },
  "/dashboard/vehicles": {
    title: "Véhicules – E-Samba",
    description: "Liste et gestion des véhicules de la flotte.",
  },
  "/dashboard/drivers": {
    title: "Chauffeurs – E-Samba",
    description: "Gestion des chauffeurs et affectations.",
  },
  "/dashboard/closure": {
    title: "Clôture de service – E-Samba",
    description: "Clôture des services et rapports de fin de journée.",
  },
  "/dashboard/incidents": {
    title: "Incidents – E-Samba",
    description: "Suivi et gestion des incidents de la flotte.",
  },
  "/dashboard/maintenance": {
    title: "Maintenance – E-Samba",
    description: "Planning et suivi des maintenances des véhicules.",
  },
  "/dashboard/reports": {
    title: "Rapports – E-Samba",
    description: "Rapports et statistiques de la flotte.",
  },
  "/dashboard/invitations": {
    title: "Invitations – E-Samba",
    description: "Inviter des membres à rejoindre la flotte.",
  },
  "/dashboard/settings": {
    title: "Paramètres – E-Samba",
    description: "Paramètres de l'application et de la flotte.",
  },
  "/dashboard/profile": {
    title: "Profil – E-Samba",
    description: "Votre profil utilisateur.",
  },
  "/dashboard/teams": {
    title: "Équipes – E-Samba",
    description: "Gestion des équipes et des membres.",
  },
  "/dashboard/create-fleet": {
    title: "Créer une flotte – E-Samba",
    description: "Création d'une nouvelle flotte.",
  },
  "/dashboard/finances": {
    title: "Finances – E-Samba",
    description: "Suivi financier de la flotte.",
  },
  "/dashboard/collections": {
    title: "Encaissements – E-Samba",
    description: "Gestion des encaissements.",
  },
  "/dashboard/alerts": {
    title: "Alertes – E-Samba",
    description: "Alertes et notifications de la flotte.",
  },
  "/dashboard/roles": {
    title: "Rôles – E-Samba",
    description: "Gestion des rôles et permissions.",
  },
  "/dashboard/my-vehicle": {
    title: "Mon véhicule – E-Samba",
    description: "Véhicule assigné et état du service.",
  },
  "/dashboard/history": {
    title: "Historique – E-Samba",
    description: "Historique des activités et services.",
  },
};

/**
 * Retourne les métadonnées pour un pathname (normalisé sans trailing slash, sauf "/").
 */
export function getRouteMeta(pathname: string): RouteMeta {
  const normalized = pathname.endsWith("/") && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;
  return ROUTE_META[normalized] ?? DEFAULT_META;
}

/**
 * Construit l'URL canonique pour un pathname.
 */
export function getCanonicalUrl(pathname: string): string {
  const base = SITE_BASE_URL.replace(/\/$/, "");
  const path = pathname === "/" ? "" : pathname.replace(/\/$/, "") || "";
  return path ? `${base}${path}` : base + "/";
}
