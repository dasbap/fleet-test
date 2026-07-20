import { readFileSync, existsSync } from "fs";
import { join } from "path";

function parseEnvContent(content) {
  const normalized = content.replace(/^\uFEFF/, "");
  normalized.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return;

    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  });
}

export function loadEnvWithLocalFallback(rootPath) {
  const candidatePaths = [join(rootPath, ".env.local"), join(process.cwd(), ".env.local")];
  for (const envPath of candidatePaths) {
    if (!existsSync(envPath)) continue;
    const content = readFileSync(envPath, "utf8");
    parseEnvContent(content);
  }
}

export function getMissingEnv(requiredEnv) {
  return requiredEnv.filter((name) => !process.env[name]);
}
