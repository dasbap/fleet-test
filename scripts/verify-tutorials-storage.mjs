#!/usr/bin/env node
/**
 * Vérifie la présence des assets tutoriels (HEAD) dans le bucket Supabase public.
 * Usage : node scripts/verify-tutorials-storage.mjs
 * Requiert VITE_SUPABASE_URL dans .env ou l'environnement.
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

const assets = [];
for (const seq of ids) {
  assets.push(`${storageBase}/videos/tuto-${seq}.mp4`);
  assets.push(`${storageBase}/thumbs/tuto-${seq}.jpg`);
}

let ok = 0;
let fail = 0;

for (const url of assets) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (res.ok) {
      console.log(`OK  ${url}`);
      ok += 1;
    } else {
      console.log(`MISS ${res.status} ${url}`);
      fail += 1;
    }
  } catch (err) {
    console.log(`ERR  ${url} — ${err instanceof Error ? err.message : err}`);
    fail += 1;
  }
}

console.log(`\nRésumé : ${ok} OK, ${fail} manquants sur ${assets.length}`);
process.exit(fail > 0 ? 1 : 0);
