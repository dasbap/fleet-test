import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { execSync } from "node:child_process";

const DIST_ASSETS = join(process.cwd(), "dist", "assets");
const DIST_ROOT = join(process.cwd(), "dist");
const DIST_INDEX_HTML = join(DIST_ROOT, "index.html");
const IMAGES_DIR = join(process.cwd(), "public", "images");
const BUNDLE_BUDGET_BYTES = Number(process.env.BUNDLE_BUDGET_BYTES ?? "204800");

function formatBytes(value) {
  return `${(value / 1024).toFixed(1)} KB`;
}

function runBuild() {
  execSync("npm run build", { stdio: "inherit" });
}

async function listJsFilesInDir(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const nestedFiles = await listJsFilesInDir(absolutePath);
      files.push(...nestedFiles);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(absolutePath);
    }
  }

  return files;
}

async function listJsFiles() {
  if (!existsSync(DIST_ASSETS)) return [];
  return listJsFilesInDir(DIST_ASSETS);
}

function isCriticalInitialChunk(fileName) {
  return (
    fileName.startsWith("vendor-react") ||
    fileName.startsWith("vendor-router") ||
    fileName.startsWith("index")
  );
}

async function analyzeChunks(files) {
  let totalInitialGzip = 0;
  console.log("\nTailles des chunks JavaScript (gzip/brotli)");
  console.log("--------------------------------");

  for (const path of files) {
    const name = path.split(/[/\\]/).pop() ?? path;
    let data;
    try {
      data = await readFile(path);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        console.warn(`Fichier ignore (inexistant): ${path}`);
        continue;
      }
      throw error;
    }
    const gz = gzipSync(data).byteLength;
    const br = brotliCompressSync(data).byteLength;
    console.log(
      `${name.padEnd(45)} original=${formatBytes(data.byteLength).padStart(9)} gzip=${formatBytes(gz).padStart(9)} brotli=${formatBytes(br).padStart(9)}`,
    );

    if (isCriticalInitialChunk(name)) {
      totalInitialGzip += gz;
    }
  }

  return totalInitialGzip;
}

function collectInitialJsChunkNames(indexHtml) {
  const chunkNames = new Set();
  const jsAssetPattern = /(?:src|href)="\/?assets\/([^"]+\.js)"/g;

  let match = jsAssetPattern.exec(indexHtml);
  while (match) {
    if (match[1]) {
      chunkNames.add(match[1]);
    }
    match = jsAssetPattern.exec(indexHtml);
  }

  return [...chunkNames];
}

async function estimateInitialBundleFromHtml(jsFiles) {
  if (!existsSync(DIST_INDEX_HTML)) {
    return null;
  }

  const indexHtml = await readFile(DIST_INDEX_HTML, "utf8");
  const initialChunkNames = collectInitialJsChunkNames(indexHtml);
  if (initialChunkNames.length === 0) {
    return null;
  }

  const fileByName = new Map(jsFiles.map((filePath) => [filePath.split(/[/\\]/).pop(), filePath]));
  let totalInitialGzip = 0;

  console.log("\nChunks initiaux detectes dans index.html (pour le budget):");
  for (const chunkName of initialChunkNames) {
    const chunkPath = fileByName.get(chunkName);
    if (!chunkPath) {
      console.log(`- ${chunkName} (ignore: fichier introuvable dans dist/assets)`);
      continue;
    }
    const data = await readFile(chunkPath);
    const gzSize = gzipSync(data).byteLength;
    totalInitialGzip += gzSize;
    console.log(`- ${chunkName} (gzip=${formatBytes(gzSize)})`);
  }

  return totalInitialGzip;
}

async function countImages() {
  if (!existsSync(IMAGES_DIR)) {
    return { nonOptimized: 0, webp: 0 };
  }
  const entries = await readdir(IMAGES_DIR, { recursive: true, withFileTypes: true });
  let nonOptimized = 0;
  let webp = 0;

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const lower = entry.name.toLowerCase();
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png")) nonOptimized += 1;
    if (lower.endsWith(".webp")) webp += 1;
  }

  return { nonOptimized, webp };
}

async function main() {
  console.log("E-Samba - Audit performance");
  console.log("================================");
  console.log("\nBuild de production...");
  runBuild();

  const jsFiles = await listJsFiles();
  const totalCriticalChunksGzip = await analyzeChunks(jsFiles);
  const totalInitialFromHtml = await estimateInitialBundleFromHtml(jsFiles);
  const totalInitialGzip = totalInitialFromHtml ?? totalCriticalChunksGzip;

  console.log("\nCalcul du bundle initial (index + preloads module)...");
  if (totalInitialFromHtml === null) {
    console.log("Info: fallback sur les chunks critiques (index + vendor critiques).");
  }
  console.log(`Bundle initial estime (gzip): ${totalInitialGzip} bytes (${formatBytes(totalInitialGzip)})`);
  if (totalInitialGzip > BUNDLE_BUDGET_BYTES) {
    console.error(`ECHEC: bundle initial > budget (${BUNDLE_BUDGET_BYTES} bytes)`);
    process.exit(1);
  }
  console.log("OK: bundle initial sous le budget");

  const { nonOptimized, webp } = await countImages();
  console.log("\nImages non optimisees (public/images)");
  console.log(`JPEG/PNG: ${nonOptimized} | WEBP: ${webp}`);
  if (nonOptimized > webp) {
    console.log("Attention: lancer 'npm run images' pour generer davantage de WebP.");
  }

  console.log("\n================================");
  console.log("Audit termine");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
