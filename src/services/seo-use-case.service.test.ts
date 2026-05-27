import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SeoUseCaseService } from '@/services/seo-use-case.service';
import type { SeoUseCaseRepository } from '@/repositories/seo-use-case.repository';
import type { SeoUseCasePublic } from '@/types/seo-use-case';

const samplePage: SeoUseCasePublic = {
  id: '00000000-0000-4000-8000-000000000001',
  slug: 'esamba-transporteur-pme-maintenance-predictive',
  outil: 'esamba',
  cible: 'transporteur-pme',
  cas_usage: 'maintenance-predictive',
  status: 'published',
  published_at: '2026-05-22T00:00:00Z',
  title: 'Titre test',
  meta_description: 'Description test',
  h1: 'H1 test',
  intro: 'Intro',
  body_md: 'Corps',
  intention: 'informationnelle',
  kw_principal: 'maintenance flotte',
  secteur: 'transport',
  entites: ['flotte', 'atelier'],
  paa: ['Question 1 ?'],
  structure_serp: ['H1', 'H2 bénéfices'],
  cta_label: 'Démo',
  cta_href: '/pricing',
  created_at: '2026-05-20T00:00:00Z',
  updated_at: '2026-05-22T00:00:00Z',
  outil_label: 'E-Samba',
  cible_label: 'Transporteur PME',
  cas_usage_label: 'Maintenance prédictive',
};

describe('SeoUseCaseService', () => {
  const findPublishedBySlug = vi.fn();
  const repo = {
    findPublishedBySlug,
    findAllPublished: vi.fn(),
    findAllTaxonomy: vi.fn(),
    findPublishedSlugs: vi.fn(),
  } as unknown as SeoUseCaseRepository;

  const service = new SeoUseCaseService(repo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parseSlug accepte un slug valide E-Samba', () => {
    const parsed = service.parseSlug('esamba-transporteur-pme-maintenance-predictive');
    expect(parsed).toEqual({
      slug: 'esamba-transporteur-pme-maintenance-predictive',
      outil: 'esamba',
      cible: 'transporteur-pme',
      casUsage: 'maintenance-predictive',
    });
  });

  it('parseSlug rejette un slug invalide', () => {
    expect(service.parseSlug('')).toBeNull();
    expect(service.parseSlug('foo-bar')).toBeNull();
    expect(service.parseSlug('unknown-transporteur-pme-maintenance-predictive')).toBeNull();
  });

  it('getPublishedPage retourne null si slug invalide', async () => {
    const result = await service.getPublishedPage('slug-invalide');
    expect(result).toBeNull();
    expect(findPublishedBySlug).not.toHaveBeenCalled();
  });

  it('getPublishedPage délègue au repository', async () => {
    findPublishedBySlug.mockResolvedValue(samplePage);
    const result = await service.getPublishedPage(samplePage.slug);
    expect(findPublishedBySlug).toHaveBeenCalledWith(samplePage.slug);
    expect(result).toEqual(samplePage);
  });

  it('buildSystemPrompt remplit les six consignes SEO', () => {
    const prompt = service.buildSystemPrompt(samplePage);
    expect(prompt).toContain("Cibler l'intention de recherche : informationnelle");
    expect(prompt).toContain('mot-clé principal : maintenance flotte');
    expect(prompt).toContain('- flotte');
    expect(prompt).toContain('- Question 1 ?');
    expect(prompt).toContain('- H2 bénéfices');
    expect(prompt).toContain('décideur, transport');
  });

  it('getCanonicalPath formate le chemin public', () => {
    expect(service.getCanonicalPath('esamba-transporteur-pme-maintenance-predictive')).toBe(
      '/use-case/esamba-transporteur-pme-maintenance-predictive'
    );
  });
});
