import "@testing-library/jest-dom";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Thème sombre forcé (ADR 0001) — aligner les tests avec le rendu production (jsdom uniquement)
if (typeof document !== "undefined") {
  document.documentElement.classList.add("dark");
}

if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
}

// Initialisation i18n minimale pour éviter les warnings react-i18next en test.
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    lng: "fr",
    fallbackLng: "fr",
    resources: {
      fr: { translation: {} },
    },
    interpolation: { escapeValue: false },
  });
}

const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Filtre ciblé des warnings Router v7 en environnement de test.
console.warn = (...args: unknown[]) => {
  const firstArg = typeof args[0] === "string" ? args[0] : "";
  const isReactRouterFutureFlagWarning =
    firstArg.includes("React Router Future Flag Warning") ||
    firstArg.includes("v7_startTransition") ||
    firstArg.includes("v7_relativeSplatPath");

  if (isReactRouterFutureFlagWarning) {
    return;
  }

  originalConsoleWarn(...args);
};

console.error = (...args: unknown[]) => {
  originalConsoleError(...args);
};
