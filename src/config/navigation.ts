/**
 * Source unique de navigation publique, auth et liens sociaux.
 * Consommer via `@/config/navigation` — ne pas dupliquer les href en dur.
 */
import { ROUTE_PATHS } from "@/navigation/routePaths";

const viteEnv =
  typeof import.meta !== "undefined" && "env" in import.meta
    ? (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    : undefined;
const processEnv =
  typeof process !== "undefined"
    ? (process.env as Record<string, string | undefined>)
    : undefined;

const WHATSAPP_NUMBER =
  viteEnv?.VITE_WHATSAPP_NUMBER ?? processEnv?.VITE_WHATSAPP_NUMBER ?? "237641341857";

export type PublicNavItemType = "anchor" | "route" | "external";

export interface PublicNavItem {
  label: string;
  href: string;
  type: PublicNavItemType;
}

export interface AuthNavItem {
  label: string;
  href: string;
  primary: boolean;
}

export interface FooterLink {
  name: string;
  to: string;
}

export interface DashboardNavItem {
  label: string;
  href: string;
}

/** Liens principaux header public (navbar desktop + mobile). */
export const PUBLIC_NAV: readonly PublicNavItem[] = [
  { label: "Fonctionnalités", href: ROUTE_PATHS.fonctionnalites, type: "route" },
  { label: "Modules", href: ROUTE_PATHS.modules, type: "route" },
  { label: "Tarifs", href: ROUTE_PATHS.pricing, type: "route" },
  { label: "FAQ", href: ROUTE_PATHS.faq, type: "route" },
  { label: "Contact", href: ROUTE_PATHS.contact, type: "route" },
];

/** CTAs header (connexion, démo, inscription). */
export const AUTH_NAV: readonly AuthNavItem[] = [
  { label: "Connexion", href: ROUTE_PATHS.auth, primary: false },
  { label: "Demander une démo", href: ROUTE_PATHS.contact, primary: false },
];

/** CTA démo — ancre formulaire contact. */
export const PUBLIC_DEMO_HREF = ROUTE_PATHS.contact;

/** CTAs landing page (hero + sections). */
export const LANDING_CTA = {
  signupHref: ROUTE_PATHS.contact,
  signupLabel: "Demander un acces",
  demoAudioHref: ROUTE_PATHS.contact,
  demoAudioLabel: "Écouter la démo",
} as const;

/** Raccourci auth primaire (inscription). */
export function getPrimaryAuthHref(): string {
  return AUTH_NAV.find((item) => item.primary)?.href ?? LANDING_CTA.signupHref;
}

/** Liens produit footer. */
export const FOOTER_PRODUCT_LINKS: readonly FooterLink[] = [
  { name: "Fonctionnalités", to: ROUTE_PATHS.fonctionnalites },
  { name: "Modules", to: ROUTE_PATHS.modules },
  { name: "Tarifs", to: ROUTE_PATHS.pricing },
  { name: "Sécurité", to: ROUTE_PATHS.securite },
];

/** Coordonnées publiques E-Samba. */
export const CONTACT = {
  email: "contact@e-samba.com",
  phoneE164: "+237641341857",
  phoneDisplay: "+237 6 41 34 18 57",
  city: "Douala, Cameroun",
  telHref: "tel:+237641341857",
  mailtoHref: "mailto:contact@e-samba.com",
} as const;

/** Support produit (aide, facturation). */
export const SUPPORT = {
  email: "support@e-samba.com",
  mailtoHref: "mailto:support@e-samba.com",
} as const;

/** Contact confidentialité / RGPD. */
export const PRIVACY = {
  email: "privacy@e-samba.com",
  mailtoHref: "mailto:privacy@e-samba.com",
} as const;

/** Emails métier par département (pages publiques spécialisées). */
export const DEPARTMENT_EMAILS = {
  api: "api@e-samba.com",
  security: "security@e-samba.com",
  rh: "rh@e-samba.com",
  partenaires: "partenaires@e-samba.com",
  status: "status@e-samba.com",
} as const;

/** Construit un lien mailto avec sujet et corps optionnels. */
export function buildMailtoHref(
  email: string,
  options?: { subject?: string; body?: string },
): string {
  const params = new URLSearchParams();
  if (options?.subject) params.set("subject", options.subject);
  if (options?.body) params.set("body", options.body);
  const qs = params.toString();
  return qs ? `mailto:${email}?${qs}` : `mailto:${email}`;
}

/** Lien mailto vers le support produit. */
export function buildSupportMailto(subject?: string, body?: string): string {
  return buildMailtoHref(SUPPORT.email, { subject, body });
}

/** Liens support footer (pages publiques stables uniquement). */
export const FOOTER_SUPPORT_LINKS: readonly FooterLink[] = [
  { name: "Centre d'aide", to: ROUTE_PATHS.help },
  { name: "Démarrage rapide", to: ROUTE_PATHS.helpQuickstart },
  { name: "Status", to: "/status" },
];

/** Liens sociaux et contact externe. */
export const SOCIAL = {
  whatsappNumber: WHATSAPP_NUMBER,
  whatsapp: `https://wa.me/${WHATSAPP_NUMBER}`,
  whatsappDemoMessage:
    "Bonjour, je souhaite demander une démo de E-Samba pour ma flotte.",
  whatsappLandingMessage: "Bonjour, je souhaite en savoir plus sur E-Samba.",
  whatsappSupportMessage:
    "Bonjour E-Samba Support 👋\nJ'ai besoin d'aide avec :\n\n[décrivez votre problème]",
  whatsappBillingMessage:
    "Bonjour, je souhaite de l'aide sur mon abonnement E-Samba",
  whatsappLiveDemoMessage: "Bonjour, je souhaite une démo live de E-Samba.",
} as const;

/** Construit une URL WhatsApp avec message pré-rempli. */
export function buildWhatsAppUrl(message: string): string {
  return `${SOCIAL.whatsapp}?text=${encodeURIComponent(message)}`;
}

/** Indique si un lien PUBLIC_NAV correspond à la route courante. */
export function isPublicNavActive(
  item: PublicNavItem,
  pathname: string,
  hash: string,
): boolean {
  if (item.type === "anchor") {
    const anchor = item.href.includes("#") ? `#${item.href.split("#")[1]}` : "";
    return pathname === "/" && hash === anchor;
  }

  const [path] = item.href.split("#");
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** Navigation dashboard par rôle (labels + href — icônes dans DashboardSidebar). */
export const DASHBOARD_NAV = {
  organizer: [
    { label: "Tableau de bord", href: ROUTE_PATHS.dashboard },
    { label: "Véhicules", href: ROUTE_PATHS.dashboardVehicles },
    { label: "Incidents", href: ROUTE_PATHS.dashboardIncidents },
    { label: "Maintenance", href: ROUTE_PATHS.dashboardMaintenance },
    { label: "Opérations", href: ROUTE_PATHS.dashboardOperations },
    { label: "Équipes", href: ROUTE_PATHS.dashboardTeams },
    { label: "Scores conducteurs", href: ROUTE_PATHS.dashboardDriverScores },
    { label: "Invitations", href: ROUTE_PATHS.dashboardInvitations },
    { label: "Rapports", href: ROUTE_PATHS.dashboardReports },
    { label: "Suivi GPS", href: ROUTE_PATHS.dashboardTracking },
    { label: "Géofencing", href: ROUTE_PATHS.dashboardGeofencing },
    { label: "Rapports auto", href: ROUTE_PATHS.dashboardScheduledReports },
    { label: "Finances", href: ROUTE_PATHS.dashboardFinances },
    { label: "Abonnement", href: ROUTE_PATHS.dashboardBilling },
    { label: "Alertes", href: ROUTE_PATHS.dashboardAlerts },
    { label: "Coaching vocal", href: ROUTE_PATHS.dashboardCoaching },
    { label: "Dashcam AI", href: ROUTE_PATHS.dashboardDashcam },
  ],
  manager: [
    { label: "Tableau de bord", href: ROUTE_PATHS.dashboard },
    { label: "Véhicules", href: ROUTE_PATHS.dashboardVehicles },
    { label: "Incidents", href: ROUTE_PATHS.dashboardIncidents },
    { label: "Maintenance", href: ROUTE_PATHS.dashboardMaintenance },
    { label: "Opérations", href: ROUTE_PATHS.dashboardOperations },
    { label: "Équipes", href: ROUTE_PATHS.dashboardTeams },
    { label: "Chauffeurs", href: ROUTE_PATHS.dashboardDrivers },
    { label: "Scores conducteurs", href: ROUTE_PATHS.dashboardDriverScores },
    { label: "Invitations", href: ROUTE_PATHS.dashboardInvitations },
    { label: "Rapports", href: ROUTE_PATHS.dashboardReports },
    { label: "Suivi GPS", href: ROUTE_PATHS.dashboardTracking },
    { label: "Géofencing", href: ROUTE_PATHS.dashboardGeofencing },
    { label: "Rapports auto", href: ROUTE_PATHS.dashboardScheduledReports },
    { label: "Encaissements", href: ROUTE_PATHS.dashboardCollections },
    { label: "Abonnement", href: ROUTE_PATHS.dashboardBilling },
    { label: "Alertes", href: ROUTE_PATHS.dashboardAlerts },
    { label: "Coaching vocal", href: ROUTE_PATHS.dashboardCoaching },
    { label: "Dashcam AI", href: ROUTE_PATHS.dashboardDashcam },
  ],
  driver: [
    { label: "Mon tableau", href: ROUTE_PATHS.dashboard },
    { label: "Mon véhicule", href: ROUTE_PATHS.dashboardMyVehicle },
    { label: "Clôture", href: ROUTE_PATHS.dashboardShiftClosure },
    { label: "Signaler", href: ROUTE_PATHS.dashboardIncidents },
    { label: "Coaching vocal", href: ROUTE_PATHS.dashboardCoaching },
  ],
  mechanic: [
    { label: "Interventions", href: ROUTE_PATHS.dashboardMaintenance },
    { label: "Incidents", href: ROUTE_PATHS.dashboardIncidents },
    { label: "Véhicules", href: ROUTE_PATHS.dashboardVehicles },
    { label: "Historique", href: ROUTE_PATHS.dashboardHistory },
  ],
  admin: [
    { label: "Administration", href: ROUTE_PATHS.dashboardAdmin },
    { label: "Admin comptes", href: ROUTE_PATHS.dashboardAdminUsers },
    { label: "Comptes demo", href: ROUTE_PATHS.dashboardAdminDemo },
    { label: "FAQ publique", href: ROUTE_PATHS.dashboardAdminFaq },
    { label: "Aide admin", href: ROUTE_PATHS.dashboardHelpAdmin },
  ],
  organizerExtras: {
    retention: { label: "Rétention", href: ROUTE_PATHS.dashboardRetentionAnalytics },
    roles: { label: "Rôles", href: ROUTE_PATHS.dashboardRoles },
  },
} as const;

/** Hrefs filtrés selon le plan (finances / rapports). */
export const DASHBOARD_FINANCE_NAV_HREFS = new Set([
  ROUTE_PATHS.dashboardFinances,
  ROUTE_PATHS.dashboardCollections,
]);

export const DASHBOARD_REPORTS_NAV_HREFS = new Set([ROUTE_PATHS.dashboardReports]);

/** Filtre les entrées sidebar selon les droits plan facturation. */
export function filterDashboardNavByPlan<T extends { href: string }>(
  items: readonly T[],
  options: { financeEnabled: boolean; reportsEnabled: boolean },
): T[] {
  return items.filter((item) => {
    if (DASHBOARD_FINANCE_NAV_HREFS.has(item.href)) return options.financeEnabled;
    if (DASHBOARD_REPORTS_NAV_HREFS.has(item.href)) return options.reportsEnabled;
    return true;
  });
}

/** Liens footer sidebar dashboard (profil, paramètres). */
export const DASHBOARD_SIDEBAR_FOOTER = [
  { label: "Mon profil", href: ROUTE_PATHS.dashboardProfile },
  { label: "Paramètres", href: ROUTE_PATHS.dashboardSettings },
] as const;

/** Active state sidebar : inclut les sous-routes (ex. fiche véhicule). */
export function isDashboardNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === ROUTE_PATHS.dashboard) return false;
  if (href === ROUTE_PATHS.dashboardAdmin) return false;
  return pathname.startsWith(`${href}/`);
}

/** @deprecated Préférer PUBLIC_NAV — conservé pour compatibilité imports historiques. */
export type PublicNavLink =
  | { name: string; to: string; external?: false }
  | { name: string; href: string; external: true };

/** @deprecated Préférer PUBLIC_NAV */
export const PUBLIC_NAV_LINKS: readonly PublicNavLink[] = PUBLIC_NAV.map((item) => {
  if (item.type === "external") {
    return { name: item.label, href: item.href, external: true as const };
  }
  return { name: item.label, to: item.href, external: false as const };
});
