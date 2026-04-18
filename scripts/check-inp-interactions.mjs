/**
 * Audit INP orienté interaction utilisateur via Playwright.
 * Ne remplace pas le RUM, mais ajoute un garde-fou CI reproductible.
 *
 * Prérequis: un serveur est déjà disponible (ex: vite preview sur 4173).
 */

import { chromium } from "playwright";

const BASE_URL = process.env.PERF_BASE_URL || "http://127.0.0.1:4173";
const MAX_INP_MS = Number(process.env.INP_MAX_MS || "200");

async function readInteractionToNextPaint(page) {
  return page.evaluate(async () => {
    const unsupported = { value: null, reason: "event-timing-non-disponible" };
    if (!("PerformanceObserver" in window)) return unsupported;

    const entries = [];
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        entries.push(entry.duration);
      }
    });

    try {
      observer.observe({ type: "event", buffered: true, durationThreshold: 16 });
    } catch {
      return unsupported;
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));
    observer.disconnect();

    if (entries.length === 0) {
      return { value: 0, reason: "aucune-interaction-significative-capturee" };
    }

    // Approximation CI: proche du percentile utilisé pour INP.
    const sorted = entries.slice().sort((a, b) => a - b);
    const index = Math.max(0, Math.floor(sorted.length * 0.98) - 1);
    return { value: Math.round(sorted[index]), reason: "ok" };
  });
}

async function runScenario(page, route, interactions) {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle" });
  for (const step of interactions) {
    if (step.type === "click") {
      const locator = page.locator(step.selector).first();
      if ((await locator.count()) > 0) await locator.click();
    }
    if (step.type === "fill") {
      const locator = page.locator(step.selector).first();
      if ((await locator.count()) > 0) await locator.fill(step.value ?? "");
    }
    if (step.type === "press") {
      await page.keyboard.press(step.key);
    }
    await page.waitForTimeout(step.waitMs ?? 200);
  }

  const result = await readInteractionToNextPaint(page);
  return {
    route,
    inpMs: result.value,
    reason: result.reason,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  const scenarios = [
    {
      route: "/",
      interactions: [
        { type: "press", key: "PageDown", waitMs: 250 },
        { type: "press", key: "PageUp", waitMs: 250 },
      ],
    },
    {
      route: "/login",
      interactions: [
        { type: "press", key: "Tab", waitMs: 100 },
        { type: "press", key: "Tab", waitMs: 100 },
      ],
    },
  ];

  const results = [];
  try {
    for (const scenario of scenarios) {
      results.push(await runScenario(page, scenario.route, scenario.interactions));
    }
  } finally {
    await browser.close();
  }

  let hasFailure = false;
  for (const result of results) {
    const value = result.inpMs ?? 0;
    const ok = value <= MAX_INP_MS;
    const status = ok ? "OK" : "FAIL";
    console.log(`[${status}] ${result.route} -> INP~ ${value} ms (${result.reason})`);
    if (!ok) hasFailure = true;
  }

  if (hasFailure) {
    console.error(`Seuil INP dépassé (>${MAX_INP_MS} ms)`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
