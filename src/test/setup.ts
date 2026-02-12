import "@testing-library/jest-dom";

// Thème sombre forcé (ADR 0001) — aligner les tests avec le rendu production
document.documentElement.classList.add("dark");

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
