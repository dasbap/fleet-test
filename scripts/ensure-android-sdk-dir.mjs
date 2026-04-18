/**
 * Garantit android/local.properties avec sdk.dir si absent (ANDROID_HOME / ANDROID_SDK_ROOT).
 */
import { existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

export function ensureAndroidLocalProperties() {
  const androidDir = join(repoRoot, "android");
  const localProps = join(androidDir, "local.properties");
  const sdk = (process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || "").trim();

  if (!existsSync(localProps)) {
    if (!sdk) {
      console.error(
        "SDK Android introuvable. Définissez ANDROID_HOME ou ANDROID_SDK_ROOT,",
      );
      console.error(
        "ou copiez android/local.properties.example vers android/local.properties et renseignez sdk.dir.",
      );
      process.exit(1);
    }
    const normalized = sdk.replace(/\\/g, "/").replace(/\/$/, "");
    writeFileSync(localProps, `sdk.dir=${normalized}\n`, "utf8");
    console.log(`[android] Fichier local.properties créé (sdk.dir=${normalized}).`);
  }

  return androidDir;
}
