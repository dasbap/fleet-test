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
  /** Renouvellement / choix d’offre (abonnement). */
  upgrade: "upgrade",
  /** Hub des cas d’usage marketing. */
  useCaseHub: "useCaseHub",
  /** Hub conversion fonctionnalités. */
  fonctionnalites: "fonctionnalites",
  /** Hub modules par rôle. */
  modules: "modules",
  /** FAQ marketing publique. */
  faq: "faq",
  /** Contact et démo. */
  contact: "contact",
  /** Tarifs publics. */
  pricing: "pricing",
  /** Centre d'aide public. */
  help: "help",
  /** Page carrières publique. */
  carrieres: "carrieres",
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
  incidentDeclare: {
    title: "Déclarer un incident - E-Samba",
    description: "Signalement terrain et déclaration d'incident pour la flotte.",
    canonicalPath: "/dashboard/incidents/declare",
  },
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
  upgrade: {
    title: "Abonnement et offres - E-Samba",
    description:
      "Renouvellement d'abonnement et choix d'offre Starter, Pro ou Gratuit pour votre flotte E-Samba.",
    canonicalPath: "/upgrade",
  },
  useCaseHub: {
    title: "Cas d'usage E-Samba | Gestion de flotte",
    description:
      "Parcours par outil, profil metier et probleme operationnel : maintenance, DVIR, transit CEMAC, alertes et rapports.",
    canonicalPath: "/use-case",
  },
  fonctionnalites: {
    title: "Fonctionnalités E-Samba | Gestion de flotte intelligente",
    description:
      "Samba-Fleet, Samba-Fuel, Samba-Care, encaissements, alertes et scoring conducteur pour optimiser votre flotte en Afrique centrale.",
    canonicalPath: "/fonctionnalites",
  },
  modules: {
    title: "Modules E-Samba | Organisateur, gestionnaire, chauffeur, mécanicien",
    description:
      "Interfaces adaptées à chaque rôle métier : multi-flottes, pilotage opérationnel, terrain conducteur et atelier mécanicien.",
    canonicalPath: "/modules",
  },
  faq: {
    title: "FAQ E-Samba | Questions fréquentes",
    description:
      "Réponses sur l'essai gratuit, les paiements Mobile Money, la sécurité des données et la gestion multi-flottes E-Samba.",
    canonicalPath: "/faq",
  },
  contact: {
    title: "Contact E-Samba | Demander une démo",
    description:
      "Contactez l'équipe E-Samba pour une démo personnalisée de gestion de flotte. Réponse sous 24h, sans engagement.",
    canonicalPath: "/contact",
  },
  pricing: {
    title: "Tarifs E-Samba | Plans Starter, Pro et Enterprise",
    description:
      "Tarifs transparents en FCFA par véhicule. Essai gratuit jusqu'à 3 véhicules, Mobile Money et cartes bancaires acceptées.",
    canonicalPath: "/pricing",
  },
  help: {
    title: "Centre d'aide E-Samba",
    description:
      "Guides, tutoriels et articles pour démarrer avec E-Samba : flotte, maintenance, conducteurs et facturation.",
    canonicalPath: "/help",
  },
  carrieres: {
    title: "Carrières - E-Samba",
    description:
      "Rejoignez E-Samba : mobile Android, commercial terrain CEMAC, customer success et data/IA. Télétravail et impact transport Afrique Centrale.",
    canonicalPath: "/carrieres",
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
  "/upgrade": SEO_ROUTE_KEYS.upgrade,
  "/use-case": SEO_ROUTE_KEYS.useCaseHub,
  "/fonctionnalites": SEO_ROUTE_KEYS.fonctionnalites,
  "/modules": SEO_ROUTE_KEYS.modules,
  "/faq": SEO_ROUTE_KEYS.faq,
  "/contact": SEO_ROUTE_KEYS.contact,
  "/pricing": SEO_ROUTE_KEYS.pricing,
  "/help": SEO_ROUTE_KEYS.help,
  "/carrieres": SEO_ROUTE_KEYS.carrieres,
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

