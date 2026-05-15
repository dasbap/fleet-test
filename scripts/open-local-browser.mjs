#!/usr/bin/env node
/**
 * Ouvre le navigateur sur la première instance Vite locale qui répond (sans lancer le serveur).
 *
 * Usage : `npm run open:local` (Vite doit déjà tourner : `npm run dev`)
 * Options : `--no-open` — n’ouvre pas le navigateur (attente HTTP + URL affichée, utile CI / SSH)
 * Variables : LOCAL_DEV_PORTS, LOCAL_OPEN_WAIT_MS (défaut 90000), SMOKE_STRICT=1
 */
import {
  getCandidatePorts,
  getSmokePaths,
  openLocalhostLanding,
  waitForViteHttp,
} from "./lib/local-dev-open.mjs";

const timeoutMs = parseInt(process.env.LOCAL_OPEN_WAIT_MS ?? "90000", 10);
const noOpen = process.argv.includes("--no-open");

async function main() {
  const ports = getCandidatePorts();
  const paths = getSmokePaths();
  console.log(
    "Recherche d’un serveur Vite sur les ports :",
    ports.join(", "),
    `(timeout ${timeoutMs / 1000}s, chemins : ${paths.join(", ")})`
  );

  const port = await waitForViteHttp({ ports, paths, timeoutMs });
  if (port === null) {
    console.error(
      "Aucun serveur prêt. Lancez `npm run dev` ou `npm run dev:local`, puis réessayez `npm run open:local`."
    );
    process.exit(1);
  }

  const url = `http://localhost:${port}/`;
  if (noOpen) {
    console.log(`Serveur prêt (navigateur non ouvert) : ${url}`);
  } else {
    openLocalhostLanding(port);
    console.log(`Navigateur ouvert sur ${url}`);
  }
}

void main();
