#!/usr/bin/env node
/**
 * Active la protection mots de passe divulgués (HIBP) et MFA TOTP sur le projet lié.
 * Prérequis : `npx supabase login` (token dans Credential Manager Windows / env SUPABASE_ACCESS_TOKEN).
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvWithLocalFallback } from "./_env-loader.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const PROJECT_REF = "zqxjvmejoktwlcqshnwi";

loadEnvWithLocalFallback(root);

function resolveAccessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
    return process.env.SUPABASE_ACCESS_TOKEN.trim();
  }
  const psScript = join(__dirname, "_read-supabase-token.ps1");
  if (process.platform === "win32" && existsSync(psScript)) {
    try {
      const token = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psScript}"`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
      if (token) return token;
    } catch {
      // fallback message below
    }
  }
  throw new Error(
    "Token Supabase introuvable. Exécutez `npx supabase login` ou définissez SUPABASE_ACCESS_TOKEN.",
  );
}

async function patchAuthConfig(token) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      password_hibp_enabled: true,
      mfa_totp_enroll_enabled: true,
      mfa_totp_verify_enabled: true,
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`PATCH config/auth ${res.status}: ${body.slice(0, 500)}`);
  }
  return body ? JSON.parse(body) : {};
}

function pushLocalConfig() {
  execSync("npx supabase config push --project-ref " + PROJECT_REF + " --yes", {
    cwd: root,
    stdio: "inherit",
  });
}

async function main() {
  console.log("[auth-security] Push config.toml (MFA TOTP)…");
  pushLocalConfig();

  console.log("[auth-security] Activation HIBP via Management API…");
  const token = resolveAccessToken();
  const config = await patchAuthConfig(token);

  const hibp = config.password_hibp_enabled ?? true;
  const totpEnroll = config.mfa_totp_enroll_enabled ?? true;
  const totpVerify = config.mfa_totp_verify_enabled ?? true;

  console.log("[auth-security] OK");
  console.log(`  password_hibp_enabled: ${hibp}`);
  console.log(`  mfa_totp_enroll_enabled: ${totpEnroll}`);
  console.log(`  mfa_totp_verify_enabled: ${totpVerify}`);
}

main().catch((err) => {
  console.error("[auth-security] Échec:", err.message);
  process.exit(1);
});
