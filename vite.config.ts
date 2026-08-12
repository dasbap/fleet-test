import { defineConfig, loadEnv } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "node:fs";
import { createRequire } from "node:module";
import { imagetools } from "vite-imagetools";
import { visualizer } from "rollup-plugin-visualizer";
import viteCompression from "vite-plugin-compression";
import { VitePWA } from "vite-plugin-pwa";
import { prerenderSeoPlugin } from "./scripts/vite-plugin-prerender-seo";

const nodeRequire = createRequire(import.meta.url);

function radixUiMainEntryPlugin(): Plugin {
  return {
    name: "radix-ui-main-entry",
    enforce: "pre",
    resolveId(source) {
      if (!source.startsWith("@radix-ui/")) return null;

      const sub = source.slice("@radix-ui/".length);

      if (!sub || sub.includes("/")) return null;

      try {
        const pkgPath = nodeRequire.resolve(`${source}/package.json`, {
          paths: [path.resolve(__dirname)],
        });

        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
          main?: string;
        };

        const rel =
          typeof pkg.main === "string" && pkg.main.length > 0
            ? pkg.main
            : "./dist/index.js";

        return path.resolve(path.dirname(pkgPath), rel.replace(/^\.\//, ""));
      } catch {
        return null;
      }
    },
  };
}

function hasAndroidFirebaseClient(expectedPackageName: string): boolean {
  const googleServicesPath = path.resolve(
    __dirname,
    "android/app/google-services.json"
  );

  try {
    const parsed = JSON.parse(fs.readFileSync(googleServicesPath, "utf8")) as {
      client?: Array<{
        client_info?: {
          android_client_info?: {
            package_name?: string;
          };
        };
      }>;
    };

    return (
      parsed.client?.some(
        (client) =>
          client?.client_info?.android_client_info?.package_name ===
          expectedPackageName
      ) === true
    );
  } catch {
    return false;
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const isE2eDevServer = process.env.ESAMBA_E2E === "1";

  const supabaseUrl = isE2eDevServer
    ? "https://placeholder-e2e.supabase.co"
    : env.VITE_SUPABASE_URL ?? "";

  const supabaseAnon = isE2eDevServer
    ? "placeholder-anon-key-e2e-only"
    : env.VITE_SUPABASE_ANON_KEY ?? "";

  const isProd = mode === "production" || mode === "capacitor";

  const isAnalyze = mode === "analyze" || process.env.ANALYZE === "true";

  const nativePushConfigured =
    env.VITE_NATIVE_PUSH_CONFIGURED === "true" ||
    (mode === "capacitor" && hasAndroidFirebaseClient("com.esamba.flotte"));

  const skipServerOpen = process.env.ESAMBA_MANAGED_OPEN === "1";

  return {
    base: mode === "capacitor" ? "./" : "/",

    build: {
      outDir: "dist",
      target: "es2020",
      chunkSizeWarningLimit: 520,
      sourcemap: isProd ? "hidden" : true,

      modulePreload: {
        resolveDependencies(_filename, deps) {
          const heavy = /vendor-charts|chunk-map|vendor-analytics|jspdf|xlsx/i;

          return deps.filter((d) => !heavy.test(d));
        },
      },

      rollupOptions: {
        plugins: isAnalyze
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
            const n = id.replace(/\\/g, "/");

            if (!id.includes("node_modules")) {
              return;
            }

            if (n.includes("/react-router")) {
              return "vendor-router";
            }

            if (
              n.match(/\/node_modules\/react\//) ||
              n.match(/\/node_modules\/react-dom\//) ||
              n.match(/\/node_modules\/scheduler\//)
            ) {
              return "vendor-react";
            }

            if (n.includes("@supabase")) {
              return "vendor-supabase";
            }

            if (n.includes("@tanstack")) {
              return "vendor-query";
            }

            if (n.includes("@sentry")) {
              return "vendor-observability";
            }

            if (n.includes("posthog-js")) {
              return "vendor-analytics";
            }

            if (n.includes("firebase")) {
              return "vendor-firebase";
            }

            if (n.includes("/i18next/") || n.includes("/react-i18next/")) {
              return "vendor-i18n";
            }

            if (n.includes("/recharts/") || n.includes("/victory-vendor/")) {
              return "vendor-charts";
            }

            if (n.includes("/zustand/")) {
              return "vendor-state";
            }

            if (
              n.includes("/leaflet/") ||
              n.includes("/react-leaflet/") ||
              n.includes("/maplibre-gl/")
            ) {
              return "chunk-map";
            }

            if (n.includes("date-fns")) {
              return "vendor-date-fns";
            }

            if (n.includes("qrcode")) {
              return "vendor-qrcode";
            }

            if (n.includes("@radix-ui")) {
              return "vendor-radix";
            }

            if (
              n.includes("realtime.worker") ||
              n.includes("realtime-bridge")
            ) {
              return "chunk-realtime";
            }
          },

          chunkFileNames: "assets/[name]-[hash].js",

          entryFileNames: "assets/[name]-[hash].js",

          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      },
    },

    server: {
      host: true,
      port: 8080,
      strictPort: false,
      open: !skipServerOpen,

      hmr: {
        overlay: false,
      },

      fs: isE2eDevServer
        ? {
            deny: ["**/android/**", "**/ios/**", "**/.cache/**"],
          }
        : undefined,

      watch: isE2eDevServer
        ? {
            ignored: ["**/android/**", "**/ios/**", "**/.cache/**"],
          }
        : undefined,

      warmup: {
        clientFiles: ["./src/main.tsx", "./src/App.tsx", "./src/i18n/index.ts"],
      },

      proxy:
        env.VITE_DEV_BFF_PROXY === "true"
          ? {
              "/billing": {
                target: "http://127.0.0.1:8787",
                changeOrigin: true,
              },

              "/webhooks": {
                target: "http://127.0.0.1:8787",
                changeOrigin: true,
              },

              "/health": {
                target: "http://127.0.0.1:8787",
                changeOrigin: true,
              },

              "/api": {
                target: "http://127.0.0.1:8787",
                changeOrigin: true,
              },
            }
          : undefined,
    },

    plugins: [
      react(),

      prerenderSeoPlugin(),

      imagetools({
        defaultDirectives: new URLSearchParams(),
      }),

      VitePWA({
        disable: mode === "capacitor",

        registerType: "autoUpdate",

        injectRegister: "auto",

        includeAssets: ["favicon.svg", "robots.txt", "offline.html"],

        injectManifest: {
          buildPlugins: {
            rollup: [radixUiMainEntryPlugin()],
          },
        },

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
              icons: [
                {
                  src: "/icons/icon-96.webp",
                  sizes: "96x96",
                  type: "image/webp",
                },
              ],
            },
            {
              name: "Ma flotte",
              short_name: "Flotte",
              url: "/dashboard/vehicles",
              icons: [
                {
                  src: "/icons/icon-96.webp",
                  sizes: "96x96",
                  type: "image/webp",
                },
              ],
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

          // Shell SPA : navigations → index.html
          // offline.html reste dans includeAssets pour les liens directs.
          navigateFallback: "/index.html",

          navigateFallbackDenylist: [
            /^\/_/,
            /^\/api(?:\/|$)/,
            /^\/functions(?:\/|$)/,
            /^\/blog(?:\/|$)/,
            /^\/guides(?:\/|$)/,
            /^\/fonctionnalites(?:\/|$)/,
            /^\/solutions(?:\/|$)/,
            /\/[^/?]+\.[^/]+$/,
          ],

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

            // Assets JS/CSS/worker — uniquement same-origin.
            {
              urlPattern: ({ request, sameOrigin }) =>
                sameOrigin &&
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

            // Images locales détectées par extension.
            {
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin &&
                /\.(?:png|jpg|jpeg|webp|avif|svg|gif)$/i.test(url.pathname),
              handler: "CacheFirst",
              options: {
                cacheName: "esamba-images-ext",
                cacheableResponse: { statuses: [200] },
                expiration: {
                  maxEntries: 150,
                  maxAgeSeconds: 30 * 24 * 60 * 60,
                },
              },
            },

            // Images locales chargées comme images.
            {
              urlPattern: ({ request, sameOrigin }) =>
                sameOrigin && request.destination === "image",
              handler: "CacheFirst",
              options: {
                cacheName: "esamba-images",
                cacheableResponse: { statuses: [200] },
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

      ...(isProd && mode !== "capacitor"
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

        "@esamba/offline-contracts": path.resolve(
          __dirname,
          "./packages/offline-contracts/src/index.ts"
        ),

        "@esamba/domain-validation": path.resolve(
          __dirname,
          "./packages/domain-validation/src/index.ts"
        ),

        "@esamba/domain-sync": path.resolve(
          __dirname,
          "./packages/domain-sync/src/index.ts"
        ),
      },

      dedupe: ["react", "react-dom", "react/jsx-runtime"],
    },

    optimizeDeps: {
      entries: isE2eDevServer
        ? ["index.html", "src/main.tsx", "src/App.tsx"]
        : undefined,

      include: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "@radix-ui/react-select",
        "i18next",
        "react-i18next",
        "i18next-http-backend",
        "i18next-browser-languagedetector",
      ],
    },

    worker: {
      format: "es",

      plugins: () => [react()],
    },

    define: {
      "self.SUPABASE_URL": JSON.stringify(supabaseUrl),

      "self.SUPABASE_ANON_KEY": JSON.stringify(supabaseAnon),

      "import.meta.env.VITE_NATIVE_PUSH_CONFIGURED": JSON.stringify(
        nativePushConfigured ? "true" : "false"
      ),
    },
  };
});
