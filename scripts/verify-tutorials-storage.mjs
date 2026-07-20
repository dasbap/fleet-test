#!/usr/bin/env node
/**
 * Vérifie les assets tutoriels dans le bucket Supabase public.
 * - Requis : thumbs/tuto-NN.svg (exit 1 si manquant)
 * - Optionnel : videos/tuto-NN.mp4 et thumbs/tuto-NN.jpg (avertissement)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const paths = [".env.local", ".env"];
  for (const p of paths) {
    const full = resolve(process.cwd(), p);
    if (!existsSync(full)) continue;
    const raw = readFileSync(full, "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

const base = process.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
if (!base) {
  console.error("VITE_SUPABASE_URL manquant.");
  process.exit(1);
}

const storageBase = `${base}/storage/v1/object/public/tutorials`;
const ids = Array.from({ length: 10 }, (_, i) => String(i + 1).padStart(2, "0"));

async function checkUrl(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (res.ok) return { ok: true, status: res.status };
    const getRes = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
    });
    return { ok: getRes.ok || getRes.status === 206, status: getRes.status };
  } catch (err) {
    return { ok: false, status: err instanceof Error ? err.message : "ERR" };
  }
}

const required = [];
const optional = [];

for (const seq of ids) {
  required.push({ label: `thumbs/tuto-${seq}.svg`, url: `${storageBase}/thumbs/tuto-${seq}.svg` });
  optional.push({ label: `videos/tuto-${seq}.mp4`, url: `${storageBase}/videos/tuto-${seq}.mp4` });
  optional.push({ label: `thumbs/tuto-${seq}.jpg`, url: `${storageBase}/thumbs/tuto-${seq}.jpg` });
}

let requiredOk = 0;
let requiredFail = 0;
let optionalOk = 0;
let optionalMiss = 0;

console.log("=== Vignettes SVG (requis) ===\n");
for (const asset of required) {
  const { ok, status } = await checkUrl(asset.url);
  if (ok) {
    console.log(`OK   ${asset.label}`);
    requiredOk += 1;
  } else {
    console.log(`MISS ${asset.label} (${status})`);
    requiredFail += 1;
  }
}

console.log("\n=== Vidéos MP4 et JPG legacy (optionnel) ===\n");
for (const asset of optional) {
  const { ok, status } = await checkUrl(asset.url);
  if (ok) {
    console.log(`OK   ${asset.label}`);
    optionalOk += 1;
  } else {
    console.log(`WARN ${asset.label} (${status})`);
    optionalMiss += 1;
  }
}

console.log(
  `\nRésumé : ${requiredOk}/10 SVG OK — ${optionalOk}/${optional.length} optionnels OK (${optionalMiss} absents, non bloquant)`,
);

if (requiredFail > 0) {
  console.error("\nÉchec : exécutez npm run upload:tutorial-thumbs pour publier les vignettes SVG.");
  process.exit(1);
}

process.exit(0);
