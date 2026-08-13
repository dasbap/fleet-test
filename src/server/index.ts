/**
 * Point d’entrée du BFF Node (développement : `npm run dev:api`).
 * Charger les variables : `tsx --env-file=.env.local …` (voir package.json).
 */
import { startBffServer } from "./http/localServer.js";

startBffServer();
