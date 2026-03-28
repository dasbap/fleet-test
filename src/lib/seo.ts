export type SeoMetaTag = {
  name?: string;
  property?: string;
  content: string;
};

export const SEO_ROUTE_KEYS = {
  landing: "landing",
  auth: "auth",
  dashboard: "dashboard",
  vehicles: "vehicles",
  drivers: "drivers",
  closure: "closure",
  incidents: "incidents",
  incidentDeclare: "incidentDeclare",
  maintenance: "maintenance",
  reports: "reports",
  invitations: "invitations",
  settings: "settings",
  profile: "profile",
  teams: "teams",
  createFleet: "createFleet",
  finances: "finances",
  collections: "collections",
  alerts: "alerts",
  roles: "roles",
  myVehicle: "myVehicle",
  history: "history",
  operations: "operations",
  notFound: "notFound",
} as const;

export type SeoRouteKey = (typeof SEO_ROUTE_KEYS)[keyof typeof SEO_ROUTE_KEYS];

export interface SeoRouteConfig {
  title: string;
  description: string;
  canonicalPath: string;
  metas?: SeoMetaTag[];
}

const DEFAULT_BASE = "https://www.e-samba.com";
export const SITE_BASE_URL =
  (import.meta?.env?.VITE_APP_URL as string | undefined)?.trim() || DEFAULT_BASE;

const demoSeoTitle =
  "Parcours demo E-Samba: 1 journee de flotte, de l'incident a la validation";
const demoSeoDescription =
  "Decouvrez le parcours demo E-Samba en moins de 7 minutes: organisateur multi-flottes, affectation conforme, incident terrain, maintenance tracable, cloture chauffeur et validation financiere sans conflit.";

export const SEO_BY_ROUTE_KEY: Record<SeoRouteKey, SeoRouteConfig> = {
  landing: {
    title: "E-Samba | Gestion intelligente de flotte en Afrique Centrale",
    description:
      "E-Samba est une application web et mobile de gestion de flotte de transport en Afrique Centrale. Suivi des vehicules, gestion des entretiens, alertes automatisees et supervision intelligente des operations quotidiennes.",
    canonicalPath: "/",
    metas: [
      { property: "og:title", content: demoSeoTitle },
      { property: "og:description", content: demoSeoDescription },
      { name: "twitter:title", content: demoSeoTitle },
      { name: "twitter:description", content: demoSeoDescription },
    ],
  },
  auth: {
    title: "Connexion - E-Samba",
    description: "Connectez-vous a E-Samba pour acceder a votre tableau de bord de gestion de flotte.",
    canonicalPath: "/auth",
  },
  dashboard: {
    title: "Tableau de bord - E-Samba",
    description: "Supervision de votre flotte, vehicules, chauffeurs et indicateurs en temps reel.",
    canonicalPath: "/dashboard",
  },
  vehicles: { title: "Vehicules - E-Samba", description: "Liste et gestion des vehicules de la flotte.", canonicalPath: "/dashboard/vehicles" },
  drivers: { title: "Chauffeurs - E-Samba", description: "Gestion des chauffeurs et affectations.", canonicalPath: "/dashboard/drivers" },
  closure: { title: "Cloture de service - E-Samba", description: "Cloture des services et rapports de fin de journee.", canonicalPath: "/dashboard/closure" },
  incidents: { title: "Incidents - E-Samba", description: "Suivi et gestion des incidents de la flotte.", canonicalPath: "/dashboard/incidents" },
  maintenance: { title: "Maintenance - E-Samba", description: "Planning et suivi des maintenances des vehicules.", canonicalPath: "/dashboard/maintenance" },
  reports: { title: "Rapports - E-Samba", description: "Rapports et statistiques de la flotte.", canonicalPath: "/dashboard/reports" },
  invitations: { title: "Invitations - E-Samba", description: "Inviter des membres a rejoindre la flotte.", canonicalPath: "/dashboard/invitations" },
  settings: { title: "Parametres - E-Samba", description: "Parametres de l'application et de la flotte.", canonicalPath: "/dashboard/settings" },
  profile: { title: "Profil - E-Samba", description: "Votre profil utilisateur.", canonicalPath: "/dashboard/profile" },
  teams: { title: "Equipes - E-Samba", description: "Gestion des equipes et des membres.", canonicalPath: "/dashboard/teams" },
  createFleet: { title: "Creer une flotte - E-Samba", description: "Creation d'une nouvelle flotte.", canonicalPath: "/dashboard/create-fleet" },
  finances: { title: "Finances - E-Samba", description: "Suivi financier de la flotte.", canonicalPath: "/dashboard/finances" },
  collections: { title: "Encaissements - E-Samba", description: "Gestion des encaissements.", canonicalPath: "/dashboard/collections" },
  alerts: { title: "Alertes - E-Samba", description: "Alertes et notifications de la flotte.", canonicalPath: "/dashboard/alerts" },
  roles: { title: "Roles - E-Samba", description: "Gestion des roles et permissions.", canonicalPath: "/dashboard/roles" },
  myVehicle: { title: "Mon vehicule - E-Samba", description: "Vehicule assigne et etat du service.", canonicalPath: "/dashboard/my-vehicle" },
  history: { title: "Historique - E-Samba", description: "Historique des activites et services.", canonicalPath: "/dashboard/history" },
  operations: {
    title: "Operations - E-Samba",
    description: "Missions, taches et acces rapide aux flux terrain.",
    canonicalPath: "/dashboard/operations",
  },
  notFound: {
    title: "E-Samba",
    description:
      "E-Samba est une application web et mobile de gestion de flotte de transport en Afrique Centrale.",
    canonicalPath: "/",
  },
};

const PATH_TO_ROUTE_KEY: Record<string, SeoRouteKey> = {
  "/": SEO_ROUTE_KEYS.landing,
  "/auth": SEO_ROUTE_KEYS.auth,
  "/dashboard": SEO_ROUTE_KEYS.dashboard,
  "/dashboard/vehicles": SEO_ROUTE_KEYS.vehicles,
  "/dashboard/drivers": SEO_ROUTE_KEYS.drivers,
  "/dashboard/closure": SEO_ROUTE_KEYS.closure,
  "/dashboard/incidents": SEO_ROUTE_KEYS.incidents,
  "/dashboard/incidents/declare": SEO_ROUTE_KEYS.incidentDeclare,
  "/dashboard/maintenance": SEO_ROUTE_KEYS.maintenance,
  "/dashboard/reports": SEO_ROUTE_KEYS.reports,
  "/dashboard/invitations": SEO_ROUTE_KEYS.invitations,
  "/dashboard/settings": SEO_ROUTE_KEYS.settings,
  "/dashboard/profile": SEO_ROUTE_KEYS.profile,
  "/dashboard/teams": SEO_ROUTE_KEYS.teams,
  "/dashboard/create-fleet": SEO_ROUTE_KEYS.createFleet,
  "/dashboard/finances": SEO_ROUTE_KEYS.finances,
  "/dashboard/collections": SEO_ROUTE_KEYS.collections,
  "/dashboard/alerts": SEO_ROUTE_KEYS.alerts,
  "/dashboard/roles": SEO_ROUTE_KEYS.roles,
  "/dashboard/my-vehicle": SEO_ROUTE_KEYS.myVehicle,
  "/dashboard/history": SEO_ROUTE_KEYS.history,
  "/dashboard/operations": SEO_ROUTE_KEYS.operations,
};

export function getCanonicalUrlFromPath(path: string): string {
  const base = SITE_BASE_URL.replace(/\/$/, "");
  const normalizedPath = path === "/" ? "/" : `/${path.replace(/^\/|\/$/g, "")}`;
  return normalizedPath === "/" ? `${base}/` : `${base}${normalizedPath}`;
}

export function normalizePathname(pathname: string): string {
  return pathname.endsWith("/") && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;
}

export function resolveSeoRouteKey(pathname: string): SeoRouteKey {
  const normalized = normalizePathname(pathname);
  return PATH_TO_ROUTE_KEY[normalized] ?? SEO_ROUTE_KEYS.notFound;
}

