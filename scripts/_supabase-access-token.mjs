import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Résout le token Management API Supabase (env ou Credential Manager Windows).
 */
export function resolveSupabaseAccessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
    return process.env.SUPABASE_ACCESS_TOKEN.trim();
  }

  const psScript = join(__dirname, "_read-supabase-token.ps1");
  if (process.platform === "win32" && existsSync(psScript)) {
    try {
      const token = execSync(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${psScript}"`,
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      ).trim();
      if (token) return token;
    } catch {
      // message d'erreur ci-dessous
    }
  }

  throw new Error(
    "Token Supabase introuvable. Exécutez `npx supabase login` ou définissez SUPABASE_ACCESS_TOKEN.",
  );
}
