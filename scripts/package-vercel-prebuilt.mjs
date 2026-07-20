/**
 * Prépare .vercel/output à partir de dist/ après `npm run build`.
 * Contournement Windows : `vercel build` échoue parfois avec spawn cmd.exe ENOENT.
 * Usage : npm run build && node scripts/package-vercel-prebuilt.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const outputRoot = path.join(root, ".vercel", "output");
const staticDir = path.join(outputRoot, "static");

function rmrf(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

if (!fs.existsSync(distDir)) {
  console.error("dist/ introuvable. Exécutez d'abord : npm run build");
  process.exit(1);
}

rmrf(outputRoot);
fs.mkdirSync(staticDir, { recursive: true });
copyRecursive(distDir, staticDir);

/** Routes Build Output API v3 — filesystem puis SPA (aligné vercel.json). */
const config = {
  version: 3,
  routes: [
    { handle: "filesystem" },
    {
      src: "/(.*)",
      dest: "/index.html",
    },
  ],
};

fs.writeFileSync(
  path.join(outputRoot, "config.json"),
  `${JSON.stringify(config, null, 2)}\n`,
  "utf-8"
);

console.log(`OK — .vercel/output prêt (${staticDir})`);
console.log("Étape suivante : npx vercel deploy --prebuilt --prod");
