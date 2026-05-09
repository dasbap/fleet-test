/**
 * Assemble l'APK release Android : assure sdk.dir puis lance Gradle.
 * Prérequis : ANDROID_HOME ou ANDROID_SDK_ROOT, ou fichier android/local.properties.
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { ensureAndroidLocalProperties } from "./ensure-android-sdk-dir.mjs";

const androidDir = ensureAndroidLocalProperties();

const isWin = process.platform === "win32";
const gradlew = join(androidDir, isWin ? "gradlew.bat" : "gradlew");
const r = spawnSync(gradlew, ["assembleRelease"], {
  cwd: androidDir,
  stdio: "inherit",
  shell: isWin,
  env: process.env,
});

const code = r.status ?? 1;
if (code === 0) {
  const apk = join(
    androidDir,
    "app",
    "build",
    "outputs",
    "apk",
    "release",
    "app-release.apk",
  );
  console.log(`\n[android] APK attendu : ${apk}`);
}
process.exit(code);
