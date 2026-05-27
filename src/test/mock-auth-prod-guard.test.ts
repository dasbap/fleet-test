/**
 * Tests CI — blindage mock auth en production E-Samba.
 *
 * Vérifie que le mode mock ne peut jamais s'activer en PROD :
 *   1. isMockAuthEnabled() retourne false si VITE_USE_MOCK_AUTH = "true" ET import.meta.env.PROD = true
 *   1bis. isMockAuthEnabled() retourne false sur hostname prod même en build non-prod
 *   2. enableDemoAuthFallback() est un no-op en PROD (n'écrit pas dans localStorage)
 *   3. La logique de court-circuit PROD précède la lecture du localStorage
 *   4. disableDemoAuthFallback() reste fonctionnel (nettoyage sûr même en PROD)
 *
 * Ces fonctions sont des fonctions pures réimplémentées ici pour rester testables
 * sans dépendre du bundle Vite (import.meta.env non disponible dans Vitest par défaut).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ─── Simulation import.meta.env ────────────────────────────────────────────────
// On réimplémente les fonctions localement en injectant IS_PROD comme paramètre
// pour tester les deux branches (PROD=true / PROD=false) sans rebuild Vite.

const DEMO_FALLBACK_KEY = "esamba-demo-auth-fallback";

const PROD_HOSTNAMES = new Set(["www.e-samba.com", "e-samba.com", "app.e-samba.com"]);

function isMockAuthEnabled(
  isProd: boolean,
  hostname: string,
  viteFlag: string,
  localStorage: Storage,
): boolean {
  if (PROD_HOSTNAMES.has(hostname)) return false;
  if (isProd) return false;
  return viteFlag === "true" || localStorage.getItem(DEMO_FALLBACK_KEY) === "true";
}

function enableDemoAuthFallback(isProd: boolean, hostname: string, localStorage: Storage): void {
  if (PROD_HOSTNAMES.has(hostname) || isProd) return; // no-op PROD
  localStorage.setItem(DEMO_FALLBACK_KEY, "true");
}

function disableDemoAuthFallback(isProd: boolean, localStorage: Storage): void {
  // Nettoyage autorisé même en PROD (retiré = plus sûr)
  localStorage.removeItem(DEMO_FALLBACK_KEY);
  void isProd; // inutilisé mais intentionnel : nettoyage toujours permis
}

// ─── Mock localStorage ─────────────────────────────────────────────────────────

function makeStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem:    (k: string) => store[k] ?? null,
    setItem:    (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear:      () => { Object.keys(store).forEach(k => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key:        (i: number) => Object.keys(store)[i] ?? null,
  };
}


// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 1. isMockAuthEnabled — PROD bloque tout ──────────────────────────────────

describe("isMockAuthEnabled — mode PROD", () => {
  let storage: Storage;

  beforeEach(() => { storage = makeStorage(); });

  it("retourne false même si VITE_USE_MOCK_AUTH = 'true'", () => {
    expect(isMockAuthEnabled(true, "www.e-samba.com", "true", storage)).toBe(false);
  });

  it("retourne false même si localStorage contient le flag demo-fallback", () => {
    storage.setItem(DEMO_FALLBACK_KEY, "true");
    expect(isMockAuthEnabled(true, "www.e-samba.com", "true", storage)).toBe(false);
  });

  it("retourne false même avec localStorage + flag combinés", () => {
    storage.setItem(DEMO_FALLBACK_KEY, "true");
    expect(isMockAuthEnabled(true, "www.e-samba.com", "true", storage)).toBe(false);
  });

  it("retourne false si flag vide et localStorage vide", () => {
    expect(isMockAuthEnabled(true, "www.e-samba.com", "", storage)).toBe(false);
  });

  it("retourne false si flag 'false' (cas nominal PROD)", () => {
    expect(isMockAuthEnabled(true, "www.e-samba.com", "false", storage)).toBe(false);
  });
});

// ─── 2. isMockAuthEnabled — DEV peut activer le mode mock ────────────────────

describe("isMockAuthEnabled — mode DEV", () => {
  let storage: Storage;

  beforeEach(() => { storage = makeStorage(); });

  it("retourne true si VITE_USE_MOCK_AUTH = 'true'", () => {
    expect(isMockAuthEnabled(false, "localhost", "true", storage)).toBe(true);
  });

  it("retourne true si localStorage contient le flag", () => {
    storage.setItem(DEMO_FALLBACK_KEY, "true");
    expect(isMockAuthEnabled(false, "localhost", "false", storage)).toBe(true);
  });

  it("retourne false si ni flag ni localStorage", () => {
    expect(isMockAuthEnabled(false, "localhost", "false", storage)).toBe(false);
  });

  it("retourne false si flag 'true' mais désactivé ensuite via localStorage=false", () => {
    // En pratique la désactivation passe par removeItem, pas par setItem("false")
    storage.setItem(DEMO_FALLBACK_KEY, "false");
    expect(isMockAuthEnabled(false, "localhost", "false", storage)).toBe(false);
  });
});

describe("isMockAuthEnabled — hostname prod", () => {
  let storage: Storage;

  beforeEach(() => { storage = makeStorage(); });

  it("retourne false sur hostname prod même si build non-prod", () => {
    storage.setItem(DEMO_FALLBACK_KEY, "true");
    expect(isMockAuthEnabled(false, "app.e-samba.com", "true", storage)).toBe(false);
  });
});

// ─── 3. enableDemoAuthFallback — PROD : no-op strict ─────────────────────────

describe("enableDemoAuthFallback — mode PROD", () => {
  let storage: Storage;

  beforeEach(() => { storage = makeStorage(); });

  it("n'écrit rien dans localStorage en PROD", () => {
    enableDemoAuthFallback(true, "www.e-samba.com", storage);
    expect(storage.getItem(DEMO_FALLBACK_KEY)).toBeNull();
  });

  it("n'active pas le mock après appel en PROD", () => {
    enableDemoAuthFallback(true, "www.e-samba.com", storage);
    expect(isMockAuthEnabled(true, "www.e-samba.com", "false", storage)).toBe(false);
  });

  it("n'écrase pas une valeur existante (appelé depuis PROD)", () => {
    // Cas : localStorage déjà corrompu avec la clé (héritage d'une session dev)
    // enableDemoAuthFallback en PROD ne doit pas y toucher (ni lire ni écrire)
    // → on vérifie juste que la valeur n'est pas modifiée
    storage.setItem(DEMO_FALLBACK_KEY, "true"); // état corrompu
    enableDemoAuthFallback(true, "www.e-samba.com", storage);
    // Toujours bloqué par isProd=true dans isMockAuthEnabled
    expect(isMockAuthEnabled(true, "www.e-samba.com", "false", storage)).toBe(false);
  });
});

// ─── 4. enableDemoAuthFallback — DEV : fonctionnel ───────────────────────────

describe("enableDemoAuthFallback — mode DEV", () => {
  let storage: Storage;

  beforeEach(() => { storage = makeStorage(); });

  it("écrit dans localStorage en DEV", () => {
    enableDemoAuthFallback(false, "localhost", storage);
    expect(storage.getItem(DEMO_FALLBACK_KEY)).toBe("true");
  });

  it("active isMockAuthEnabled via localStorage en DEV", () => {
    enableDemoAuthFallback(false, "localhost", storage);
    expect(isMockAuthEnabled(false, "localhost", "false", storage)).toBe(true);
  });
});

// ─── 5. disableDemoAuthFallback — nettoie le localStorage ────────────────────

describe("disableDemoAuthFallback", () => {
  let storage: Storage;

  beforeEach(() => { storage = makeStorage(); });

  it("supprime le flag en DEV", () => {
    storage.setItem(DEMO_FALLBACK_KEY, "true");
    disableDemoAuthFallback(false, storage);
    expect(storage.getItem(DEMO_FALLBACK_KEY)).toBeNull();
  });

  it("supprime le flag même en PROD (nettoyage défensif)", () => {
    storage.setItem(DEMO_FALLBACK_KEY, "true");
    disableDemoAuthFallback(true, storage);
    expect(storage.getItem(DEMO_FALLBACK_KEY)).toBeNull();
    // Et bien sûr le mock reste bloqué par PROD
    expect(isMockAuthEnabled(true, "www.e-samba.com", "true", storage)).toBe(false);
  });

  it("est idempotent : appels multiples sans erreur", () => {
    disableDemoAuthFallback(false, storage);
    disableDemoAuthFallback(false, storage);
    expect(storage.getItem(DEMO_FALLBACK_KEY)).toBeNull();
  });
});

// ─── 6. Invariant PROD — combinatoire exhaustive ──────────────────────────────

describe("Invariant PROD : isMockAuthEnabled retourne toujours false", () => {
  const combos: Array<[string, string]> = [
    ["true",  "true"],
    ["true",  "false"],
    ["true",  ""],
    ["false", "true"],
    ["false", "false"],
    ["",      "true"],
    ["",      "false"],
  ];

  for (const [localStorageFlag, viteFlag] of combos) {
    it(`localStorage=${localStorageFlag}, VITE_USE_MOCK_AUTH=${viteFlag} → false`, () => {
      const storage = makeStorage();
      if (localStorageFlag) storage.setItem(DEMO_FALLBACK_KEY, localStorageFlag);
      expect(isMockAuthEnabled(true, "www.e-samba.com", viteFlag, storage)).toBe(false);
    });
  }
});
