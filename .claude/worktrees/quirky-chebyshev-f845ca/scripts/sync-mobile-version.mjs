#!/usr/bin/env node
/**
 * Aligne versionName / versionCode (Android) et MARKETING_VERSION / CURRENT_PROJECT_VERSION (iOS)
 * sur le champ `version` de package.json, et incrémente le numéro de build natif (ou --build explicite).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function readPackageVersion() {
  const pkgPath = path.join(root, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const v = String(pkg.version ?? "").trim();
  if (!v) {
    throw new Error("package.json : champ version vide ou absent.");
  }
  return v;
}

function parseArgs(argv) {
  let build = null;
  const idx = argv.indexOf("--build");
  if (idx !== -1 && argv[idx + 1] !== undefined) {
    const n = parseInt(String(argv[idx + 1]), 10);
    if (Number.isNaN(n) || n < 1) {
      throw new Error("--build doit être un entier >= 1.");
    }
    build = n;
  }
  return { build };
}

function readAndroidVersionCode(gradleText) {
  const m = gradleText.match(/versionCode\s+(\d+)/);
  return m ? parseInt(m[1], 10) : 1;
}

function main() {
  const marketingVersion = readPackageVersion();
  const { build: explicitBuild } = parseArgs(process.argv.slice(2));

  const gradlePath = path.join(root, "android", "app", "build.gradle");
  let gradle = fs.readFileSync(gradlePath, "utf8");

  const nextBuild =
    explicitBuild !== null
      ? explicitBuild
      : readAndroidVersionCode(gradle) + 1;

  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${nextBuild}`);
  gradle = gradle.replace(
    /versionName\s+"[^"]*"/,
    `versionName "${marketingVersion}"`,
  );
  fs.writeFileSync(gradlePath, gradle, "utf8");

  const pbxPath = path.join(
    root,
    "ios",
    "App",
    "App.xcodeproj",
    "project.pbxproj",
  );
  let pbx = fs.readFileSync(pbxPath, "utf8");
  pbx = pbx.replace(
    /CURRENT_PROJECT_VERSION = \d+;/g,
    `CURRENT_PROJECT_VERSION = ${nextBuild};`,
  );
  pbx = pbx.replace(
    /MARKETING_VERSION = [^;\n]+;/g,
    `MARKETING_VERSION = ${marketingVersion};`,
  );
  fs.writeFileSync(pbxPath, pbx, "utf8");

  console.log(
    `Versions natives alignées : marketing=${marketingVersion}, build=${nextBuild} (Android versionCode / iOS CURRENT_PROJECT_VERSION).`,
  );
}

main();
