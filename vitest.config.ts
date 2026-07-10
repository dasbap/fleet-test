import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import type { Plugin } from "vite";

/** Racine du dépôt : `process.cwd()` suffit en `npm test` ; repli sur le dossier du fichier de config. */
const repoRoot = (() => {
  try {
    const fromMeta = path.dirname(fileURLToPath(import.meta.url));
    if (fs.existsSync(path.join(fromMeta, "package.json"))) return fromMeta;
  } catch {
    /* import.meta.url indisponible : ignorer */
  }
  return process.cwd();
})();
const runSupabaseIntegration = process.env.RUN_SUPABASE_INTEGRATION === "1";

/**
 * Plusieurs paquets @radix-ui déclarent `module` / `exports.import` vers `dist/index.mjs`
 * alors que seul `dist/index.js` est présent dans node_modules (artefact npm / Windows).
 * Vitest/Vite échoue alors sur « Cannot find module … index.mjs ».
 */
function radixPreferJsWhenMjsMissing(): Plugin {
  return {
    name: "radix-prefer-js-when-mjs-missing",
    enforce: "pre",
    resolveId(source) {
      const bareRadix = /^@radix-ui\/react-[-\w]+$/;
      if (bareRadix.test(source)) {
        const js = path.join(
          repoRoot,
          "node_modules",
          source,
          "dist",
          "index.js"
        );
        try {
          if (fs.existsSync(js)) return js;
        } catch {
          /* ignore */
        }
      }
      if (!source.includes("@radix-ui") || !source.endsWith("index.mjs")) {
        return null;
      }
      const asJs = source.replace(/\.mjs$/i, ".js");
      try {
        if (fs.existsSync(asJs)) return asJs;
      } catch {
        /* chemin inaccessible : laisser la résolution par défaut */
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [radixPreferJsWhenMjsMissing(), react()],
  // Force React à charger son build dev (act() disponible) même quand Vite
  // injecterait process.env.NODE_ENV="production" par défaut.
  define: {
    "process.env.NODE_ENV": JSON.stringify("test"),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      ...configDefaults.exclude,
      ...(runSupabaseIntegration ? [] : ["src/test/integration/**/*"]),
    ],
    /**
     * Valeurs factices pour `import.meta.env` : le client Supabase valide la présence
     * des clés au chargement des modules qui importent `@/integrations/supabase/client`.
     * Les tests unitaires ne doivent pas dépendre d’un `.env.local` local ou CI.
     */
    env: {
      VITE_SUPABASE_URL: "http://127.0.0.1:54321",
      VITE_SUPABASE_ANON_KEY: "vitest-placeholder-anon-key",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(repoRoot, "./src"),
      // Évite l’échec de résolution si node_modules incomplet ou analyse transitive vers camera.service
      "@capacitor/camera": path.resolve(
        repoRoot,
        "./src/test/mocks/capacitor-camera.ts"
      ),
    },
  },
});
