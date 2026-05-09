#!/usr/bin/env node
/**
 * Lit android/upload-keystore.jks + android/keystore.properties et pousse les secrets
 * attendus par .github/workflows/release-android.yml via `gh secret set`.
 * Prérequis : `gh auth login`, keystore déjà généré (voir scripts/setup-android-keystore.ps1).
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const android = path.join(root, "android");
const jks = path.join(android, "upload-keystore.jks");
const propsPath = path.join(android, "keystore.properties");

function loadProps() {
  const raw = fs.readFileSync(propsPath, "utf8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function ghSecretSet(name, body) {
  const r = spawnSync(
    "gh",
    ["secret", "set", name, "--body", body],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    },
  );
  if (r.status !== 0) {
    throw new Error(
      `gh secret set ${name} a échoué : ${r.stderr || r.stdout || "code " + r.status}`,
    );
  }
}

function main() {
  if (!fs.existsSync(jks)) {
    console.error("Fichier manquant :", jks);
    console.error("Exécutez d’abord : npm run setup:android-keystore");
    process.exit(1);
  }
  if (!fs.existsSync(propsPath)) {
    console.error("Fichier manquant :", propsPath);
    process.exit(1);
  }

  const p = loadProps();
  const storePassword = p.storePassword;
  const keyPassword = p.keyPassword;
  const keyAlias = p.keyAlias;
  if (!storePassword || !keyPassword || !keyAlias) {
    console.error("keystore.properties incomplet (storePassword, keyPassword, keyAlias).");
    process.exit(1);
  }

  const b64 = fs.readFileSync(jks).toString("base64");

  const gh = spawnSync("gh", ["auth", "status"], { encoding: "utf8" });
  if (gh.status !== 0) {
    console.error("GitHub CLI non authentifié. Lancez : gh auth login");
    process.exit(1);
  }

  ghSecretSet("ANDROID_KEYSTORE_BASE64", b64);
  ghSecretSet("ANDROID_STORE_PASSWORD", storePassword);
  ghSecretSet("ANDROID_KEY_PASSWORD", keyPassword);
  ghSecretSet("ANDROID_KEY_ALIAS", keyAlias);

  console.log(
    "Secrets GitHub définis : ANDROID_KEYSTORE_BASE64, ANDROID_STORE_PASSWORD, ANDROID_KEY_PASSWORD, ANDROID_KEY_ALIAS.",
  );
}

main();
