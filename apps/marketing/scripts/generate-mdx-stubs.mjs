/**
 * Génère les squelettes MDX du hub marketing (idempotent).
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..", "src", "content");

const guides = [
  {
    slug: "pilotage-flotte-ia",
    kind: "hub",
    pillar: "ia",
    title: "Pilotage flotte avec l'IA",
    description:
      "Hub : intelligence artificielle appliquée au carburant, aux rapports et à la discipline conducteur.",
  },
  {
    slug: "analyser-donnees-carburant-ia",
    pillar: "ia",
    title: "Comment analyser les données carburant avec l'IA",
    description:
      "Détecter les anomalies de consommation et réduire le poste carburant de votre flotte.",
    relatedSolution: "transporteurs-cemac",
    relatedFeature: "carburant",
  },
  {
    slug: "rapports-flotte-enrichis-ia",
    pillar: "ia",
    title: "Rapports flotte enrichis par l'IA",
    description:
      "Consolider multi-flottes et prioriser les alertes grâce à des synthèses automatisées.",
    relatedSolution: "equipes-operations",
    relatedFeature: "rapports-analytics",
  },
  {
    slug: "score-conducteur-evaluer",
    pillar: "ia",
    title: "Score conducteur : comment l'évaluer avant sanctions",
    description:
      "Indicateurs de discipline, clôture journalière et équité des décisions RH.",
    relatedSolution: "gestionnaires-flotte",
    relatedFeature: "score-conducteur",
  },
  {
    slug: "operations-flotte-2026-cemac",
    pillar: "ia",
    title: "Opérations flotte 2026 en zone CEMAC",
    description:
      "Évolutions réglementaires, transit et bonnes pratiques terrain pour transporteurs.",
    relatedSolution: "transporteurs-cemac",
    relatedFeature: "alertes",
  },
  {
    slug: "operations-transport",
    kind: "hub",
    pillar: "operations",
    title: "Guides opérationnels transport",
    description:
      "Hub : gestion PME, données terrain, maintenance et reporting de bout en bout.",
  },
  {
    slug: "gestion-flotte-pme-cemac",
    pillar: "operations",
    title: "Gestion de flotte PME en zone CEMAC",
    description:
      "Structurer un parc de 5 à 50 véhicules sans ERP lourd — guide pratique B2B.",
    relatedSolution: "pme-logistique",
    relatedFeature: "rapports-analytics",
  },
  {
    slug: "donnees-terrain-tableau-de-bord",
    pillar: "operations",
    title: "Données terrain et qualité du tableau de bord",
    description:
      "KPIs fiables : saisie chauffeur, clôtures et validation gestionnaire.",
    relatedSolution: "gestionnaires-flotte",
    relatedFeature: "score-conducteur",
  },
  {
    slug: "brief-maintenance-preventive",
    pillar: "operations",
    title: "Brief maintenance préventive pour atelier",
    description:
      "Checklists, photos obligatoires et planification Samba-Care.",
    relatedSolution: "pme-logistique",
    relatedFeature: "maintenance",
  },
  {
    slug: "pipeline-reporting-flotte",
    pillar: "operations",
    title: "Pipeline reporting flotte de la clôture aux finances",
    description:
      "Du terrain à la validation financière : workflow pas à pas.",
    relatedSolution: "equipes-operations",
    relatedFeature: "rapports-analytics",
  },
  {
    slug: "performance-conformite-flotte",
    kind: "hub",
    pillar: "performance",
    title: "Performance et conformité flotte",
    description:
      "Hub : KPIs multi-flottes, coût au km et maîtrise des encaissements.",
  },
  {
    slug: "kpi-gestionnaire-multi-flottes",
    pillar: "performance",
    title: "KPIs du gestionnaire multi-flottes",
    description:
      "Seuils, alertes et arbitrage pour les organisateurs E-Samba.",
    relatedSolution: "equipes-operations",
    relatedFeature: "alertes",
  },
  {
    slug: "benchmark-cout-km-cemac",
    pillar: "performance",
    title: "Benchmark coût au kilomètre en CEMAC",
    description:
      "Carburant, immobilisation et maintenance : comparer votre flotte.",
    relatedSolution: "transporteurs-cemac",
    relatedFeature: "carburant",
  },
  {
    slug: "reduire-ecarts-encaissements",
    pillar: "performance",
    title: "Réduire les écarts d'encaissements",
    description:
      "Samba-Cash, Mobile Money et clôture obligatoire pour limiter les pertes.",
    relatedSolution: "pme-logistique",
    relatedFeature: "score-conducteur",
  },
];

const solutions = [
  {
    slug: "transporteurs-cemac",
    title: "E-Samba pour transporteurs CEMAC",
    description:
      "Corridors, transit et suivi véhicules pour exploitants régionaux.",
    audience: "Transporteurs",
  },
  {
    slug: "gestionnaires-flotte",
    title: "Outil pour gestionnaires de flotte",
    description:
      "Pilotage de 2 à 50 véhicules : affectations, clôtures et encaissements.",
    audience: "Gestionnaires",
  },
  {
    slug: "pme-logistique",
    title: "Production logistique PME à l'échelle",
    description:
      "Standardiser les processus sans multiplier les fichiers Excel.",
    audience: "PME logistique",
  },
  {
    slug: "equipes-operations",
    title: "Pipeline opérations pour équipes growth",
    description:
      "Visibilité temps réel et alerting pour scaler la flotte.",
    audience: "Équipes opérations",
  },
];

const features = [
  {
    slug: "carburant",
    title: "Samba-Fuel — suivi carburant",
    description:
      "Planification, anomalies et économies sur le poste énergie.",
    module: "Samba-Fuel",
  },
  {
    slug: "rapports-analytics",
    title: "Rapports et analytics multi-flottes",
    description:
      "Tableaux consolidés et exports pour décideurs.",
    module: "Analytics",
  },
  {
    slug: "alertes",
    title: "Alertes intelligentes",
    description:
      "Push, email et SMS sur seuils critiques.",
    module: "Alertes",
  },
  {
    slug: "maintenance",
    title: "Samba-Care — maintenance",
    description:
      "Atelier, photos obligatoires et checklists techniques.",
    module: "Samba-Care",
  },
  {
    slug: "score-conducteur",
    title: "Score conducteur et discipline",
    description:
      "Clôture journalière, historique et sanctions traçables.",
    module: "Discipline",
  },
];

function body(title) {
  return `
## Contexte

Ce guide présente les bonnes pratiques autour de **${title}** pour les gestionnaires de flotte en Afrique centrale.

## Points clés

- Centraliser les données terrain dans un seul outil.
- Définir des seuils d'alerte adaptés à votre parc.
- Former chauffeurs et gestionnaires aux clôtures quotidiennes.

## Prochaines étapes

Passez à l'action avec E-Samba : essai gratuit, configuration de votre flotte en moins d'une journée.
`.trim();
}

function frontmatter(data, extra = {}) {
  const lines = [
    "---",
    `title: "${data.title.replace(/"/g, '\\"')}"`,
    `description: "${data.description.replace(/"/g, '\\"')}"`,
    "pubDate: 2026-05-20",
    "draft: false",
  ];
  if (data.kind) lines.push(`kind: ${data.kind}`);
  if (data.pillar) lines.push(`pillar: ${data.pillar}`);
  if (data.relatedSolution)
    lines.push(`relatedSolution: ${data.relatedSolution}`);
  if (data.relatedFeature)
    lines.push(`relatedFeature: ${data.relatedFeature}`);
  if (data.audience) lines.push(`audience: "${data.audience}"`);
  if (data.module) lines.push(`module: "${data.module}"`);
  Object.entries(extra).forEach(([k, v]) => lines.push(`${k}: ${v}`));
  lines.push("---", "");
  return lines.join("\n");
}

function writeMdx(dir, items) {
  for (const item of items) {
    const file = join(root, dir, `${item.slug}.mdx`);
    if (!existsSync(dirname(file))) mkdirSync(dirname(file), { recursive: true });
    const content = frontmatter(item) + "\n" + body(item.title) + "\n";
    writeFileSync(file, content, "utf8");
    console.log("écrit:", file);
  }
}

writeMdx("guides", guides);
writeMdx("solutions", solutions);
writeMdx("features", features);
