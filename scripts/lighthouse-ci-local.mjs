/**
 * Reproduction locale de l’étape Lighthouse CI (build + preview + lhci autorun).
 * Variables VITE_* : si absentes, mêmes placeholders que .github/workflows/lighthouse-ci.yml
 *
 * Durée : long (build + une passe Lighthouse par URL × numberOfRuns dans lighthouserc, ex. 3 URLs).
 * Commande npm : npm run lighthouse:ci:local
 *
 * Politique seuils (lighthouserc.json, JSON sans commentaires) :
 * - Gate bloquant : CLS error, médiane ≤ 0,1.
 * - Reste en warn (médiane sauf mention) : perf ≥ 0,65, a11y ≥ 0,85, LCP/INP/FCP/SI/TBT,
 *   audits image/blocage/font/preconnect avec maxLength tolérant, unused JS/CSS avec plafonds bytes.
 * - INP : warn uniquement ; lab souvent peu représentatif sans interaction réelle.
 * Perf / bundle : corréler avec npm run report:chunks et check:bundle-budget.
 * Variantes : npm run lighthouse:ci:strict (gates perf+LCP), npm run lighthouse:ci:seo (/, SEO seul).
 * Détail : .github/lighthouse/README.md
 */
import { spawn } from "node:child_process";

const PLACEHOLDER = {
  VITE_SUPABASE_URL: "https://placeholder-build.supabase.co",
  VITE_SUPABASE_ANON_KEY: "placeholder-anon-key-ci-build-only",
};

for (const [key, value] of Object.entries(PLACEHOLDER)) {
  if (!process.env[key]) process.env[key] = value;
}

const PREVIEW_URL = "http://127.0.0.1:4173/";
const WAIT_MS = 60_000;
const INTERVAL_MS = 250;

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: true,
      env: process.env,
      ...options,
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} a échoué (code ${code})`));
    });
  });
}

async function waitForServer() {
  const deadline = Date.now() + WAIT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(PREVIEW_URL, { redirect: "manual" });
      if (res.ok || res.status === 304 || (res.status >= 300 && res.status < 400)) return;
    } catch {
      /* serveur pas prêt */
    }
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
  throw new Error(`Timeout : ${PREVIEW_URL} injoignable après ${WAIT_MS} ms`);
}

let previewChild = null;

function killPreview() {
  if (previewChild && !previewChild.killed) {
    try {
      previewChild.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
}

process.on("SIGINT", () => {
  killPreview();
  process.exit(130);
});

await run("npm", ["run", "build"]);

previewChild = spawn(
  "npx",
  ["vite", "preview", "--host", "127.0.0.1", "--port", "4173", "--strictPort"],
  {
    stdio: "inherit",
    shell: true,
    env: process.env,
  },
);

previewChild.on("error", (err) => {
  console.error(err);
  process.exit(1);
});

try {
  await waitForServer();
  await run("npx", ["lhci", "autorun", "--config=.github/lighthouse/lighthouserc.json"]);
} finally {
  killPreview();
}
