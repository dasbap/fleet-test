import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { imagetools } from "vite-imagetools";
import { visualizer } from "rollup-plugin-visualizer";
import viteCompression from "vite-plugin-compression";
import { VitePWA } from "vite-plugin-pwa";
import { prerenderSeoPlugin } from "./scripts/vite-plugin-prerender-seo";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.VITE_SUPABASE_URL ?? "";
  const supabaseAnon = env.VITE_SUPABASE_ANON_KEY ?? "";
  const isProd = mode === "production" || mode === "capacitor";
  const isAnalyze = mode === "analyze" || process.env.ANALYZE === "true";

  return {
  // Build Capacitor : chemins relatifs pour le chargement depuis le WebView.
  base: mode === "capacitor" ? "./" : "/",
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 400,
    sourcemap: isProd ? "hidden" : true,
    rollupOptions: {
      plugins:
        isAnalyze
          ? [
              visualizer({
                filename: path.resolve(__dirname, "dist/stats.html"),
                template: "treemap",
                gzipSize: true,
                brotliSize: true,
              }),
            ]
          : [],
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
          if (n.includes("posthog-js")) return "vendor-analytics";
          if (n.includes("firebase")) return "vendor-firebase";
          if (n.includes("/i18next/") || n.includes("/react-i18next/")) return "vendor-i18n";
          if (n.includes("/zustand/")) return "vendor-state";
          if (n.includes("mapbox-gl")) return "vendor-maps";
          if (
            n.includes("/leaflet/") ||
            n.includes("/react-leaflet/") ||
            n.includes("/maplibre-gl/")
          ) {
            return "chunk-map";
          }
          /* jspdf / xlsx : pas de manualChunk dédié — sinon Rollup regroupe souvent __vitePreload avec ces libs
           * et Vite émet un modulepreload énorme sur la première page. Chargement uniquement via import() dynamique. */
          // Important: ne pas forcer les chunks "reports/pdf" ici.
          // Sinon Vite peut y placer des helpers runtime partagés (__vitePreload),
          // ce qui les fait remonter en modulepreload dans index.html.
          // On laisse Rollup décider pour garder ces dépendances strictement lazy.
          if (n.includes("date-fns")) return "vendor-date-fns";
          if (n.includes("qrcode")) return "vendor-qrcode";
          if (n.includes("@radix-ui")) return "vendor-radix";
          if (n.includes("realtime.worker") || n.includes("realtime-bridge")) return "chunk-realtime";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
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
    // Pas de directives globales : sinon chaque .jpg/.webp est transformé et servi via
    // /@imagetools/… (souvent instable en dev avec le middleware). Les imports sans « ? »
    // restent des assets Vite classiques ; utiliser ?w=… ou ?format=… si besoin d’imagetools.
    imagetools({
      defaultDirectives: new URLSearchParams(),
    }),
    VitePWA({
      disable: mode === "capacitor",
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg", "robots.txt", "offline.html"],
      manifest: {
        name: "E-Samba — Gestion de flotte",
        short_name: "E-Samba",
        description:
          "Gestion intelligente de flotte · Afrique centrale — utilisable avec réseau instable",
        lang: "fr",
        start_url: "/",
        display: "standalone",
        orientation: "portrait-primary",
        background_color: "#0f172a",
        theme_color: "#10b981",
        icons: [
          {
            src: "/icons/icon-192.webp",
            sizes: "192x192",
            type: "image/webp",
          },
          {
            src: "/icons/icon-512.webp",
            sizes: "512x512",
            type: "image/webp",
          },
          {
            src: "/icons/icon-512.webp",
            sizes: "512x512",
            type: "image/webp",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Alertes",
            short_name: "Alertes",
            url: "/dashboard/alerts",
            icons: [{ src: "/icons/icon-96.webp", sizes: "96x96", type: "image/webp" }],
          },
          {
            name: "Ma flotte",
            short_name: "Flotte",
            url: "/dashboard/vehicles",
            icons: [{ src: "/icons/icon-96.webp", sizes: "96x96", type: "image/webp" }],
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: [
          "**/*.{js,css,html,ico,svg,woff2,webp}",
          "icons/*.webp",
        ],
        globIgnores: ["**/node_modules/**", "**/.git/**"],
        sourcemap: false,
        // Shell SPA : navigations → index.html (offline.html reste dans includeAssets pour liens directs)
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
        runtimeCaching: [
          // Polices Google — très stables
          {
            urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "esamba-google-fonts",
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 365 * 24 * 60 * 60,
              },
            },
          },
          // Auth Supabase — jamais de cache des jetons
          {
            urlPattern: ({ url }) =>
              url.hostname.includes("supabase.co") &&
              url.pathname.startsWith("/auth/"),
            handler: "NetworkOnly",
          },
          // Liste véhicules — réseau d’abord, cache 24h (2G/3G)
          {
            urlPattern: ({ url }) =>
              url.hostname.includes("supabase.co") &&
              url.pathname.includes("/rest/v1/vehicules") &&
              !/(?:^|&)id=eq\./.test(url.search),
            handler: "NetworkFirst",
            options: {
              cacheName: "esamba-vehicules-liste",
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60,
              },
            },
          },
          // Détail véhicule (id=eq.) — cache plus long
          {
            urlPattern: ({ url }) =>
              url.hostname.includes("supabase.co") &&
              url.pathname.includes("/rest/v1/vehicules") &&
              /(?:^|&)id=eq\./.test(url.search),
            handler: "CacheFirst",
            options: {
              cacheName: "esamba-vehicule-detail",
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 14 * 24 * 60 * 60,
              },
            },
          },
          // Alertes — données volatiles
          {
            urlPattern: ({ url }) =>
              url.hostname.includes("supabase.co") &&
              url.pathname.startsWith("/rest/v1/alertes_automatiques"),
            handler: "NetworkFirst",
            options: {
              cacheName: "esamba-alertes",
              networkTimeoutSeconds: 3,
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 60,
              },
            },
          },
          // Maintenance — cache intermédiaire
          {
            urlPattern: ({ url }) =>
              url.hostname.includes("supabase.co") &&
              url.pathname.startsWith("/rest/v1/travaux_maintenance"),
            handler: "NetworkFirst",
            options: {
              cacheName: "esamba-maintenance",
              networkTimeoutSeconds: 4,
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 12 * 60 * 60,
              },
            },
          },
          // Stockage Supabase (fichiers)
          {
            urlPattern: ({ url }) =>
              url.hostname.includes("supabase.co") &&
              url.pathname.startsWith("/storage/v1/"),
            handler: "CacheFirst",
            options: {
              cacheName: "esamba-storage",
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
            },
          },
          // Assets JS/CSS/worker
          {
            urlPattern: ({ request }) =>
              ["style", "script", "worker"].includes(request.destination),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "esamba-static-assets",
              cacheableResponse: { statuses: [200] },
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
          // Images par extension (y compris fetch sans destination "image")
          {
            urlPattern: /\.(?:png|jpg|jpeg|webp|avif|svg|gif)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "esamba-images-ext",
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "esamba-images",
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 400,
                maxAgeSeconds: 60 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
        type: "module",
        navigateFallback: "/index.html",
        suppressWarnings: true,
      },
    }),
    ...(isProd
      ? [
          viteCompression({
            algorithm: "brotliCompress",
            ext: ".br",
            threshold: 1024,
          }),
          viteCompression({
            algorithm: "gzip",
            ext: ".gz",
            threshold: 1024,
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Une seule instance de React pour le bundler (évite « useState » sur dispatcher null).
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
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
