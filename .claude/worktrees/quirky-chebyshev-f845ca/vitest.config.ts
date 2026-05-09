import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
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
      "@": path.resolve(__dirname, "./src"),
      // Évite l’échec de résolution si node_modules incomplet ou analyse transitive vers camera.service
      "@capacitor/camera": path.resolve(
        __dirname,
        "./src/test/mocks/capacitor-camera.ts"
      ),
    },
  },
});
