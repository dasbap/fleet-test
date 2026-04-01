/**
 * Exporte resources/icon.png (1024×1024) depuis resources/icon.svg
 * pour les outils qui attendent un PNG ; relancer après modification du SVG.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svgPath = join(root, "resources", "icon.svg");
const outPath = join(root, "resources", "icon.png");

const svg = readFileSync(svgPath);
await sharp(svg).resize(1024, 1024).png().toFile(outPath);
console.log("Written", outPath);
