/**
 * Agrège des Web Vitals RUM et calcule le P75 par route + type de réseau.
 *
 * Format attendu (JSON Lines):
 * {"name":"LCP","value":1800,"routePath":"/","connectionType":"4g"}
 *
 * Usage:
 *   node scripts/report-rum-web-vitals.mjs ./rum-web-vitals.jsonl
 */

import { readFile } from "node:fs/promises";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: node scripts/report-rum-web-vitals.mjs <fichier-jsonl>");
  process.exit(1);
}

function percentile75(values) {
  if (values.length === 0) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * 0.75) - 1;
  return sorted[Math.max(0, index)];
}

function metricKey(name) {
  if (name === "LCP" || name === "INP" || name === "CLS") return name;
  return null;
}

async function main() {
  const raw = await readFile(filePath, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const buckets = new Map();

  for (const line of lines) {
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }

    const metric = metricKey(row.name);
    if (!metric || typeof row.value !== "number") continue;

    const route = row.routePath || "/";
    const network = row.connectionType || "unknown";
    const key = `${route}::${network}`;
    if (!buckets.has(key)) {
      buckets.set(key, { route, network, LCP: [], INP: [], CLS: [] });
    }
    buckets.get(key)[metric].push(row.value);
  }

  console.log("P75 Web Vitals par route/réseau");
  for (const group of buckets.values()) {
    const p75Lcp = percentile75(group.LCP);
    const p75Inp = percentile75(group.INP);
    const p75Cls = percentile75(group.CLS);
    console.log(
      `- ${group.route} [${group.network}] -> LCP=${p75Lcp ?? "n/a"}ms, INP=${p75Inp ?? "n/a"}ms, CLS=${p75Cls ?? "n/a"}`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
