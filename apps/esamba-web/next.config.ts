import type { NextConfig } from "next";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(projectRoot, "../..");

function loadRootSupabasePublicEnv() {
  const envPath = path.join(workspaceRoot, ".env.local");
  if (!existsSync(envPath)) return;

  const env = new Map<string, string>();
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env.set(key, value);
  }

  process.env.NEXT_PUBLIC_SUPABASE_URL ??= env.get("VITE_SUPABASE_URL");
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= env.get("VITE_SUPABASE_ANON_KEY");
}

loadRootSupabasePublicEnv();

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
