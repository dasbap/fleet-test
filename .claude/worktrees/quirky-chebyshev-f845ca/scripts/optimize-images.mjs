/**
 * Pipeline unifie d'optimisation d'images.
 * Profils: hero, resources, store, all.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const HERO_WIDTHS = [768, 1280, 1920];
const HERO_MIN_QUALITY = 14;
const defaultConfigPath = path.join(rootDir, "scripts", "image-profiles.json");

/**
 * @typedef {{
 *   profile: "hero" | "resources" | "store";
 *   file: string;
 *   bytesBefore: number;
 *   bytesAfter: number;
 *   maxBytes: number | null;
 *   ok: boolean;
 * }} ReportRow
 */

/**
 * @param {number} bytes
 */
function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} Ko`;
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {"all" | "hero" | "resources" | "store"} */
  let profile = "all";
  let strict = false;
  let writeReport = false;
  /** @type {"dev" | "staging" | "prod" | ""} */
  let env = "";
  let configPath = defaultConfigPath;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--strict") {
      strict = true;
      continue;
    }
    if (arg === "--report") {
      writeReport = true;
      continue;
    }
    if (arg === "--profile") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("Argument manquant pour --profile (hero|resources|store|all)");
      }
      if (value !== "hero" && value !== "resources" && value !== "store" && value !== "all") {
        throw new Error(`Profil invalide: ${value}`);
      }
      profile = value;
      i += 1;
      continue;
    }
    if (arg === "--env") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("Argument manquant pour --env (dev|staging|prod)");
      }
      if (value !== "dev" && value !== "staging" && value !== "prod") {
        throw new Error(`Environnement invalide: ${value}`);
      }
      env = value;
      i += 1;
      continue;
    }
    if (arg === "--config") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("Argument manquant pour --config");
      }
      configPath = path.isAbsolute(value) ? value : path.join(rootDir, value);
      i += 1;
    }
  }

  return { profile, strict, writeReport, env, configPath };
}

/**
 * @param {string} configPath
 * @param {"dev" | "staging" | "prod" | ""} requestedEnv
 */
async function loadRuntimeConfig(configPath, requestedEnv) {
  const raw = await fs.readFile(configPath, "utf8");
  const parsed = JSON.parse(raw);
  const envName = requestedEnv || parsed.defaultEnvironment || "dev";
  const envConfig = parsed?.environments?.[envName];
  if (!envConfig) {
    throw new Error(`Configuration introuvable pour l'environnement: ${envName}`);
  }
  return {
    envName,
    heroMaxBytes: Number(envConfig.heroMaxBytes || 80 * 1024),
    storeDefaultMaxBytes: Number(envConfig?.store?.defaultMaxBytes || 1500 * 1024),
    storeRules: Array.isArray(envConfig?.store?.rules) ? envConfig.store.rules : [],
    monitoring: {
      maxGrowthPercent: Number(envConfig?.monitoring?.maxGrowthPercent || 5),
      maxGrowthKb: Number(envConfig?.monitoring?.maxGrowthKb || 64),
    },
  };
}

/**
 * @param {string} absolutePath
 */
async function statBytes(absolutePath) {
  const stat = await fs.stat(absolutePath);
  return stat.size;
}

/**
 * @param {string} outPath
 * @param {Buffer} data
 */
async function atomicWrite(outPath, data) {
  const tmpPath = `${outPath}.tmp`;
  await fs.writeFile(tmpPath, data);
  await renameWithRetry(tmpPath, outPath, data);
}

/**
 * @param {string} from
 * @param {string} to
 */
async function renameWithRetry(from, to, fallbackData) {
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await fs.rename(from, to);
      return;
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : "";
      const lockError = code === "EPERM" || code === "EBUSY" || code === "EACCES";
      if (!lockError || attempt === maxAttempts) {
        await copyWithRetry(from, to, fallbackData);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 120));
    }
  }
}

/**
 * @param {string} from
 * @param {string} to
 * @param {Buffer} fallbackData
 */
async function copyWithRetry(from, to, fallbackData) {
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await fs.copyFile(from, to);
      await fs.unlink(from).catch(() => {});
      return;
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : "";
      const lockError = code === "EPERM" || code === "EBUSY" || code === "EACCES" || code === "UNKNOWN";
      if (!lockError || attempt === maxAttempts) {
        await writeWithRetry(to, fallbackData);
        await fs.unlink(from).catch(() => {});
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 150));
    }
  }
}

/**
 * @param {string} outPath
 * @param {Buffer} data
 */
async function writeWithRetry(outPath, data) {
  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await fs.writeFile(outPath, data);
      return;
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : "";
      const lockError = code === "EPERM" || code === "EBUSY" || code === "EACCES" || code === "UNKNOWN";
      if (!lockError || attempt === maxAttempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 180));
    }
  }
}

/**
 * @param {import("sharp").Sharp} pipeline
 * @param {string} outPath
 * @param {number} maxBytes
 */
async function writeWebpUnderBudget(pipeline, outPath, maxBytes) {
  let quality = 82;
  /** @type {Buffer | undefined} */
  let last;
  while (quality >= HERO_MIN_QUALITY) {
    const buf = await pipeline.clone().webp({ quality }).toBuffer();
    last = buf;
    if (buf.length <= maxBytes) {
      await atomicWrite(outPath, buf);
      return buf.length;
    }
    quality -= 5;
  }

  if (!last) {
    last = await pipeline.clone().webp({ quality: HERO_MIN_QUALITY }).toBuffer();
  }
  await atomicWrite(outPath, last);
  return last.length;
}

/**
 * @param {import("sharp").Sharp} pipeline
 * @param {string} outPath
 * @param {number} maxBytes
 */
async function writeAvifUnderBudget(pipeline, outPath, maxBytes) {
  let quality = 60;
  let effort = 4;
  /** @type {Buffer | undefined} */
  let last;
  while (quality >= HERO_MIN_QUALITY) {
    const buf = await pipeline.clone().avif({ quality, effort }).toBuffer();
    last = buf;
    if (buf.length <= maxBytes) {
      await atomicWrite(outPath, buf);
      return buf.length;
    }
    quality -= 4;
    if (quality < 45 && effort > 2) {
      effort -= 1;
    }
  }

  if (!last) {
    last = await pipeline.clone().avif({ quality: HERO_MIN_QUALITY, effort: 2 }).toBuffer();
  }
  await atomicWrite(outPath, last);
  return last.length;
}

/**
 * @param {Buffer} source
 * @param {string} outPath
 * @param {number} maxBytes
 */
async function writeJpegUnderBudget(source, outPath, maxBytes) {
  let quality = 78;
  /** @type {Buffer | undefined} */
  let last;
  const pipeline = sharp(source).resize(1920, null, { withoutEnlargement: true });
  while (quality >= HERO_MIN_QUALITY) {
    const buf = await pipeline.clone().jpeg({ mozjpeg: true, quality }).toBuffer();
    last = buf;
    if (buf.length <= maxBytes) {
      await atomicWrite(outPath, buf);
      return buf.length;
    }
    quality -= 4;
  }

  if (!last) {
    last = await pipeline.clone().jpeg({ mozjpeg: true, quality: HERO_MIN_QUALITY }).toBuffer();
  }
  await atomicWrite(outPath, last);
  return last.length;
}

/**
 * @returns {Promise<ReportRow[]>}
 */
async function optimizeHero(heroMaxBytes) {
  const rows = [];
  const srcPath = path.join(rootDir, "src", "assets", "hero-bg.jpg");
  const outDir = path.join(rootDir, "src", "assets");
  const input = await fs.readFile(srcPath);
  const jpgBefore = await statBytes(srcPath);

  for (const width of HERO_WIDTHS) {
    const pipeline = sharp(input).resize(width, null, { withoutEnlargement: true });
    const webpPath = path.join(outDir, `hero-bg-${width}.webp`);
    const avifPath = path.join(outDir, `hero-bg-${width}.avif`);
    const webpBefore = await safeBytes(webpPath);
    const avifBefore = await safeBytes(avifPath);
    const webpAfter = await writeWebpUnderBudget(pipeline, webpPath, heroMaxBytes);
    const avifAfter = await writeAvifUnderBudget(
      sharp(input).resize(width, null, { withoutEnlargement: true }),
      avifPath,
      heroMaxBytes,
    );

    rows.push({
      profile: "hero",
      file: path.relative(rootDir, webpPath),
      bytesBefore: webpBefore,
      bytesAfter: webpAfter,
      maxBytes: heroMaxBytes,
      ok: webpAfter <= heroMaxBytes,
    });
    rows.push({
      profile: "hero",
      file: path.relative(rootDir, avifPath),
      bytesBefore: avifBefore,
      bytesAfter: avifAfter,
      maxBytes: heroMaxBytes,
      ok: avifAfter <= heroMaxBytes,
    });
  }

  const jpgAfter = await writeJpegUnderBudget(input, srcPath, heroMaxBytes);
  rows.push({
    profile: "hero",
    file: path.relative(rootDir, srcPath),
    bytesBefore: jpgBefore,
    bytesAfter: jpgAfter,
    maxBytes: heroMaxBytes,
    ok: jpgAfter <= heroMaxBytes,
  });

  return rows;
}

/**
 * @returns {Promise<ReportRow[]>}
 */
async function optimizeResources() {
  const rows = [];
  const svgPath = path.join(rootDir, "resources", "icon.svg");
  const pngPath = path.join(rootDir, "resources", "icon.png");
  const svg = await fs.readFile(svgPath);
  const bytesBefore = await safeBytes(pngPath);
  await sharp(svg).resize(1024, 1024).png({ compressionLevel: 9, palette: true }).toFile(pngPath);
  const bytesAfter = await statBytes(pngPath);
  rows.push({
    profile: "resources",
    file: path.relative(rootDir, pngPath),
    bytesBefore,
    bytesAfter,
    maxBytes: null,
    ok: true,
  });
  return rows;
}

/**
 * @param {string} fileName
 */
function getStoreBudget(fileName, storeRules, defaultMaxBytes) {
  for (const rule of storeRules) {
    if (typeof rule?.contains === "string" && fileName.includes(rule.contains)) {
      return Number(rule.maxBytes);
    }
  }
  return defaultMaxBytes;
}

/**
 * @param {string} dir
 */
async function listPngFilesRecursive(dir) {
  /** @type {string[]} */
  const results = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await listPngFilesRecursive(entryPath);
      results.push(...nested);
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) {
      results.push(entryPath);
    }
  }
  return results;
}

/**
 * @param {string} inputPath
 * @param {number} maxBytes
 */
async function optimizePngUnderBudget(inputPath, maxBytes) {
  const source = await fs.readFile(inputPath);
  let quality = 95;
  /** @type {Buffer | undefined} */
  let last;

  while (quality >= 40) {
    const buffer = await sharp(source)
      .png({
        compressionLevel: 9,
        palette: true,
        quality,
        effort: 8,
      })
      .toBuffer();
    last = buffer;
    if (buffer.length <= maxBytes) {
      await atomicWrite(inputPath, buffer);
      return buffer.length;
    }
    quality -= 8;
  }

  if (!last) {
    last = await sharp(source).png({ compressionLevel: 9, palette: true, quality: 40, effort: 8 }).toBuffer();
  }
  await atomicWrite(inputPath, last);
  return last.length;
}

/**
 * @returns {Promise<ReportRow[]>}
 */
async function optimizeStore(storeRules, defaultMaxBytes) {
  const rows = [];
  const storeDir = path.join(rootDir, "store-assets");
  const exists = await pathExists(storeDir);
  if (!exists) {
    return rows;
  }
  const files = await listPngFilesRecursive(storeDir);
  for (const file of files) {
    const budget = getStoreBudget(path.basename(file), storeRules, defaultMaxBytes);
    const before = await statBytes(file);
    const after = await optimizePngUnderBudget(file, budget);
    rows.push({
      profile: "store",
      file: path.relative(rootDir, file),
      bytesBefore: before,
      bytesAfter: after,
      maxBytes: budget,
      ok: after <= budget,
    });
  }
  return rows;
}

/**
 * @param {string} filePath
 */
async function safeBytes(filePath) {
  try {
    return await statBytes(filePath);
  } catch {
    return 0;
  }
}

/**
 * @param {string} filePath
 */
async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {ReportRow[]} rows
 */
function printReport(rows) {
  if (rows.length === 0) {
    console.log("Aucune image traitee pour le profil selectionne.");
    return;
  }

  console.log("\nRapport optimisation images\n");
  const fileW = Math.max(...rows.map((r) => r.file.length));
  for (const row of rows) {
    const delta = row.bytesAfter - row.bytesBefore;
    const deltaLabel = `${delta >= 0 ? "+" : ""}${formatKb(delta)}`;
    const budgetLabel = row.maxBytes ? formatKb(row.maxBytes) : "-";
    const status = row.ok ? "OK" : "KO";
    console.log(
      `${row.file.padEnd(fileW)}  avant=${formatKb(row.bytesBefore).padStart(8)}  apres=${formatKb(row.bytesAfter).padStart(8)}  delta=${deltaLabel.padStart(8)}  budget=${budgetLabel.padStart(8)}  ${status}`,
    );
  }

  const over = rows.filter((r) => !r.ok);
  const totalBefore = rows.reduce((acc, row) => acc + row.bytesBefore, 0);
  const totalAfter = rows.reduce((acc, row) => acc + row.bytesAfter, 0);
  console.log("\nResume:");
  console.log(`- Fichiers: ${rows.length}`);
  console.log(`- Total avant: ${formatKb(totalBefore)}`);
  console.log(`- Total apres: ${formatKb(totalAfter)}`);
  console.log(`- Gain: ${formatKb(totalBefore - totalAfter)}`);
  console.log(`- Hors budget: ${over.length}`);
}

/**
 * @param {ReportRow[]} rows
 * @param {{file:string,growthKb:number,growthPercent:number}[]} monitoringAlerts
 * @param {string} envName
 */
async function writeJsonReport(rows, monitoringAlerts, envName) {
  const reportPath = path.join(rootDir, "scripts", "reports", "optimize-images-report.json");
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  const totalBefore = rows.reduce((acc, row) => acc + row.bytesBefore, 0);
  const totalAfter = rows.reduce((acc, row) => acc + row.bytesAfter, 0);
  const payload = {
    generatedAt: new Date().toISOString(),
    environment: envName,
    summary: {
      files: rows.length,
      totalBeforeBytes: totalBefore,
      totalAfterBytes: totalAfter,
      gainBytes: totalBefore - totalAfter,
      outOfBudget: rows.filter((row) => !row.ok).length,
      monitoringAlerts: monitoringAlerts.length,
    },
    files: rows,
    monitoringAlerts,
  };
  await fs.writeFile(reportPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Rapport JSON ecrit: ${path.relative(rootDir, reportPath)}`);
}

/**
 * @param {ReportRow[]} rows
 * @param {{maxGrowthPercent:number,maxGrowthKb:number}} monitoring
 */
function checkWeightDrift(rows, monitoring) {
  const alerts = rows.filter((row) => {
    if (row.bytesBefore <= 0 || row.bytesAfter <= row.bytesBefore) {
      return false;
    }
    const growthPercent = ((row.bytesAfter - row.bytesBefore) / row.bytesBefore) * 100;
    const growthKb = (row.bytesAfter - row.bytesBefore) / 1024;
    return growthPercent >= monitoring.maxGrowthPercent || growthKb >= monitoring.maxGrowthKb;
  });

  /** @type {{file:string,growthKb:number,growthPercent:number}[]} */
  const alertRows = [];
  if (alerts.length > 0) {
    console.warn(`\nAlerte monitoring: ${alerts.length} fichier(s) avec derive de poids.`);
  }
  for (const row of alerts) {
    const growthPercent = (((row.bytesAfter - row.bytesBefore) / row.bytesBefore) * 100).toFixed(1);
    const growthKb = ((row.bytesAfter - row.bytesBefore) / 1024).toFixed(1);
    const msg = `- ${row.file}: +${growthKb} Ko (+${growthPercent}%)`;
    console.warn(msg);
    alertRows.push({
      file: row.file,
      growthKb: Number(growthKb),
      growthPercent: Number(growthPercent),
    });
    if (process.env.GITHUB_ACTIONS === "true") {
      console.log(`::warning file=${row.file}::Derive de poids detectee (${growthKb} Ko / ${growthPercent}%)`);
    }
  }
  return alertRows;
}

async function main() {
  const { profile, strict, writeReport, env, configPath } = parseArgs(process.argv.slice(2));
  const runtime = await loadRuntimeConfig(configPath, env);
  /** @type {ReportRow[]} */
  const rows = [];
  console.log(`Environnement: ${runtime.envName}`);

  if (profile === "all" || profile === "hero") {
    rows.push(...(await optimizeHero(runtime.heroMaxBytes)));
  }
  if (profile === "all" || profile === "resources") {
    rows.push(...(await optimizeResources()));
  }
  if (profile === "all" || profile === "store") {
    rows.push(...(await optimizeStore(runtime.storeRules, runtime.storeDefaultMaxBytes)));
  }

  printReport(rows);
  const monitoringAlerts = checkWeightDrift(rows, runtime.monitoring);
  if (writeReport) {
    await writeJsonReport(rows, monitoringAlerts, runtime.envName);
  }

  const over = rows.filter((row) => !row.ok);
  if (strict && over.length > 0) {
    throw new Error(`Mode strict: ${over.length} fichier(s) hors budget.`);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Echec optimisation images: ${message}`);
  process.exit(1);
});
