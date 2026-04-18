/**
 * Supprime le cache de pré-bundling Vite (souvent utile si « Failed to fetch dynamically imported module » en dev).
 */
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "node_modules", ".vite");
if (existsSync(dir)) {
  rmSync(dir, { recursive: true, force: true });
  console.log("Cache Vite supprimé : node_modules/.vite");
} else {
  console.log("Aucun dossier node_modules/.vite (rien à supprimer).");
}
