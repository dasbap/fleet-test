import type { SeoUseCaseRow } from '@/types/seo-use-case';

const SYSTEM_PROMPT_TEMPLATE = `Tu es un expert SEO. Pour ce contenu, tu dois :
1. Cibler l'intention de recherche : [INTENTION]
2. Intégrer le mot-clé principal : [KW_PRINCIPAL]
3. Couvrir les entités sémantiques : [ENTITÉS]
4. Répondre aux questions associées : [PAA]
5. Structure recommandée par la SERP : [STRUCTURE_SERP]
6. Niveau de lecture cible : B2B, décideur, [SECTEUR]`;

function formatList(items: string[]): string {
  if (items.length === 0) return '—';
  return items.map((item) => `- ${item}`).join('\n');
}

/** Construit le prompt système SEO à partir des champs CMS (usage interne rédaction). */
export function buildSeoSystemPrompt(page: Pick<
  SeoUseCaseRow,
  'intention' | 'kw_principal' | 'secteur' | 'entites' | 'paa' | 'structure_serp'
>): string {
  return SYSTEM_PROMPT_TEMPLATE.replace('[INTENTION]', page.intention.trim() || '—')
    .replace('[KW_PRINCIPAL]', page.kw_principal.trim() || '—')
    .replace('[ENTITÉS]', formatList(page.entites))
    .replace('[PAA]', formatList(page.paa))
    .replace('[STRUCTURE_SERP]', formatList(page.structure_serp))
    .replace('[SECTEUR]', page.secteur.trim() || '—');
}

export function composeUseCaseSlug(outil: string, cible: string, casUsage: string): string {
  return `${outil}-${cible}-${casUsage}`;
}
