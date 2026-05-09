import i18n from "@/i18n";

const HELP_NAMESPACE = "help";

export async function loadHelpNamespace(): Promise<void> {
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;

  if (!currentLanguage) {
    await i18n.loadNamespaces(HELP_NAMESPACE);
    return;
  }

  const baseLang = currentLanguage.split("-")[0];

  if (i18n.hasResourceBundle(baseLang, HELP_NAMESPACE)) {
    return;
  }

  try {
    await i18n.loadNamespaces(HELP_NAMESPACE);
  } catch (error) {
    // Les erreurs réseau/chargement sont loguées côté console pour le debug,
    // mais remontées comme Error standard pour que l'UI affiche un message adapté.
    console.error("Erreur lors du chargement du namespace i18n 'help':", error);
    throw error instanceof Error ? error : new Error("Failed to load i18n namespace 'help'");
  }
}

