import { getFleetOverview } from "./esambaClient.js";

async function bootstrap() {
  // Implémentation minimale pour valider le build et l'exécution locale.
  const readyMessage =
    "Serveur MCP e-Samba initialisé (mode minimal). Configure ESAMBA_API_BASE_URL et ESAMBA_API_TOKEN pour activer les appels API.";

  try {
    if (process.env.ESAMBA_API_BASE_URL && process.env.ESAMBA_API_TOKEN) {
      await getFleetOverview().catch(() => undefined);
    }
    console.log(readyMessage);
  } catch (error) {
    console.error("Initialisation MCP e-Samba échouée:", error);
    process.exit(1);
  }
}

bootstrap();
