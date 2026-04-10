import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { prerenderSeoPlugin } from "./scripts/vite-plugin-prerender-seo";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.VITE_SUPABASE_URL ?? "";
  const supabaseAnon = env.VITE_SUPABASE_ANON_KEY ?? "";

  return {
  // Build Capacitor : chemins relatifs pour le chargement depuis le WebView.
  base: mode === "capacitor" ? "./" : "/",
  build: {
    sourcemap: false,
    rollupOptions: {
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
          if (n.includes("@sentry")) return "vendor-observability";
          if (n.includes("firebase")) return "vendor-firebase";
          /* jspdf / xlsx : pas de manualChunk dédié — sinon Rollup regroupe souvent __vitePreload avec ces libs
           * et Vite émet un modulepreload énorme sur la première page. Chargement uniquement via import() dynamique. */
          if (n.includes("recharts")) return "vendor-charts";
          if (n.includes("date-fns")) return "vendor-date-fns";
          if (n.includes("@radix-ui")) return "vendor-radix";
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
  plugins: [
    react(),
    prerenderSeoPlugin(),
    VitePWA({
      disable: mode === "capacitor",
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg", "robots.txt", "offline.html"],
      manifest: {
        name: "E-Samba",
        short_name: "E-Samba",
        description: "Catalogue véhicules accessible même avec réseau instable",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#0f172a",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
        sourcemap: false,
        navigateFallback: "/offline.html",
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages",
              networkTimeoutSeconds: 4,
              cacheableResponse: { statuses: [200] },
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: ({ request }) =>
              ["style", "script", "worker"].includes(request.destination),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-assets",
              cacheableResponse: { statuses: [200] },
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "vehicle-images",
              cacheableResponse: { statuses: [200] },
              expiration: {
                maxEntries: 400,
                maxAgeSeconds: 60 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.pathname.includes("/rest/v1/vehicules") &&
              !/(?:^|&)id=eq\./.test(url.search),
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-vehicles-list",
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [200] },
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.pathname.includes("/rest/v1/vehicules") &&
              /(?:^|&)id=eq\./.test(url.search),
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-vehicle-detail",
              cacheableResponse: { statuses: [200] },
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 14 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 365 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  worker: {
    format: "es",
    plugins: () => [react()],
  },
  define: {
    "self.SUPABASE_URL": JSON.stringify(supabaseUrl),
    "self.SUPABASE_ANON_KEY": JSON.stringify(supabaseAnon),
  },
};
});
