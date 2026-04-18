/**
 * Lance Gradle bundleRelease depuis android/ (Windows / Unix).
 * Prérequis : SDK Android (ANDROID_HOME ou local.properties), npm run mobile:prepare, keystore release pour Play.
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { ensureAndroidLocalProperties } from "./ensure-android-sdk-dir.mjs";

const androidDir = ensureAndroidLocalProperties();
const isWin = process.platform === "win32";
const gradlew = isWin ? "gradlew.bat" : "./gradlew";

const result = spawnSync(gradlew, ["bundleRelease"], {
  cwd: androidDir,
  stdio: "inherit",
  shell: isWin,
  env: process.env,
});

const code = result.status ?? 1;
if (code === 0) {
  const aab = join(
    androidDir,
    "app",
    "build",
    "outputs",
    "bundle",
    "release",
    "app-release.aab",
  );
  console.log(`\n[android] AAB attendu : ${aab}`);
}
process.exit(code);
