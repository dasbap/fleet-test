#!/usr/bin/env node
/**
 * Vérification statique de capacitor.config.ts vs projets natifs (sans émulateur).
 * Complète la QA manuelle splash / deep links (voir README § App mobile).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const failures = [];
const notes = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function ok(msg) {
  console.log(`[OK] ${msg}`);
}

function fail(msg) {
  failures.push(msg);
  console.error(`[FAIL] ${msg}`);
}

function note(msg) {
  notes.push(msg);
  console.log(`[info] ${msg}`);
}

// --- capacitor.config.ts (source) vs JSON copié dans android ---
const tsConfig = read("capacitor.config.ts");
const androidJsonPath = "android/app/src/main/assets/capacitor.config.json";
if (!fs.existsSync(path.join(root, androidJsonPath))) {
  fail(`${androidJsonPath} absent — lancez npm run mobile:prepare`);
} else {
  const synced = JSON.parse(read(androidJsonPath));
  const expectedAppId = "com.esamba.flotte";
  if (synced.appId !== expectedAppId) {
    fail(`capacitor.config.json appId=${synced.appId} (attendu ${expectedAppId})`);
  } else {
    ok(`appId ${expectedAppId} synchronisé dans android/assets`);
  }
  const splashBg = synced.plugins?.SplashScreen?.backgroundColor;
  if (splashBg !== "#0f0f0f") {
    fail(`SplashScreen.backgroundColor=${splashBg} (attendu #0f0f0f, thème sombre UI)`);
  } else {
    ok("SplashScreen plugin : fond #0f0f0f (aligné UI sombre)");
  }
  if (synced.backgroundColor !== "#00C853" || synced.android?.backgroundColor !== "#00C853") {
    fail("backgroundColor racine/android doit être #00C853 (marque)");
  } else {
    ok("backgroundColor WebView / android : #00C853 (marque)");
  }
}

if (!tsConfig.includes('appId: "com.esamba.flotte"')) {
  fail("capacitor.config.ts : appId manquant ou modifié");
}

// --- Android Gradle ---
const gradle = read("android/app/build.gradle");
if (!gradle.includes('applicationId "com.esamba.flotte"')) {
  fail("android/app/build.gradle : applicationId non aligné");
} else {
  ok("Gradle applicationId aligné");
}

// --- Splash natif Android (système 12+) vs plugin ---
const colorsXml = read("android/app/src/main/res/values/colors.xml");
if (!colorsXml.includes("splash_background") || !colorsXml.includes("#00C853")) {
  fail("colors.xml : splash_background #00C853 attendu pour splash système");
} else {
  ok("Splash système Android (values/colors) : #00C853");
}

if (!read("android/app/src/main/res/values/styles.xml").includes("Theme.SplashScreen")) {
  fail("styles.xml : thème SplashScreen attendu");
} else {
  ok("Thème AppTheme.NoActionBarLaunch → Theme.SplashScreen");
}

// --- Deep links ---
const manifest = read("android/app/src/main/AndroidManifest.xml");
if (!manifest.includes('android:scheme="esamba"')) {
  fail("AndroidManifest : intent-filter esamba:// manquant");
} else {
  ok("AndroidManifest : schéma esamba:// déclaré");
}

if (!manifest.includes('android:host="www.e-samba.com"') || !manifest.includes("android:autoVerify")) {
  fail("AndroidManifest : App Links https://www.e-samba.com manquants");
} else {
  ok("AndroidManifest : App Links www.e-samba.com (autoVerify)");
}

const assetLinksPath = "public/.well-known/assetlinks.json";
if (!fs.existsSync(path.join(root, assetLinksPath))) {
  fail(`${assetLinksPath} absent`);
} else {
  const assetLinks = read(assetLinksPath);
  if (!assetLinks.includes("com.esamba.flotte")) {
    fail("assetlinks.json : package_name manquant");
  } else if (assetLinks.includes("REPLACE_WITH_PLAY_APP_SIGNING_SHA256")) {
    fail("assetlinks.json : empreinte Play manquante — npm run supabase:push-auth-config ou scripts/apply-mobile-store-setup.mjs");
  } else if (!assetLinks.includes("com.esamba.flotte")) {
    fail("assetlinks.json : package_name invalide");
  } else {
    ok("assetlinks.json présent (empreintes configurées)");
  }
}

const aasaPath = "public/.well-known/apple-app-site-association";
if (!fs.existsSync(path.join(root, aasaPath))) {
  fail(`${aasaPath} absent`);
} else {
  const aasa = read(aasaPath);
  if (!aasa.includes("com.esamba.flotte")) {
    fail("apple-app-site-association : appID manquant");
  } else if (aasa.includes("TEAMID.")) {
    note("apple-app-site-association : définir APPLE_TEAM_ID dans .env.local puis npm run supabase:push-auth-config");
  } else if (!aasa.includes("com.esamba.flotte")) {
    fail("apple-app-site-association : appID invalide");
  } else {
    ok("apple-app-site-association présent");
  }
}

const debugEnt = read("ios/App/App/App.debug.entitlements");
if (!debugEnt.includes("applinks:www.e-samba.com")) {
  fail("App.debug.entitlements : Associated Domains manquants");
} else {
  ok("iOS Associated Domains (debug)");
}

if (!read("src/lib/deepLinks/resolveAppUrl.ts").includes("tryParseEsambaAuthSpaPath")) {
  fail("resolveAppUrl.ts : handler auth mobile manquant");
} else {
  ok("resolveAppUrl.ts : auth + HTTPS App Links");
}

const infoPlist = read("ios/App/App/Info.plist");
if (!infoPlist.includes("<string>esamba</string>")) {
  fail("Info.plist : CFBundleURLSchemes esamba manquant");
} else {
  ok("iOS Info.plist : schéma esamba:// déclaré");
}

const deepLinkConfig = read("src/lib/deepLinks/deepLinkConfig.ts");
if (!deepLinkConfig.includes('"esamba"')) {
  fail("deepLinkConfig.ts : ESAMBA_DEEP_LINK_SCHEME incohérent");
} else {
  ok("deepLinkConfig.ts : schéma esamba");
}

// --- webDir / dist ---
if (!fs.existsSync(path.join(root, "dist", "index.html"))) {
  note("dist/index.html absent — exécutez npm run mobile:prepare avant un run natif");
} else {
  ok("dist/index.html présent (build Capacitor)");
}

note(
  "QA manuelle appareil : cold start (splash système vert → plugin #0f0f0f ~2s → WebView)"
);
note(
  'Deep links ADB : adb shell am start -a android.intent.action.VIEW -d "esamba://alerts" -n com.esamba.flotte/.MainActivity'
);
note(
  'Puis : adb shell am start -a android.intent.action.VIEW -d "esamba://fleet" -n com.esamba.flotte/.MainActivity'
);

console.log("");
if (failures.length > 0) {
  console.error(`${failures.length} erreur(s).`);
  process.exit(1);
}
console.log("Vérification statique Capacitor : OK.");
