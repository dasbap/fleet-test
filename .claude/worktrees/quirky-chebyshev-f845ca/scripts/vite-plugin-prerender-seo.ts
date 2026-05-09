/**
 * Plugin Vite : génère un index.html par route avec canonical et meta corrects
 * dans le HTML initial (SEO sans exécution JS).
 * Synchronisé avec src/lib/site.ts (ROUTE_META).
 */

import type { Plugin } from "vite";
import fs from "fs";
import path from "path";
import { ROUTE_META } from "../src/lib/site";

const BASE_URL =
  (process.env.VITE_APP_URL as string | undefined)?.trim() ||
  "https://www.e-samba.com";

function getCanonicalUrl(pathname: string): string {
  const base = BASE_URL.replace(/\/$/, "");
  const p = pathname === "/" ? "" : pathname.replace(/\/$/, "") || "";
  return p ? `${base}${p}` : `${base}/`;
}

function replaceMeta(html: string, pathname: string): string {
  const meta = ROUTE_META[pathname] ?? ROUTE_META["/"];
  const canonical = getCanonicalUrl(pathname);

  return html
    .replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${canonical}" />`
    )
    .replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${escapeHtml(meta.description)}" />`
    )
    .replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:url" content="${escapeHtml(canonical)}" />`
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:title" content="${escapeHtml(meta.title)}" />`
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:description" content="${escapeHtml(meta.description)}" />`
    )
    .replace(
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`
    );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function prerenderSeoPlugin(): Plugin {
  return {
    name: "prerender-seo",
    apply: "build",
    closeBundle() {
      const outDir = path.resolve(process.cwd(), "dist");
      const indexPath = path.join(outDir, "index.html");
      if (!fs.existsSync(indexPath)) return;

      const html = fs.readFileSync(indexPath, "utf-8");
      const routes = Object.keys(ROUTE_META).filter((p) => p !== "/");

      for (const route of routes) {
        const dir = path.join(outDir, route.slice(1)); // "/auth" -> "auth"
        fs.mkdirSync(dir, { recursive: true });
        const modified = replaceMeta(html, route);
        fs.writeFileSync(path.join(dir, "index.html"), modified, "utf-8");
      }
    },
  };
}
