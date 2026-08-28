#!/usr/bin/env node
/**
 * Applique assetlinks / AASA et pousse la config auth Supabase (redirect URLs mobile).
 * Empreintes : upload-keystore.jks (release) + debug.keystore (dev local).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const MOBILE_REDIRECT_URLS = [
  "esamba://**",
  "esamba://auth/callback",
  "esamba://auth/update-password",
  "com.esamba.flotte://**",
  "com.esamba.flotte://auth/callback",
  "com.esamba.flotte://auth/update-password",
  "https://www.e-samba.com/auth/callback",
  "https://www.e-samba.com/auth/callback/**",
  "https://www.e-samba.com/auth/update-password",
  "https://www.e-samba.com/auth/update-password/**",
];

const PRODUCTION_REDIRECT_URLS = [
  "https://www.e-samba.com/**",
  "https://e-samba.com/**",
  "https://app.e-samba.com/**",
  "http://localhost:8080/**",
  "http://smart-fleet-africa.vercel.app/**",
];

const DEMO_OTP_TEMPLATE_BLOCK = `[auth.email.template.magic_link]
subject = "E-Samba — Vérification de votre adresse e-mail"
content_path = "./templates/magic_link.html"`;

function log(msg) {
  console.log(`[mobile-setup] ${msg}`);
}

function extractSha256(keytoolOutput) {
  const line = keytoolOutput.split(/\r?\n/).find((l) => /SHA\s*256/i.test(l));
  if (!line) return null;
  const m = line.match(/([0-9A-F]{2}(?::[0-9A-F]{2}){31})/i);
  return m ? m[1].toUpperCase() : null;
}

function readShaFromKeystore(keystorePath, alias, storePass, keyPass) {
  const out = execSync(
    `keytool -list -v -keystore "${keystorePath}" -alias ${alias} -storepass ${storePass} -keypass ${keyPass}`,
    { encoding: "utf8", cwd: root },
  );
  return extractSha256(out);
}

function loadReleaseSha256() {
  const propsPath = path.join(root, "android", "keystore.properties");
  if (!fs.existsSync(propsPath)) {
    return null;
  }
  const props = Object.fromEntries(
    fs
      .readFileSync(propsPath, "utf8")
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
  const storeFile = props.storeFile?.replace(/^\.\.\//, "android/");
  const ks = path.join(root, storeFile ?? "android/upload-keystore.jks");
  if (!fs.existsSync(ks)) return null;
  return readShaFromKeystore(ks, props.keyAlias ?? "upload", props.storePassword, props.keyPassword);
}

function loadDebugSha256() {
  const home = process.env.USERPROFILE || process.env.HOME || "";
  const ks = path.join(home, ".android", "debug.keystore");
  if (!fs.existsSync(ks)) return null;
  return readShaFromKeystore(ks, "androiddebugkey", "android", "android");
}

function writeAssetLinks(fingerprints) {
  const unique = [...new Set(fingerprints.filter(Boolean))];
  const payload = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.esamba.flotte",
        sha256_cert_fingerprints: unique,
      },
    },
  ];
  const outPath = path.join(root, "public", ".well-known", "assetlinks.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  log(`assetlinks.json mis à jour (${unique.length} empreinte(s)).`);
}

function writeAasa(teamId) {
  const appId = `${teamId}.com.esamba.flotte`;
  const payload = {
    applinks: {
      apps: [],
      details: [
        {
          appID: appId,
          paths: [
            "/auth/*",
            "/dashboard/*",
            "/post-login",
            "/post-login/*",
            "/onboarding",
            "/onboarding/*",
            "/start",
            "/terrain",
            "/terrain/*",
            "/maintenance",
            "/maintenance/*",
            "/upgrade",
            "/login",
          ],
        },
      ],
    },
  };
  const outPath = path.join(root, "public", ".well-known", "apple-app-site-association");
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  log(`apple-app-site-association : appID=${appId}`);
}

function patchPbxprojTeam(teamId) {
  const pbx = path.join(root, "ios", "App", "App.xcodeproj", "project.pbxproj");
  let text = fs.readFileSync(pbx, "utf8");
  if (text.includes(`DEVELOPMENT_TEAM = ${teamId}`)) {
    log("project.pbxproj : DEVELOPMENT_TEAM déjà présent.");
    return;
  }
  const marker = "PRODUCT_BUNDLE_IDENTIFIER = com.esamba.flotte;";
  if (!text.includes(marker)) {
    log("project.pbxproj : bundle id introuvable, DEVELOPMENT_TEAM non injecté.");
    return;
  }
  text = text.replace(
    new RegExp(`(${marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "g"),
    `$1\n\t\t\t\tDEVELOPMENT_TEAM = ${teamId};`,
  );
  fs.writeFileSync(pbx, text, "utf8");
  log(`project.pbxproj : DEVELOPMENT_TEAM=${teamId} ajouté.`);
}

function mergeConfigTomlRedirects() {
  const configPath = path.join(root, "supabase", "config.toml");
  let text = fs.readFileSync(configPath, "utf8");

  if (!text.includes('site_url = "https://www.e-samba.com"')) {
    text = text.replace(
      /site_url\s*=\s*"[^"]*"/,
      'site_url = "https://www.e-samba.com"',
    );
  }

  const existing = new Set();
  const arrayMatch = text.match(/additional_redirect_urls\s*=\s*\[([\s\S]*?)\]/);
  if (arrayMatch) {
    const inner = arrayMatch[1];
    for (const m of inner.matchAll(/"([^"]+)"/g)) {
      existing.add(m[1]);
    }
  }
  for (const u of [...MOBILE_REDIRECT_URLS, ...PRODUCTION_REDIRECT_URLS]) {
    existing.add(u);
  }
  const keepLocal = [
    "https://127.0.0.1:3000",
    "http://localhost:8080/auth",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];
  for (const u of keepLocal) {
    existing.add(u);
  }

  const lines = [...existing].sort().map((u) => `  "${u}"`);
  const block = `additional_redirect_urls = [\n${lines.join(",\n")},\n]`;
  if (arrayMatch) {
    text = text.replace(/additional_redirect_urls\s*=\s*\[[\s\S]*?\]/, block);
  }

  if (!text.includes("[auth.email.template.magic_link]")) {
    text = text.replace(
      /\n\[auth\.sms\]/,
      `\n${DEMO_OTP_TEMPLATE_BLOCK}\n\n[auth.sms]`,
    );
  }

  fs.writeFileSync(configPath, text, "utf8");
  log("supabase/config.toml : redirects + template OTP E-Samba fusionnés.");
}

function pushSupabaseConfig() {
  try {
    execSync("npx supabase config push --yes", {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });
    log("Supabase config push : OK (projet lié).");
  } catch (e) {
    console.error("[mobile-setup] Supabase config push a échoué.", e.message);
    process.exitCode = 1;
  }
}

const releaseSha = loadReleaseSha256();
const debugSha = loadDebugSha256();
const fps = [releaseSha, debugSha].filter(Boolean);
if (fps.length === 0) {
  console.error("[mobile-setup] Aucune empreinte SHA-256 détectée.");
  process.exit(1);
}
writeAssetLinks(fps);

const teamId = (process.env.APPLE_TEAM_ID || process.env.APPLE_DEVELOPMENT_TEAM || "").trim();
if (teamId) {
  writeAasa(teamId);
  patchPbxprojTeam(teamId);
  log(
    "Associated Domains : entitlements déjà dans ios/App/App/*.entitlements — activer la capacité sur l’App ID dans developer.apple.com si besoin.",
  );
} else {
  log(
    "APPLE_TEAM_ID absent : apple-app-site-association inchangé (TEAMID). Définir APPLE_TEAM_ID dans .env.local puis relancer ce script.",
  );
}

mergeConfigTomlRedirects();
pushSupabaseConfig();
