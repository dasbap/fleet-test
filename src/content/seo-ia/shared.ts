import type { FaqItem } from "../../types/faq";

/** Encart honnête vers le produit flotte (max 1 par article). */
export function productBridgeParagraph(slug: string): string {
  const demoUrl = buildSeoIaCtaUrl("/", slug);
  return `À l'échelle d'une organisation B2B, la traçabilité des opérations compte autant que celle du contenu. E-Samba est une plateforme de gestion de flotte pour l'Afrique centrale — pas un outil SEO. Si vous industrialisez des processus métier, vous pouvez [demander une démo](${demoUrl}) pour voir comment structurer vos opérations.`;
}

export const HUB_FAQ: FaqItem[] = [
  {
    id: "hub-faq-1",
    question: "Qu'est-ce que l'optimisation de contenu IA pour le SEO ?",
    answer:
      "C'est l'ajustement d'un texte généré par IA à partir de données SEO structurées : intention de recherche, entités, requêtes longue traîne, structure Hn et critères qualité. L'objectif est la pertinence pour l'utilisateur, pas le bourrage de mots-clés.",
  },
  {
    id: "hub-faq-2",
    question: "Comment injecter des données SEO dans un prompt sans sur-optimiser ?",
    answer:
      "Fournissez intention, entités et questions PAA en JSON, imposez une densité lexicale naturelle et une relecture humaine. Évitez les listes de mots-clés brutes dans le system prompt.",
  },
  {
    id: "hub-faq-3",
    question: "Un contenu 100 % IA peut-il bien se classer sur Google en 2025 ?",
    answer:
      "Oui, si le contenu apporte une valeur originale, est factuel, relu et conforme aux consignes helpful content. Google pénalise le contenu générique ou dupliqué, pas l'usage de l'IA en soi.",
  },
  {
    id: "hub-faq-4",
    question: "Quelle différence entre intention informationnelle et commerciale en brief IA ?",
    answer:
      "L'intention informationnelle vise à apprendre (guides, définitions). La commerciale compare ou évalue des solutions (critères, méthodes). Le brief IA doit adapter structure, CTA et preuves en conséquence.",
  },
  {
    id: "hub-faq-5",
    question: "Comment scorer un contenu généré avant publication ?",
    answer:
      "Utilisez une grille : couverture sémantique, structure Hn, unicité, lisibilité, maillage interne et conformité E-E-A-T. Un score composite aide à décider si une révision humaine est requise.",
  },
  {
    id: "hub-faq-6",
    question: "Faut-il une relecture humaine dans un pipeline ChatGPT SEO ?",
    answer:
      "Oui pour tout contenu YMYL ou B2B à fort enjeu. L'IA accélère la recherche et la structuration ; l'humain valide faits, ton et conformité juridique.",
  },
  {
    id: "hub-faq-7",
    question: "Comment générer des mots-clés longue traîne B2B SaaS pertinents ?",
    answer:
      "Croisez jobs-to-be-done, questions clients support et SERP longue traîne. Validez le volume avec un outil SEO puis priorisez l'intention et la proximité avec votre offre.",
  },
  {
    id: "hub-faq-8",
    question: "L'analyse SERP automatique remplace-t-elle un consultant SEO ?",
    answer:
      "Non. Elle accélère la collecte de signaux (PAA, types de pages, entités). La stratégie, la priorisation business et l'interprétation restent humaines.",
  },
  {
    id: "hub-faq-9",
    question: "Quels risques de duplicate content avec la production à grande échelle ?",
    answer:
      "Templates trop rigides, spin léger et pages quasi identiques. Mitigation : briefs différenciés, canonicals, indexation progressive et QA par échantillonnage.",
  },
  {
    id: "hub-faq-10",
    question: "Comment E-Samba (flotte) et la qualité de contenu B2B sont-ils liés ?",
    answer:
      "E-Samba ne vend pas de SEO : c'est un SaaS de gestion de flotte. Le lien est méthodologique — gouvernance, traçabilité et production fiable à l'échelle, compétences transférables à un pipeline éditorial B2B.",
  },
];
