import { buildSeoIaCtaUrl } from "../../lib/seo-utm";
import type { SeoIaArticle } from "./types";

export const SEO_IA_PILLARS: SeoIaArticle[] = [
  {
    slug: "optimisation-contenu-ia-seo",
    kind: "pillar",
    primaryKeyword: "optimisation contenu IA pour le SEO",
    title: "Optimisation contenu IA pour le SEO : guide complet 2025 | E-Samba",
    description:
      "Méthode en 7 étapes : intention, entités, brief, score qualité et publication — sans sacrifier l'E-E-A-T.",
    h1: "Optimisation contenu IA pour le SEO : guide complet 2025",
    dateModified: "2026-05-23",
    readingMinutes: 14,
    relatedSlugs: [
      "contenu-ia-optimise-google-2025",
      "ameliorer-classement-google-contenu-ia",
      "score-seo-contenu-genere-ia",
    ],
    ctaPrimary: {
      label: "Télécharger la checklist PDF (contact)",
      href: buildSeoIaCtaUrl("/contact", "optimisation-contenu-ia-seo"),
    },
    leadMagnet: {
      title: "Checklist optimisation contenu IA",
      body: "7 étapes : audit SERP, brief JSON, génération, enrichissement sémantique, score qualité, relecture, publication et suivi GSC.",
    },
    sections: [
      {
        id: "definition",
        heading: "Qu'est-ce que l'optimisation de contenu IA pour le SEO ?",
        paragraphs: [
          "L'optimisation de contenu IA pour le SEO consiste à piloter la génération automatique avec des signaux de recherche structurés : intention, entités nommées, questions PAA et critères éditoriaux. L'IA rédige ; vous définissez le cadre qualité.",
          "En 2025, Google et les moteurs à IA générative récompensent la pertinence utile, pas le volume brut. Votre objectif est un contenu vérifiable, structuré et aligné sur une requête précise.",
        ],
      },
      {
        id: "etapes",
        heading: "Les 7 étapes d'une méthode reproductible",
        paragraphs: [
          "Chaque publication suit le même pipeline pour réduire les allers-retours entre SEO, rédaction et validation métier.",
        ],
        bullets: [
          "1. Cartographier l'intention et la SERP (types de pages, profondeur, format).",
          "2. Construire un brief JSON (mots-clés, entités, angle, interdits).",
          "3. Injecter le brief dans le prompt système (voir pilier « injection SEO »).",
          "4. Générer un plan H2/H3 avant le corps de texte.",
          "5. Enrichir sémantiquement (cooccurrences, synonymes métier).",
          "6. Scorer le brouillon (grille interne + relecture).",
          "7. Publier, mailler et suivre dans Search Console.",
        ],
      },
      {
        id: "eeat",
        heading: "E-E-A-T et contenu assisté par IA",
        paragraphs: [
          "Expérience, expertise, autorité et confiance exigent des signaux humains : auteur identifié, sources, mise à jour datée et corrections transparentes. Un paragraphe « comment ce guide a été produit » renforce la crédibilité.",
        ],
      },
      {
        id: "erreurs",
        heading: "Erreurs fréquentes à éviter",
        paragraphs: [
          "Publier sans brief, dupliquer des intros génériques, négliger le maillage interne ou prétendre qu'un outil SEO magique remplace la stratégie éditoriale.",
        ],
      },
    ],
    faq: [
      {
        id: "p1-faq-1",
        question: "Faut-il déclarer qu'un article est généré par IA ?",
        answer:
          "La transparence est recommandée pour le B2B et le YMYL. Indiquez une relecture humaine et la date de mise à jour.",
      },
      {
        id: "p1-faq-2",
        question: "Quelle longueur pour un pilier SEO assisté par IA ?",
        answer:
          "Visez la profondeur de la SERP : souvent 1 800 à 2 800 mots pour un guide, sans remplissage.",
      },
    ],
  },
  {
    slug: "injecter-donnees-seo-prompt-ia",
    kind: "pillar",
    primaryKeyword: "comment injecter des données SEO dans un prompt IA",
    title: "Injecter des données SEO dans un prompt IA (templates) | E-Samba",
    description:
      "Structures de prompt, variables SERP et garde-fous anti-hallucination pour briefs reproductibles.",
    h1: "Injecter des données SEO dans un prompt IA (templates)",
    dateModified: "2026-05-23",
    readingMinutes: 12,
    relatedSlugs: [
      "brief-seo-automatise-redaction-ia",
      "pipeline-contenu-seo-chatgpt",
      "generer-mots-cles-longue-traine-automatiquement",
    ],
    ctaPrimary: {
      label: "Voir les 5 templates de prompt",
      href: "#templates-prompt",
    },
    leadMagnet: {
      title: "5 templates de prompt SEO",
      body: "System prompt, brief utilisateur, enrichissement sémantique, révision qualité et variante agence — copiables depuis la section dédiée ci-dessous.",
    },
    sections: [
      {
        id: "principe",
        heading: "Pourquoi injecter des données SEO dans le prompt ?",
        paragraphs: [
          "Les LLM optimisent la probabilité linguistique, pas votre classement. En injectant intention, entités et contraintes éditoriales, vous réduisez le contenu générique et alignez la sortie sur la SERP cible.",
        ],
      },
      {
        id: "structure-json",
        heading: "Structure JSON recommandée pour le brief",
        paragraphs: [
          "Stockez les signaux SEO dans un fichier machine-readable passé au modèle en contexte ou en user message.",
        ],
        bullets: [
          "primary_keyword, secondary_keywords[]",
          "search_intent: informational | commercial | transactional",
          "serp_entities[], paa_questions[]",
          "tone, audience, forbidden_claims[]",
          "internal_links[] avec ancres descriptives",
        ],
      },
      {
        id: "templates-prompt",
        heading: "Templates de prompt (copier-coller)",
        paragraphs: [
          "Template system : « Tu es rédacteur SEO B2B (FR). Respecte le brief JSON. Pas de promesses produit non fournies. Réponds en sections H2 avec un résumé de 2 phrases après chaque titre. »",
          "Template user : « Rédige l'article pour {primary_keyword}. Brief : {brief_json}. »",
          "Template enrichissement : « Liste les entités absentes par rapport à {serp_entities} et propose 3 paragraphes d'ajout. »",
          "Template QA : « Score le brouillon sur 5 critères (couverture, structure, ton, faits, maillage) sur 20. »",
          "Template agence : « Produis un plan + FAQ 5 questions avant le corps. »",
        ],
      },
      {
        id: "garde-fous",
        heading: "Garde-fous anti-hallucination",
        paragraphs: [
          "Interdisez les statistiques non sourcées, imposez [À VÉRIFIER] sur les chiffres et exigez une section « Sources » si le sujet est sensible.",
        ],
      },
    ],
    faq: [
      {
        id: "p2-faq-1",
        question: "Où placer le brief : system ou user message ?",
        answer:
          "Règles stables en system ; brief spécifique à l'article en user. Pour Claude, un document brief en tête de conversation fonctionne bien.",
      },
    ],
  },
  {
    slug: "production-contenu-seo-ia-echelle",
    kind: "pillar",
    primaryKeyword: "production de contenu SEO à grande échelle avec IA",
    title: "Production de contenu SEO à grande échelle avec l'IA | E-Samba",
    description:
      "Pipeline éditorial, QA humaine et gouvernance — modèle agence et équipes produit B2B.",
    h1: "Production de contenu SEO à grande échelle avec l'IA",
    dateModified: "2026-05-23",
    readingMinutes: 13,
    relatedSlugs: [
      "pipeline-contenu-seo-chatgpt",
      "analyse-serp-automatique-agence",
      "mots-cles-longue-traine-b2b-saas",
    ],
    ctaPrimary: {
      label: "Réserver une démo E-Samba (ops B2B)",
      href: buildSeoIaCtaUrl("/contact", "production-contenu-seo-ia-echelle"),
    },
    sections: [
      {
        id: "gouvernance",
        heading: "Gouvernance éditoriale avant le volume",
        paragraphs: [
          "Produire 50 articles par mois sans cadre crée du thin content. Définissez des silos sémantiques, des briefs types et un comité de validation par échantillonnage (10 à 20 % des pages).",
        ],
      },
      {
        id: "roles",
        heading: "Rôles dans le pipeline",
        paragraphs: [
          "SEO stratégie, prompt engineer éditorial, rédacteur/relecteur, développeur pour l'intégration CMS. L'IA ne remplace pas la responsabilité éditoriale.",
        ],
        bullets: [
          "SEO : priorisation mots-clés et SERP.",
          "IA ops : templates, tests A/B de prompts.",
          "Rédaction : relecture, E-E-A-T, fact-check.",
          "Tech : publication, canonical, sitemap.",
        ],
      },
      {
        id: "qa",
        heading: "Contrôle qualité à l'échelle",
        paragraphs: [
          "Automatisez le score structurel (Hn, longueur, duplication interne). Bloquez la publication sous un seuil. Tracez version de prompt et date de relecture.",
        ],
      },
      {
        id: "risques",
        heading: "Risques SEO et mitigation",
        paragraphs: [
          "Indexation massive de pages faibles, cannibalisation et footprint de contenu IA générique. Mitigation : indexation progressive, noindex sur variantes tests, maillage strict par cocon.",
        ],
      },
    ],
    faq: [
      {
        id: "p3-faq-1",
        question: "Combien d'articles publier par semaine ?",
        answer:
          "Dépend de l'autorité du domaine. Pour un site jeune, 2 à 4 articles qualité par semaine battent 20 articles médiocres.",
      },
    ],
  },
];
