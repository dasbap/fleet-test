import { describe, it, expect } from 'vitest';
import { HelpService, normalizeSearchText } from '@/services/help.service';
import { HelpRepository } from '@/repositories/help.repository';
import { HELP_ARTICLES_SEED_FR } from '@/data/help/articles.seed';
import type { HelpUserContext } from '@/types/help';

const service = new HelpService(new HelpRepository());

const baseCtx: HelpUserContext = {
  role: 'manager',
  planCode: 'pro',
  billingFlags: { financeEnabled: true, reportsEnabled: true },
  pathname: '/dashboard/vehicles',
  locale: 'fr',
};

describe('HelpService', () => {
  it('normalise le texte de recherche (accents)', () => {
    expect(normalizeSearchText('Véhicule')).toBe('vehicule');
  });

  it('retourne des articles de repli FR', () => {
    const articles = service.getFallbackArticles('fr');
    expect(articles.length).toBeGreaterThan(40);
    expect(articles[0].locale).toBe('fr');
  });

  it('filtre par rôle chauffeur', () => {
    const articles = service.getFallbackArticles('fr');
    const driverCtx: HelpUserContext = { ...baseCtx, role: 'driver' };
    const filtered = service.filterForUser(articles, driverCtx);
    expect(filtered.some((a) => a.slug === 'declare-incident')).toBe(true);
    expect(filtered.some((a) => a.role.includes('organizer') && a.role.length === 1 && a.slug === 'manage-multi-fleet')).toBe(false);
  });

  it('recherche fuzzy trouve qr et chauffeur', () => {
    const articles = service.getFallbackArticles('fr');
    const qrResults = service.searchArticles(articles, 'qr');
    expect(qrResults.some((r) => r.article.slug === 'scan-qr')).toBe(true);

    const driverResults = service.searchArticles(articles, 'chauffeur');
    expect(driverResults.length).toBeGreaterThan(0);
  });

  it('résout le slug par route dashboard', () => {
    expect(service.resolveRouteSlug('/dashboard/billing')).toBe('subscription-overview');
    expect(service.resolveRouteSlug('/dashboard/closure')).toBe('shift-closure');
  });

  it('trouve article par code erreur en repli', () => {
    const articles = service.getFallbackArticles('fr');
    const match = articles.find((a) => a.error_codes.includes('billing/payment_failed'));
    expect(match?.slug).toBe('payment-retry');
  });

  it('seed FR couvre quickstart', () => {
    const slugs = HELP_ARTICLES_SEED_FR.map((a) => a.slug);
    expect(slugs).toContain('create-organization');
    expect(slugs).toContain('first-closure');
  });
});
