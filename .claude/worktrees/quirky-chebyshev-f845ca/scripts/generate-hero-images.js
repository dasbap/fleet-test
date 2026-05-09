/**
 * Génère les variantes WebP et AVIF responsives de hero-bg.jpg
 * (768w, 1280w, 1920w) avec un budget max par fichier (défaut 80 Ko).
 */
import fs from "fs";
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const srcPath = path.join(rootDir, "src", "assets", "hero-bg.jpg");
const outDir = path.join(rootDir, "src", "assets");
const WIDTHS = [768, 1280, 1920];

/** Budget max par fichier généré (octets) */
const MAX_BYTES = 80 * 1024;
const MIN_QUALITY = 14;

/**
 * @param {number} bytes
 * @returns {string}
 */
function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} Ko`;
}

/**
 * Encode WebP jusqu'à respecter le budget (baisse la qualité par pas).
 * @param {import("sharp").Sharp} pipeline
 * @param {string} outPath
 * @returns {Promise<number>} taille finale en octets
 */
async function writeWebpUnderBudget(pipeline, outPath) {
  let quality = 82;
  /** @type {Buffer | undefined} */
  let lastBuf;

  while (quality >= MIN_QUALITY) {
    const buf = await pipeline.clone().webp({ quality }).toBuffer();
    lastBuf = buf;
    if (buf.length <= MAX_BYTES) {
      await fs.promises.writeFile(outPath, buf);
      return buf.length;
    }
    quality -= 5;
  }

  if (!lastBuf) {
    lastBuf = await pipeline.clone().webp({ quality: MIN_QUALITY }).toBuffer();
  }
  await fs.promises.writeFile(outPath, lastBuf);
  return lastBuf.length;
}

/**
 * Encode AVIF jusqu'à respecter le budget (qualité + effort).
 * @param {import("sharp").Sharp} pipeline
 * @param {string} outPath
 * @returns {Promise<number>}
 */
async function writeAvifUnderBudget(pipeline, outPath) {
  let quality = 60;
  /** Effort AVIF modéré pour accélérer les itérations (0–9). */
  let effort = 4;
  /** @type {Buffer | undefined} */
  let lastBuf;

  while (quality >= MIN_QUALITY) {
    const buf = await pipeline.clone().avif({ quality, effort }).toBuffer();
    lastBuf = buf;
    if (buf.length <= MAX_BYTES) {
      await fs.promises.writeFile(outPath, buf);
      return buf.length;
    }
    quality -= 4;
    if (quality < 45 && effort > 4) effort -= 1;
  }

  if (!lastBuf) {
    lastBuf = await pipeline.clone().avif({ quality: MIN_QUALITY, effort: 4 }).toBuffer();
  }
  await fs.promises.writeFile(outPath, lastBuf);
  return lastBuf.length;
}

/**
 * Réécrit hero-bg.jpg (max 1920px) sous le budget pour le fallback <picture>.
 * Utilise un buffer source pour éviter les verrous fichier (Windows) lors de l’écriture.
 * @param {Buffer} inputBuffer
 * @returns {Promise<number>}
 */
async function writeHeroJpegFallback(inputBuffer) {
  const pipeline = sharp(inputBuffer).resize(1920, null, { withoutEnlargement: true });
  let quality = 78;
  /** @type {Buffer | undefined} */
  let lastBuf;

  while (quality >= MIN_QUALITY) {
    const buf = await pipeline.clone().jpeg({ mozjpeg: true, quality }).toBuffer();
    lastBuf = buf;
    if (buf.length <= MAX_BYTES) {
      await atomicWrite(srcPath, buf);
      return buf.length;
    }
    quality -= 4;
  }

  if (!lastBuf) {
    lastBuf = await pipeline.clone().jpeg({ mozjpeg: true, quality: MIN_QUALITY }).toBuffer();
  }
  await atomicWrite(srcPath, lastBuf);
  return lastBuf.length;
}

/**
 * Écriture atomique : fichier temporaire puis renommage (évite erreurs UNKNOWN sous Windows).
 * @param {string} destPath
 * @param {Buffer} data
 */
async function atomicWrite(destPath, data) {
  const tmpPath = `${destPath}.tmp`;
  await fs.promises.writeFile(tmpPath, data);
  await fs.promises.rename(tmpPath, destPath);
}

async function generate() {
  const rows = [];
  const baseName = "hero-bg";

  try {
    const inputBuffer = await fs.promises.readFile(srcPath);

    for (const width of WIDTHS) {
      const pipeline = sharp(inputBuffer).resize(width, null, { withoutEnlargement: true });
      const webpPath = path.join(outDir, `${baseName}-${width}.webp`);
      const avifPath = path.join(outDir, `${baseName}-${width}.avif`);

      const webpBytes = await writeWebpUnderBudget(pipeline, webpPath);
      const avifBytes = await writeAvifUnderBudget(
        sharp(inputBuffer).resize(width, null, { withoutEnlargement: true }),
        avifPath,
      );

      rows.push({ file: path.basename(webpPath), bytes: webpBytes, ok: webpBytes <= MAX_BYTES });
      rows.push({ file: path.basename(avifPath), bytes: avifBytes, ok: avifBytes <= MAX_BYTES });
    }

    const jpgBytes = await writeHeroJpegFallback(inputBuffer);
    rows.push({ file: "hero-bg.jpg (fallback)", bytes: jpgBytes, ok: jpgBytes <= MAX_BYTES });

    console.log(`\nHero images — budget max ${formatKb(MAX_BYTES)} par fichier :\n`);
    const labelW = Math.max(...rows.map((r) => r.file.length));
    for (const r of rows) {
      const status = r.ok ? "OK" : "DÉPassement";
      console.log(`  ${r.file.padEnd(labelW)}  ${formatKb(r.bytes).padStart(8)}  ${status}`);
    }
    const over = rows.filter((r) => !r.ok);
    if (over.length > 0) {
      console.warn(
        `\nAttention : ${over.length} fichier(s) dépassent encore le budget à qualité minimale. Réduire la source ou MAX_BYTES.`,
      );
    } else {
      console.log("\nToutes les variantes respectent le budget.");
    }
  } catch (err) {
    console.error("Error generating hero images:", err);
    process.exit(1);
  }
}

generate();
