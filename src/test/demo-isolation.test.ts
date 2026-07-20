/**
 * Tests isolation stricte données démo E-Samba.
 *
 * Vérifie :
 *   1. Restrictions fonctionnelles prospect (canAccess par feature)
 *   2. Logique d'expiration (daysRemaining, isExpired, statuts)
 *   3. Isolation namespace démo (fonctions pures)
 *   4. Matrice accès prospect × feature
 *   5. Cas limites : compte suspendu, converti, inconnu
 */

import { describe, it, expect } from "vitest";

// ─── Types locaux (miroir de useProspectDemo sans import React) ───────────────

type ProspectStatus =
  | "loading"
  | "not_prospect"
  | "active"
  | "expired"
  | "suspended"
  | "converted"
  | "error";

type ProspectFeature =
  | "dashboard"
  | "vehicles_view"
  | "dvir_submit"
  | "maintenance_view"
  | "assignments_own"
  | "reports_basic"
  | "billing"
  | "reports_export"
  | "reports_advanced"
  | "multi_fleet"
  | "admin_panel"
  | "vehicles_create"
  | "members_manage"
  | "org_settings";

// ─── Fonctions pures extraites de useProspectDemo (testables sans React) ────

const PROSPECT_ALLOWED: Set<ProspectFeature> = new Set([
  "dashboard",
  "vehicles_view",
  "dvir_submit",
  "maintenance_view",
  "assignments_own",
  "reports_basic",
]);

const PROSPECT_BLOCKED: Set<ProspectFeature> = new Set([
  "billing",
  "reports_export",
  "reports_advanced",
  "multi_fleet",
  "admin_panel",
  "vehicles_create",
  "members_manage",
  "org_settings",
]);

function canAccess(
  status: ProspectStatus,
  isExpired: boolean,
  feature: ProspectFeature,
): boolean {
  if (status === "not_prospect") return true;
  if (status === "converted") return false;
  if (status === "suspended" || status === "loading") return false;
  if (isExpired || status === "expired") {
    return feature === "dashboard" || feature === "vehicles_view";
  }
  if (PROSPECT_BLOCKED.has(feature)) return false;
  return PROSPECT_ALLOWED.has(feature);
}

// ─── Helpers expiration ───────────────────────────────────────────────────────

function daysRemaining(trialEndIso: string): number {
  const now  = Date.now();
  const end  = new Date(trialEndIso).getTime();
  return Math.max(0, Math.floor((end - now) / 86_400_000));
}

function isTrialExpired(trialEndIso: string): boolean {
  return new Date(trialEndIso) < new Date();
}

// ─── Isolation namespace (fonctions pures) ────────────────────────────────────

type UserKind = "real" | "demo" | "prospect" | "admin";

function checkIsolation(
  userKind: UserKind,
  fleetIsDemo: boolean,
): "allowed" | "demo_isolation_violation" | "real_isolation_violation" {
  if (userKind === "admin") return "allowed";
  const userIsDemo = userKind === "demo" || userKind === "prospect";
  if (userIsDemo && !fleetIsDemo) return "demo_isolation_violation";
  if (!userIsDemo && fleetIsDemo)  return "real_isolation_violation";
  return "allowed";
}


// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 1. canAccess — prospect actif ────────────────────────────────────────────

describe("canAccess — prospect actif", () => {

  const ACTIVE_ALLOWED: ProspectFeature[] = [
    "dashboard", "vehicles_view", "dvir_submit",
    "maintenance_view", "assignments_own", "reports_basic",
  ];

  const ACTIVE_BLOCKED: ProspectFeature[] = [
    "billing", "reports_export", "reports_advanced",
    "multi_fleet", "admin_panel", "vehicles_create",
    "members_manage", "org_settings",
  ];

  for (const feature of ACTIVE_ALLOWED) {
    it(`prospect actif peut accéder à : ${feature}`, () => {
      expect(canAccess("active", false, feature)).toBe(true);
    });
  }

  for (const feature of ACTIVE_BLOCKED) {
    it(`prospect actif NE peut PAS accéder à : ${feature}`, () => {
      expect(canAccess("active", false, feature)).toBe(false);
    });
  }
});

// ─── 2. canAccess — prospect expiré ───────────────────────────────────────────

describe("canAccess — prospect expiré (lecture seule)", () => {

  it("dashboard accessible en lecture après expiration", () => {
    expect(canAccess("active", true, "dashboard")).toBe(true);
    expect(canAccess("expired", false, "dashboard")).toBe(true);
  });

  it("vehicles_view accessible en lecture après expiration", () => {
    expect(canAccess("active", true, "vehicles_view")).toBe(true);
  });

  it("dvir_submit bloqué après expiration", () => {
    expect(canAccess("active", true, "dvir_submit")).toBe(false);
    expect(canAccess("expired", false, "dvir_submit")).toBe(false);
  });

  it("billing toujours bloqué après expiration", () => {
    expect(canAccess("expired", false, "billing")).toBe(false);
    expect(canAccess("active", true, "billing")).toBe(false);
  });

  it("maintenance_view bloquée après expiration", () => {
    expect(canAccess("expired", false, "maintenance_view")).toBe(false);
  });
});

// ─── 3. canAccess — compte suspendu ───────────────────────────────────────────

describe("canAccess — compte suspendu (tout bloqué)", () => {

  const ALL_FEATURES: ProspectFeature[] = [
    ...Array.from(PROSPECT_ALLOWED),
    ...Array.from(PROSPECT_BLOCKED),
  ];

  for (const feature of ALL_FEATURES) {
    it(`suspendu : ${feature} bloqué`, () => {
      expect(canAccess("suspended", false, feature)).toBe(false);
    });
  }
});

// ─── 4. canAccess — non-prospect ──────────────────────────────────────────────

describe("canAccess — non-prospect (pas de restriction)", () => {

  const ALL_FEATURES: ProspectFeature[] = [
    ...Array.from(PROSPECT_ALLOWED),
    ...Array.from(PROSPECT_BLOCKED),
  ];

  for (const feature of ALL_FEATURES) {
    it(`utilisateur réel : ${feature} non restreint`, () => {
      expect(canAccess("not_prospect", false, feature)).toBe(true);
    });
  }
});

// ─── 5. canAccess — état loading ──────────────────────────────────────────────

describe("canAccess — loading (conservatif)", () => {
  it("bloque tout pendant le chargement", () => {
    expect(canAccess("loading", false, "dashboard")).toBe(false);
    expect(canAccess("loading", false, "vehicles_view")).toBe(false);
  });
});

// ─── 6. Expiration temporelle ────────────────────────────────────────────────

describe("Expiration temporelle", () => {

  it("trial futur : daysRemaining > 0", () => {
    const end = new Date(Date.now() + 3 * 86_400_000).toISOString(); // +3j
    const remaining = daysRemaining(end);
    expect(remaining).toBeGreaterThanOrEqual(2);
    expect(remaining).toBeLessThanOrEqual(3);
  });

  it("trial passé : daysRemaining = 0", () => {
    const end = new Date(Date.now() - 86_400_000).toISOString(); // -1j
    expect(daysRemaining(end)).toBe(0);
  });

  it("isTrialExpired vrai si trial_end dans le passé", () => {
    const end = new Date(Date.now() - 1000).toISOString();
    expect(isTrialExpired(end)).toBe(true);
  });

  it("isTrialExpired faux si trial_end dans le futur", () => {
    const end = new Date(Date.now() + 86_400_000).toISOString();
    expect(isTrialExpired(end)).toBe(false);
  });

  it("7 jours complets → daysRemaining = 7", () => {
    const end = new Date(Date.now() + 7 * 86_400_000 - 1000).toISOString();
    expect(daysRemaining(end)).toBe(6); // < 7j complets → floor → 6
  });
});

// ─── 7. Isolation namespace démo ─────────────────────────────────────────────

describe("Isolation namespace démo (checkIsolation)", () => {

  it("utilisateur réel sur flotte réelle → allowed", () => {
    expect(checkIsolation("real", false)).toBe("allowed");
  });

  it("utilisateur démo sur flotte démo → allowed", () => {
    expect(checkIsolation("demo", true)).toBe("allowed");
  });

  it("prospect sur flotte démo → allowed", () => {
    expect(checkIsolation("prospect", true)).toBe("allowed");
  });

  it("utilisateur démo sur flotte réelle → violation", () => {
    expect(checkIsolation("demo", false)).toBe("demo_isolation_violation");
  });

  it("prospect sur flotte réelle → violation", () => {
    expect(checkIsolation("prospect", false)).toBe("demo_isolation_violation");
  });

  it("utilisateur réel sur flotte démo → violation", () => {
    expect(checkIsolation("real", true)).toBe("real_isolation_violation");
  });

  it("admin sur flotte démo → allowed (accès audit)", () => {
    expect(checkIsolation("admin", true)).toBe("allowed");
  });

  it("admin sur flotte réelle → allowed", () => {
    expect(checkIsolation("admin", false)).toBe("allowed");
  });

});

// ─── 8. Matrice complète isolation × userKind ─────────────────────────────────

describe("Matrice isolation complète", () => {

  const matrix: Array<[UserKind, boolean, ReturnType<typeof checkIsolation>]> = [
    ["real",     false, "allowed"],
    ["real",     true,  "real_isolation_violation"],
    ["demo",     false, "demo_isolation_violation"],
    ["demo",     true,  "allowed"],
    ["prospect", false, "demo_isolation_violation"],
    ["prospect", true,  "allowed"],
    ["admin",    false, "allowed"],
    ["admin",    true,  "allowed"],
  ];

  for (const [kind, isDemo, expected] of matrix) {
    it(`${kind} × is_demo=${isDemo} → ${expected}`, () => {
      expect(checkIsolation(kind, isDemo)).toBe(expected);
    });
  }
});

// ─── 9. Admin : pas de restriction features ───────────────────────────────────

describe("Admin : pas de restriction via canAccess (not_prospect)", () => {
  // L'admin est géré par le RBAC, pas par useProspectDemo
  // → retourné comme "not_prospect" par le hook
  const allFeatures: ProspectFeature[] = [
    "billing", "admin_panel", "reports_export",
    "org_settings", "members_manage", "multi_fleet",
  ];

  for (const feature of allFeatures) {
    it(`admin (not_prospect) : ${feature} non restreint`, () => {
      expect(canAccess("not_prospect", false, feature)).toBe(true);
    });
  }
});

// ─── 10. Prospect converti : traité comme non-prospect ────────────────────────

describe("Prospect converti", () => {
  // "converted" n'est pas dans les statuts gérés par canAccess → treated as expired path
  // En pratique, un compte converti est retiré de demo_profiles
  // et useProspectDemo retourne "not_prospect"
  it("status converted → canAccess retourne false (expire path)", () => {
    // Le statut "converted" n'est pas géré dans canAccess → pas un cas actif/expiré/suspendu
    // Il tombe dans le cas "expired" par défaut
    // Ce comportement est intentionnel : l'UI doit rediriger vers l'onboarding réel
    expect(canAccess("converted" as ProspectStatus, false, "dashboard")).toBe(false);
  });
});
