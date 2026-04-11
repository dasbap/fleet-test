/**
 * Initialisation i18next (E-Samba) — français par défaut, JSON dans public/locales.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";

const LEGACY_LANG_KEY = "smartfleet:language";
const LANG_STORAGE_KEY = "esamba_lang";

/** Migre l’ancienne clé localStorage vers esamba_lang sans écraser une valeur déjà définie. */
function migrateLegacyLanguageKey(): void {
  if (typeof window === "undefined") return;
  try {
    const current = window.localStorage.getItem(LANG_STORAGE_KEY);
    const legacy = window.localStorage.getItem(LEGACY_LANG_KEY);
    if (!current && legacy && ["fr", "en", "ln"].includes(legacy)) {
      window.localStorage.setItem(LANG_STORAGE_KEY, legacy);
    }
  } catch {
    // Stockage indisponible (mode privé strict, etc.)
  }
}

migrateLegacyLanguageKey();

void i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: ["fr", "en", "ln"],
    fallbackLng: "fr",
    defaultNS: "common",
    ns: ["common", "fleet", "maintenance", "alerts"],
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: LANG_STORAGE_KEY,
    },
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: true,
    },
  });

export default i18n;
