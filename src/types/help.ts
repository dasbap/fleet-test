import type { AppRole } from '@/types/auth';

/** Locale supportée pour les articles d'aide. */
export type HelpLocale = 'fr' | 'en' | 'ln';

/** Catégories publiques indexables SEO. */
export type HelpArticleCategory =
  | 'quickstart'
  | 'driver'
  | 'manager'
  | 'organizer'
  | 'mechanic'
  | 'billing'
  | 'security'
  | 'fleet'
  | 'maintenance'
  | 'drivers'
  | 'vehicles'
  | 'qr'
  | 'reports'
  | 'general';

/** Article d'aide stocké en base Supabase. */
export interface HelpArticleRecord {
  id: string;
  slug: string;
  title: string;
  category: HelpArticleCategory;
  role: AppRole[];
  locale: HelpLocale;
  keywords: string[];
  content: string;
  route_context: string[];
  plan_min: string | null;
  module_keys: string[];
  error_codes: string[];
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface HelpArticleInsert {
  slug: string;
  title: string;
  category: HelpArticleCategory;
  role?: AppRole[];
  locale?: HelpLocale;
  keywords?: string[];
  content: string;
  route_context?: string[];
  plan_min?: string | null;
  module_keys?: string[];
  error_codes?: string[];
  sort_order?: number;
  is_published?: boolean;
}

/** Contexte utilisateur pour filtrage des articles. */
export interface HelpUserContext {
  role: AppRole;
  planCode: string;
  billingFlags: Record<string, boolean>;
  pathname: string;
  locale: HelpLocale;
}

export type HelpViewSource = 'bubble' | 'page' | 'search' | 'error' | 'contextual';

export interface HelpSearchEventInsert {
  query: string;
  results_count: number;
  had_results: boolean;
  fleet_id?: string | null;
}

export interface HelpArticleViewInsert {
  article_id: string;
  source: HelpViewSource;
  fleet_id?: string | null;
}

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type SupportCallbackStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled';

export interface SupportTicketInsert {
  subject: string;
  body: string;
  fleet_id?: string | null;
  priority?: 'low' | 'normal' | 'high';
}

export interface SupportCallbackInsert {
  phone: string;
  preferred_time: string;
  fleet_id?: string | null;
}

/** Mapping route dashboard → slug article principal. */
export const HELP_ROUTE_DEFAULTS: Array<{ pattern: RegExp; slug: string }> = [
  { pattern: /\/dashboard\/vehicles/, slug: 'add-vehicle' },
  { pattern: /\/dashboard\/maintenance/, slug: 'create-intervention' },
  { pattern: /\/dashboard\/billing/, slug: 'subscription-overview' },
  { pattern: /\/dashboard\/drivers/, slug: 'assign-driver' },
  { pattern: /\/dashboard\/closure/, slug: 'shift-closure' },
  { pattern: /\/dashboard\/scan/, slug: 'scan-qr' },
  { pattern: /\/dashboard\/incidents/, slug: 'declare-incident' },
  { pattern: /\/dashboard\/collections/, slug: 'track-receipts' },
  { pattern: /\/dashboard\/finances/, slug: 'finances-overview' },
  { pattern: /\/dashboard\/roles/, slug: 'manage-permissions' },
];

/** Catégories publiques avec libellés FR. */
export const HELP_PUBLIC_CATEGORIES: Array<{ slug: HelpArticleCategory; label: string; emoji: string }> = [
  { slug: 'quickstart', label: 'Démarrage rapide', emoji: '🚀' },
  { slug: 'vehicles', label: 'Véhicules', emoji: '🚛' },
  { slug: 'drivers', label: 'Chauffeurs', emoji: '👤' },
  { slug: 'maintenance', label: 'Maintenance', emoji: '🔧' },
  { slug: 'billing', label: 'Facturation', emoji: '💳' },
  { slug: 'security', label: 'Sécurité', emoji: '🔐' },
  { slug: 'qr', label: 'QR & licences', emoji: '📱' },
];
