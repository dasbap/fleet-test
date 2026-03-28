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
