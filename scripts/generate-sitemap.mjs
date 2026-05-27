/**
 * Génère public/sitemap-app.xml (SPA : pages acquisition, sans /dashboard).
 * L'index global est public/sitemap-index.xml (app + site marketing Astro).
 * Usage : node scripts/generate-sitemap.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const base = "https://www.e-samba.com";
const lastmod = new Date().toISOString().slice(0, 10);

const staticPaths = [
  { loc: "/", priority: "1.0", changefreq: "weekly" },
  { loc: "/auth", priority: "0.8", changefreq: "monthly" },
  { loc: "/apropos", priority: "0.6", changefreq: "monthly" },
  { loc: "/carrieres", priority: "0.5", changefreq: "monthly" },
  { loc: "/partenaires", priority: "0.5", changefreq: "monthly" },
  { loc: "/status", priority: "0.4", changefreq: "weekly" },
  { loc: "/securite", priority: "0.6", changefreq: "monthly" },
  { loc: "/pricing", priority: "0.8", changefreq: "monthly" },
  { loc: "/ressources", priority: "0.7", changefreq: "weekly" },
  { loc: "/ressources/seo-ia", priority: "0.85", changefreq: "weekly" },
];

const seoIaSlugs = [
  "optimisation-contenu-ia-seo",
  "injecter-donnees-seo-prompt-ia",
  "production-contenu-seo-ia-echelle",
  "brief-seo-automatise-redaction-ia",
  "score-seo-contenu-genere-ia",
  "contenu-ia-optimise-google-2025",
  "pipeline-contenu-seo-chatgpt",
  "analyser-intention-recherche-ia",
  "generer-mots-cles-longue-traine-automatiquement",
  "outil-seo-contenu-genere-ia",
  "mots-cles-longue-traine-b2b-saas",
  "enrichissement-semantique-contenu-ia",
  "analyse-serp-automatique-agence",
  "outil-seo-freelance-redacteur-ia",
  "ameliorer-classement-google-contenu-ia",
  "modeles/brief-agence",
  "modeles/brief-freelance",
  "modeles/brief-saas",
];

const resourceUrls = seoIaSlugs.map((slug) => ({
  loc: `/ressources/seo-ia/${slug}`,
  priority: slug.startsWith("modeles/") ? "0.65" : slug.includes("optimisation") || slug.includes("injecter") || slug.includes("production") ? "0.8" : "0.7",
  changefreq: "monthly",
}));

const all = [...staticPaths, ...resourceUrls];

const urlEntries = all
  .map(
    (u) => `   <url>
      <loc>${base}${u.loc}</loc>
      <lastmod>${lastmod}</lastmod>
      <changefreq>${u.changefreq}</changefreq>
      <priority>${u.priority}</priority>
   </url>`
  )
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;

const out = path.join(root, "public", "sitemap-app.xml");
fs.writeFileSync(out, xml, "utf-8");
console.log(`Sitemap écrit : ${out} (${all.length} URLs, sans routes /dashboard)`);
