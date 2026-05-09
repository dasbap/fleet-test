import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

/** Config pour les tests d'intégration (tests/integration/*). Nécessite VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY. */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    testTimeout: 15000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
