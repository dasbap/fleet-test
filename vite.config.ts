import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { prerenderSeoPlugin } from "./scripts/vite-plugin-prerender-seo";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    sourcemap: false,
    // manualChunks : à envisager si le bundle est lourd (React, React Router, Recharts).
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
});
