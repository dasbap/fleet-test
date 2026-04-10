/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type SupportedLanguage = "fr" | "en";
export type Locale = SupportedLanguage;

interface I18nContextValue {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  locale: SupportedLanguage;
  setLocale: (language: SupportedLanguage) => void;
  t: (key: string) => string;
}

const I18N_STORAGE_KEY = "smartfleet:language";
const DEFAULT_LANGUAGE: SupportedLanguage = "fr";

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const getInitialLanguage = (): SupportedLanguage => {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const stored = window.localStorage.getItem(I18N_STORAGE_KEY);
  return stored === "en" ? "en" : "fr";
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(getInitialLanguage);

  const setLanguage = (nextLanguage: SupportedLanguage) => {
    setLanguageState(nextLanguage);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(I18N_STORAGE_KEY, nextLanguage);
    }
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      locale: language,
      setLocale: setLanguage,
      // Compatibilité minimale du contrat i18n : retour de clé en attendant les dictionnaires.
      t: (key: string) => key,
    }),
    [language]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n doit être utilisé à l'intérieur de I18nProvider.");
  }
  return context;
}
