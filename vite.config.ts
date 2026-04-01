import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { prerenderSeoPlugin } from "./scripts/vite-plugin-prerender-seo";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Build Capacitor : chemins relatifs pour le chargement depuis le WebView.
  base: mode === "capacitor" ? "./" : "/",
  build: {
    sourcemap: false,
    rollupOptions: {
      external: ["firebase/app", "firebase/messaging"],
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          const n = id.replace(/\\/g, "/");
          if (
            n.includes("/react-dom/") ||
            n.includes("/react-router") ||
            (n.includes("/react/") && !n.includes("react-query"))
          ) {
            return "vendor-react";
          }
          if (n.includes("@supabase")) return "vendor-supabase";
          if (n.includes("@tanstack")) return "vendor-query";
          if (n.includes("recharts")) return "vendor-charts";
        },
      },
    },
  },
  server: {
    host: "localhost",
    port: 8080,
    strictPort: false,
    open: false,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), prerenderSeoPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
