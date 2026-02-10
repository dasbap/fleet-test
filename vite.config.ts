import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

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
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
