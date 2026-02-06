/**
 * Génère les variantes WebP et AVIF responsives de hero-bg.jpg
 * (768w, 1280w, 1920w) pour optimisation LCP et bande passante.
 */
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const srcPath = path.join(rootDir, "src", "assets", "hero-bg.jpg");
const outDir = path.join(rootDir, "src", "assets");
const WIDTHS = [768, 1280, 1920];

async function generate() {
  try {
    const image = sharp(srcPath);
    const baseName = "hero-bg";

    for (const width of WIDTHS) {
      const resized = image.clone().resize(width, null, { withoutEnlargement: true });
      await resized.webp({ quality: 82 }).toFile(path.join(outDir, `${baseName}-${width}.webp`));
      await image
        .clone()
        .resize(width, null, { withoutEnlargement: true })
        .avif({ quality: 60 })
        .toFile(path.join(outDir, `${baseName}-${width}.avif`));
    }

    console.log("Hero images generated:", WIDTHS.flatMap((w) => [`${baseName}-${w}.webp`, `${baseName}-${w}.avif`]).join(", "));
  } catch (err) {
    console.error("Error generating hero images:", err);
    process.exit(1);
  }
}

generate();
