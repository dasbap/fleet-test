import { ROUTE_PATHS } from "@/navigation/routePaths";
import { SOCIAL } from "@/config/navigation";

/**
 * Index de recherche statique E-Samba.
 *
 * Contient : pages, actions rapides, paramètres, guides et FAQ.
 * Pas de dépendance réseau — disponible immédiatement, 2G-friendly.
 */

export type SearchItemType =
  | 'page'
  | 'action'
  | 'setting'
  | 'guide'
  | 'faq'
  | 'vehicle'; // résultats Supabase dynamiques

export type SearchItemRole = 'all' | 'chauffeur' | 'gestionnaire' | 'mécanicien';

export interface SearchItem {
  id:       string;
  type:     SearchItemType;
  title:    string;
  subtitle: string;
  icon:     string;         // emoji ou nom lucide (résolu côté composant)
  route?:   string;
  action?:  string;         // identifiant action ex: 'scan-qr'
  tags:     string[];
  role:     SearchItemRole;
  weight:   number;         // importance dans le ranking (1-10)
}

// ── Pages ─────────────────────────────────────────────────────────────────────

export const SEARCH_PAGES: SearchItem[] = [
  { id: 'p-dashboard',   type: 'page', title: 'Tableau de bord',     subtitle: 'Vue d\'ensemble de la flotte',        icon: '🏠', route: ROUTE_PATHS.dashboard,            tags: ['accueil','dashboard','flotte'],             role: 'all',          weight: 9 },
  { id: 'p-vehicles',    type: 'page', title: 'Véhicules',           subtitle: 'Liste et gestion des véhicules',      icon: '🚛', route: ROUTE_PATHS.dashboardVehicles,             tags: ['vehicule','voiture','camion','parc'],       role: 'gestionnaire', weight: 9 },
  { id: 'p-maintenance', type: 'page', title: 'Maintenance',         subtitle: 'Ordres de travail et révisions',      icon: '🔧', route: ROUTE_PATHS.dashboardMaintenance,          tags: ['reparation','entretien','panne','révision'], role: 'all',          weight: 8 },
  { id: 'p-fuel',        type: 'page', title: 'Carburant',           subtitle: 'Suivi des pleins et coûts',           icon: '⛽', route: ROUTE_PATHS.dashboardFuel,                 tags: ['essence','gasoil','litre','plein'],         role: 'all',          weight: 7 },
  { id: 'p-dvir',        type: 'page', title: 'Contrôles DVIR',     subtitle: 'Rapports pré/post-départ',            icon: '✅', route: ROUTE_PATHS.dashboardInspections,          tags: ['inspection','controle','dvir','checklist'],  role: 'chauffeur',    weight: 8 },
  { id: 'p-transit',     type: 'page', title: 'Transit CEMAC',       subtitle: 'Passages frontières et corridors',    icon: '🛃', route: ROUTE_PATHS.dashboardTransitCemac,              tags: ['frontiere','douane','cemac','corridor'],    role: 'all',          weight: 7 },
  { id: 'p-alerts',      type: 'page', title: 'Alertes',             subtitle: 'Notifications et incidents actifs',   icon: '🔔', route: ROUTE_PATHS.dashboardAlerts,               tags: ['alerte','notification','incident','urgent'], role: 'gestionnaire', weight: 8 },
  { id: 'p-team',        type: 'page', title: 'Équipe',              subtitle: 'Chauffeurs et rôles',                 icon: '👥', route: ROUTE_PATHS.dashboardTeams,                 tags: ['chauffeur','equipe','invitation','role'],   role: 'gestionnaire', weight: 7 },
  { id: 'p-billing',     type: 'page', title: 'Facturation',         subtitle: 'Abonnement, paiements et plan',       icon: '💳', route: ROUTE_PATHS.dashboardBilling,              tags: ['paiement','facture','abonnement','plan'],   role: 'gestionnaire', weight: 7 },
  { id: 'p-help',        type: 'page', title: 'Centre d\'aide',      subtitle: 'Guides, FAQ et tutoriels',            icon: '❓', route: ROUTE_PATHS.help,                 tags: ['aide','guide','faq','tutoriel','support'],  role: 'all',          weight: 6 },
  { id: 'p-reports',     type: 'page', title: 'Rapports',            subtitle: 'Analytiques et exports',              icon: '📊', route: ROUTE_PATHS.dashboardReports,              tags: ['rapport','export','stat','analytique'],     role: 'gestionnaire', weight: 6 },
  { id: 'p-predictive',  type: 'page', title: 'Diagnostic IA',       subtitle: 'Prédiction pannes et risques',        icon: '🤖', route: ROUTE_PATHS.dashboardPredictiveMaintenance, tags: ['ia','predictif','risque','diagnostic'],    role: 'mécanicien',   weight: 6 },
];

// ── Paramètres ────────────────────────────────────────────────────────────────

export const SEARCH_SETTINGS: SearchItem[] = [
  { id: 's-profile',    type: 'setting', title: 'Mon profil',          subtitle: 'Nom, photo, informations personnelles', icon: '👤', route: ROUTE_PATHS.dashboardProfile,  tags: ['profil','nom','photo','identite'],           role: 'all',          weight: 6 },
  { id: 's-security',   type: 'setting', title: 'Sécurité du compte',  subtitle: 'Appareils connectés, alertes',          icon: '🔐', route: ROUTE_PATHS.dashboardSettings, tags: ['securite','appareil','mot de passe','otp'],  role: 'all',          weight: 7 },
  { id: 's-notifs',     type: 'setting', title: 'Notifications',        subtitle: 'SMS, WhatsApp, alertes push',           icon: '🔔', route: ROUTE_PATHS.dashboardSettings, tags: ['notification','sms','whatsapp','alerte'],  role: 'all',          weight: 5 },
  { id: 's-fleet',      type: 'setting', title: 'Paramètres flotte',   subtitle: 'Nom, pays, devise, fuseau',             icon: '⚙️', route: ROUTE_PATHS.dashboardSettings,   tags: ['flotte','parametre','pays','devise','xaf'],  role: 'gestionnaire', weight: 5 },
  { id: 's-billing-s',  type: 'setting', title: 'Abonnement & plan',   subtitle: 'Changer de plan, renouveler',           icon: '💳', route: ROUTE_PATHS.dashboardBilling,           tags: ['abonnement','plan','upgrade','paiement'],   role: 'gestionnaire', weight: 6 },
  { id: 's-logout',     type: 'setting', title: 'Se déconnecter',      subtitle: 'Fermer la session en cours',            icon: '🚪', action: 'logout',            tags: ['deconnexion','logout','quitter','session'],  role: 'all',          weight: 4 },
];

// ── Actions rapides ───────────────────────────────────────────────────────────

export const SEARCH_ACTIONS: SearchItem[] = [
  { id: 'a-scan',       type: 'action', title: 'Scanner un QR code',    subtitle: 'Identifier un véhicule par QR',       icon: '📱', route: ROUTE_PATHS.dashboardScan,                 tags: ['scanner','qr','vehicule','identifier'],     role: 'all',          weight: 9 },
  { id: 'a-new-vehicle',type: 'action', title: 'Ajouter un véhicule',   subtitle: 'Enregistrer un nouveau véhicule',     icon: '➕', route: ROUTE_PATHS.dashboardVehiclesNew,         tags: ['nouveau','vehicule','ajouter','creer'],     role: 'gestionnaire', weight: 8 },
  { id: 'a-new-dvir',   type: 'action', title: 'Nouveau contrôle DVIR', subtitle: 'Démarrer un contrôle pré-départ',     icon: '✅', route: ROUTE_PATHS.inspectionsNew,  tags: ['dvir','controle','depart','inspection'],    role: 'chauffeur',    weight: 8 },
  { id: 'a-invite',     type: 'action', title: 'Inviter un chauffeur',  subtitle: 'Envoyer une invitation par SMS',      icon: '📨', route: ROUTE_PATHS.dashboardInvitations,          tags: ['invitation','chauffeur','sms','equipe'],    role: 'gestionnaire', weight: 7 },
  { id: 'a-breakdown',  type: 'action', title: 'Signaler une panne',    subtitle: 'Alerter le gestionnaire immédiatement',icon: '🚨', action: 'report-breakdown',   tags: ['panne','urgence','alerte','signaler'],      role: 'chauffeur',    weight: 9 },
  { id: 'a-support',    type: 'action', title: 'Contacter le support',  subtitle: `WhatsApp +${SOCIAL.whatsappNumber}`,         icon: '💬', route: ROUTE_PATHS.contact,    tags: ['aide','support','whatsapp','contact'],      role: 'all',          weight: 7 },
  { id: 'a-new-transit',type: 'action', title: 'Nouveau transit',       subtitle: 'Déclarer un passage frontière CEMAC', icon: '🛃', route: ROUTE_PATHS.transit,          tags: ['transit','frontiere','douane','cemac'],     role: 'all',          weight: 6 },
  { id: 'a-fuel',       type: 'action', title: 'Saisir un plein',       subtitle: 'Enregistrer une dépense carburant',   icon: '⛽', action: 'new-fuel',            tags: ['carburant','plein','essence','litre'],      role: 'chauffeur',    weight: 6 },
];

// ── FAQ (sous-ensemble clé) ───────────────────────────────────────────────────

export const SEARCH_FAQ: SearchItem[] = [
  { id: 'faq-1', type: 'faq', title: 'Comment scanner un QR de véhicule ?',      subtitle: 'Guide QR → identification',                     icon: '❓', route: '/help', tags: ['qr','scanner','vehicule'],                   role: 'all',       weight: 7 },
  { id: 'faq-2', type: 'faq', title: 'Je n\'ai pas reçu mon code SMS OTP',       subtitle: 'Vérifier l\'opérateur, renvoyer par WhatsApp',   icon: '❓', route: '/help', tags: ['otp','sms','code','connexion','whatsapp'],    role: 'all',       weight: 8 },
  { id: 'faq-3', type: 'faq', title: 'Mon abonnement est-il toujours actif ?',   subtitle: 'Voir l\'état de votre plan',                     icon: '❓', route: ROUTE_PATHS.dashboardBilling, tags: ['abonnement','plan','expiration','actif'],   role: 'gestionnaire', weight: 7 },
  { id: 'faq-4', type: 'faq', title: 'Comment inviter un chauffeur ?',           subtitle: 'Envoyer une invitation par SMS ou lien',         icon: '❓', route: ROUTE_PATHS.help, tags: ['invitation','chauffeur','sms'],               role: 'gestionnaire', weight: 7 },
  { id: 'faq-5', type: 'faq', title: 'Que faire en cas d\'accident ?',           subtitle: 'Procédure d\'urgence étape par étape',           icon: '❓', route: ROUTE_PATHS.help, tags: ['accident','panne','urgence','procedure'],     role: 'chauffeur', weight: 8 },
  { id: 'faq-6', type: 'faq', title: 'Comment changer mon numéro de téléphone ?',subtitle: 'Modifier les informations du compte',            icon: '❓', route: ROUTE_PATHS.dashboardProfile, tags: ['telephone','compte','modifier'],  role: 'all',       weight: 6 },
  { id: 'faq-7', type: 'faq', title: 'Le QR code ne fonctionne pas',             subtitle: 'Réimprimer ou régénérer depuis la fiche véhicule',icon: '❓', route: ROUTE_PATHS.help, tags: ['qr','code','imprimer','vehicule'],            role: 'all',       weight: 6 },
  { id: 'faq-8', type: 'faq', title: 'Passer à un plan supérieur',               subtitle: 'Débloquer plus de véhicules et fonctionnalités', icon: '❓', route: ROUTE_PATHS.dashboardBilling, tags: ['upgrade','plan','vehicule','fonctionnalite'], role: 'gestionnaire', weight: 6 },
];

// ── Index global ──────────────────────────────────────────────────────────────

export const FULL_SEARCH_INDEX: SearchItem[] = [
  ...SEARCH_ACTIONS,
  ...SEARCH_PAGES,
  ...SEARCH_SETTINGS,
  ...SEARCH_FAQ,
];

// ── Groupes pour l'affichage ──────────────────────────────────────────────────

export const GROUP_LABELS: Record<SearchItemType, string> = {
  action:  'Actions rapides',
  page:    'Pages',
  setting: 'Paramètres',
  guide:   'Guides',
  faq:     'Questions fréquentes',
  vehicle: 'Véhicules',
};

export const GROUP_ORDER: SearchItemType[] = [
  'action', 'vehicle', 'page', 'setting', 'faq', 'guide',
];
