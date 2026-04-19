/**
 * Initialisation i18next (E-Samba) — français par défaut, JSON dans public/locales.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";

const LEGACY_LANG_KEY = "smartfleet:language";
const LANG_STORAGE_KEY = "esamba_lang";
export const SUPPORTED_LANGS = ["fr", "en", "ln", "ar", "wo", "sw", "es"] as const;

/** Migre l’ancienne clé localStorage vers esamba_lang sans écraser une valeur déjà définie. */
function migrateLegacyLanguageKey(): void {
  if (typeof window === "undefined") return;
  try {
    const current = window.localStorage.getItem(LANG_STORAGE_KEY);
    const legacy = window.localStorage.getItem(LEGACY_LANG_KEY);
    if (!current && SUPPORTED_LANGS.includes(legacy as (typeof SUPPORTED_LANGS)[number])) {
      window.localStorage.setItem(LANG_STORAGE_KEY, legacy);
    }
  } catch {
    // Stockage indisponible (mode privé strict, etc.)
  }
}

migrateLegacyLanguageKey();

/** Promise résolue quand i18next a fini de charger (évite écran vide si Suspense i18n ne se résout pas). */
export const i18nReady: Promise<typeof i18n> = i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: [...SUPPORTED_LANGS],
    fallbackLng: "fr",
    defaultNS: "common",
    ns: ["common", "fleet", "maintenance", "alerts", "help"],
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
      // false : évite un blocage Suspense (écran noir) si les JSON locales échouent ou dans certains WebView.
      useSuspense: false,
    },
  })
  .then(() => i18n);

export default i18n;
