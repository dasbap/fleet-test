/**
 * Synchronise data/published-use-cases.json depuis Supabase (optionnel)
 * et régénère les entrées sitemap des pages /use-case/.
 *
 * Usage :
 *   node scripts/generate-use-case-seo.mjs
 *   node scripts/generate-use-case-seo.mjs --fetch   # nécessite SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "src", "data", "published-use-cases.json");
const baseUrl =
  (process.env.VITE_APP_URL || "https://www.e-samba.com").replace(/\/$/, "");

async function fetchPublishedFromSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Variables SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises pour --fetch"
    );
  }

  const endpoint = `${url.replace(/\/$/, "")}/rest/v1/seo_use_cases?select=slug,title,meta_description&status=eq.published&order=published_at.desc`;
  const res = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Supabase REST ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

function readLocalPublished() {
  if (!fs.existsSync(dataPath)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(dataPath, "utf-8"));
}

async function main() {
  const shouldFetch = process.argv.includes("--fetch");
  let pages = readLocalPublished();

  if (shouldFetch) {
    pages = await fetchPublishedFromSupabase();
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    fs.writeFileSync(dataPath, `${JSON.stringify(pages, null, 2)}\n`, "utf-8");
    console.log(`Écrit ${pages.length} page(s) dans src/data/published-use-cases.json`);
  }

  if (!Array.isArray(pages) || pages.length === 0) {
    console.warn("Aucune page use-case publiée — data/published-use-cases.json vide ou absent.");
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const useCaseUrls = pages.map(
    (p) => `  <url>
    <loc>${baseUrl}/use-case/${p.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`
  );

  const hubUrl = `  <url>
    <loc>${baseUrl}/use-case</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.75</priority>
  </url>`;

  const sitemapPath = path.join(root, "public", "sitemap-app.xml");
  let sitemap = fs.readFileSync(sitemapPath, "utf-8");
  const markerStart = "<!-- use-case:auto:start -->";
  const markerEnd = "<!-- use-case:auto:end -->";
  const block = `${markerStart}\n${hubUrl}\n${useCaseUrls.join("\n")}\n${markerEnd}`;

  if (sitemap.includes(markerStart)) {
    sitemap = sitemap.replace(
      new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}`),
      block
    );
  } else {
    sitemap = sitemap.replace(
      "</urlset>",
      `${block}\n</urlset>`
    );
  }

  fs.writeFileSync(sitemapPath, sitemap, "utf-8");
  console.log(`Sitemap mis à jour (${pages.length} pages use-case).`);
  console.log("Relancez npm run build pour pré-rendre les métas HTML.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
