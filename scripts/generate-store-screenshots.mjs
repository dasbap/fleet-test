/**
 * Génère des visuels type « captures store » (placeholders marque) pour Play Console et App Store Connect.
 * Réexécuter après changement de charte : npm run store:screenshots
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outRoot = path.join(root, "store-assets");

const BG = "#0f0f0f";
const ACCENT = "#22c55e";
const TEXT = "#fafafa";
const MUTED = "#a3a3a3";

function escXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** @type {{ id: string; title: string; subtitle: string }[]} */
const SCREENS = [
  { id: "01-accueil", title: "Flotte E-Samba", subtitle: "Tableau de bord — vue d’ensemble" },
  { id: "02-connexion", title: "Connexion sécurisée", subtitle: "Accès compte et rôles" },
  { id: "03-flotte", title: "Flotte", subtitle: "Véhicules et affectations" },
  { id: "04-operations", title: "Opérations", subtitle: "Missions et terrain" },
  { id: "05-alertes", title: "Alertes", subtitle: "Notifications et incidents" },
];

/**
 * @param {number} w
 * @param {number} h
 * @param {string} title
 * @param {string} subtitle
 */
function buildSvgFrame(w, h, title, subtitle) {
  const titleSize = Math.round(Math.min(w, h) * 0.045);
  const subSize = Math.round(Math.min(w, h) * 0.028);
  const logoR = Math.round(Math.min(w, h) * 0.06);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${BG}"/>
      <stop offset="100%" style="stop-color:#171717"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect x="${w * 0.08}" y="${h * 0.12}" width="${w * 0.84}" height="${h * 0.62}" rx="24" fill="#1a1a1a" stroke="${ACCENT}" stroke-width="4" opacity="0.95"/>
  <circle cx="${w / 2}" cy="${h * 0.28}" r="${logoR}" fill="${ACCENT}"/>
  <path d="M ${w / 2 - logoR * 0.35} ${h * 0.28 - logoR * 0.15} L ${w / 2 - logoR * 0.55} ${h * 0.28 + logoR * 0.25} L ${w / 2 - logoR * 0.15} ${h * 0.28 + logoR * 0.25} L ${w / 2 - logoR * 0.35} ${h * 0.28 + logoR * 0.55} L ${w / 2 + logoR * 0.45} ${h * 0.28 - logoR * 0.05} L ${w / 2 + logoR * 0.1} ${h * 0.28 - logoR * 0.05} Z" fill="#0a0a0a"/>
  <text x="${w / 2}" y="${h * 0.48}" text-anchor="middle" fill="${TEXT}" font-family="system-ui,Segoe UI,sans-serif" font-weight="700" font-size="${titleSize}">${escXml(title)}</text>
  <text x="${w / 2}" y="${h * 0.54}" text-anchor="middle" fill="${MUTED}" font-family="system-ui,Segoe UI,sans-serif" font-weight="400" font-size="${subSize}">${escXml(subtitle)}</text>
  <text x="${w / 2}" y="${h * 0.92}" text-anchor="middle" fill="${MUTED}" font-family="system-ui,Segoe UI,sans-serif" font-size="${Math.round(subSize * 0.75)}">Placeholder marketing — remplacer par de vraies captures si besoin</text>
</svg>`;
}

/** Icône haute résolution Play (512×512) — vérifier les exigences actuelles dans la console. */
function buildSvgStoreIcon512() {
  const w = 512;
  const h = 512;
  const logoR = 140;
  const cx = w / 2;
  const cy = h / 2 - 20;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="ig" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${BG}"/>
      <stop offset="100%" style="stop-color:#171717"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" rx="96" fill="url(#ig)"/>
  <circle cx="${cx}" cy="${cy}" r="${logoR}" fill="${ACCENT}"/>
  <path d="M ${cx - logoR * 0.35} ${cy - logoR * 0.15} L ${cx - logoR * 0.55} ${cy + logoR * 0.25} L ${cx - logoR * 0.15} ${cy + logoR * 0.25} L ${cx - logoR * 0.35} ${cy + logoR * 0.55} L ${cx + logoR * 0.45} ${cy - logoR * 0.05} L ${cx + logoR * 0.1} ${cy - logoR * 0.05} Z" fill="#0a0a0a"/>
  <text x="${cx}" y="${h * 0.88}" text-anchor="middle" fill="${MUTED}" font-family="system-ui,Segoe UI,sans-serif" font-size="18">E-Samba</text>
</svg>`;
}

/** Graphique principal type bannière (1024×500) — confirmer les dimensions dans Play Console. */
function buildSvgFeatureGraphic() {
  const w = 1024;
  const h = 500;
  const logoR = 72;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="fg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#0a0a0a"/>
      <stop offset="100%" style="stop-color:#262626"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#fg)"/>
  <circle cx="${180}" cy="${h / 2}" r="${logoR}" fill="${ACCENT}"/>
  <path d="M ${180 - logoR * 0.35} ${h / 2 - logoR * 0.15} L ${180 - logoR * 0.55} ${h / 2 + logoR * 0.25} L ${180 - logoR * 0.15} ${h / 2 + logoR * 0.25} L ${180 - logoR * 0.35} ${h / 2 + logoR * 0.55} L ${180 + logoR * 0.45} ${h / 2 - logoR * 0.05} L ${180 + logoR * 0.1} ${h / 2 - logoR * 0.05} Z" fill="#0a0a0a"/>
  <text x="300" y="${h / 2 - 18}" fill="${TEXT}" font-family="system-ui,Segoe UI,sans-serif" font-weight="700" font-size="42">${escXml("Flotte E-Samba")}</text>
  <text x="300" y="${h / 2 + 28}" fill="${MUTED}" font-family="system-ui,Segoe UI,sans-serif" font-size="22">${escXml("Gestion de flotte — placeholder marketing")}</text>
</svg>`;
}

/**
 * @param {string} dir
 * @param {number} w
 * @param {number} h
 * @param {string} prefix
 */
async function writeScreens(dir, w, h, prefix) {
  await fs.mkdir(dir, { recursive: true });
  for (const s of SCREENS) {
    const svg = buildSvgFrame(w, h, s.title, s.subtitle);
    const pngPath = path.join(dir, `${prefix}-${s.id}.png`);
    await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(pngPath);
    console.log("OK", path.relative(root, pngPath));
  }
}

async function main() {
  await fs.mkdir(outRoot, { recursive: true });
  const gpDir = path.join(outRoot, "google-play");
  await writeScreens(gpDir, 1080, 1920, "play-phone");

  const icon512 = path.join(gpDir, "play-store-icon-512.png");
  await sharp(Buffer.from(buildSvgStoreIcon512())).png({ compressionLevel: 9 }).toFile(icon512);
  console.log("OK", path.relative(root, icon512));

  const feature = path.join(gpDir, "play-feature-graphic-1024x500.png");
  await sharp(Buffer.from(buildSvgFeatureGraphic())).png({ compressionLevel: 9 }).toFile(feature);
  console.log("OK", path.relative(root, feature));

  await writeScreens(path.join(outRoot, "app-store"), 1290, 2796, "iphone-67");
  console.log("Terminé :", outRoot);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
