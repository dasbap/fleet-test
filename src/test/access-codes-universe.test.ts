/**
 * Tests sécurité — Codes d'accès et isolation des univers E-Samba
 *
 * Couvre :
 *   1. Isolation des univers (canUniversesCross)
 *   2. Validation de format des codes
 *   3. Permissions par univers et rôle
 *   4. Règles de création de codes (qui peut créer quoi)
 *   5. Expiration des accès temporaires
 *   6. Règle lecture seule investisseur
 */

import { describe, it, expect } from "vitest";

import {
  canUniversesCross,
  canWrite,
  getUniverseLabel,
  getUniverseBlockMessage,
  internalCanCreateDemoAccess,
  internalCanRevokeCode,
  internalCanManageAdmins,
  temporaryIsReadOnly,
  temporaryCanCreateVehicle,
  isTemporaryAccessExpired,
  temporaryDaysRemaining,
  buildUserUniverseContext,
} from "@/lib/access/universeGuard";

import {
  validateCodeFormat,
  normalizeCode,
  guessRoleFromCode,
  guessUniverseFromCode,
  isCodeExpired,
  canCreateCode,
  CODE_INPUT_MESSAGES,
} from "@/lib/access/accessCodeGuard";

import {
  ACCESS_UNIVERSE_LABELS,
  INTERNAL_ROLE_PERMISSIONS,
  TEMPORARY_ROLE_PERMISSIONS,
} from "@/types/access";

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Isolation des univers
// ═══════════════════════════════════════════════════════════════════════════════

describe("Isolation des univers — canUniversesCross", () => {
  it("un compte real ne peut pas accéder aux données démo", () => {
    expect(canUniversesCross("real", "demo")).toBe(false);
  });

  it("un compte real peut accéder aux données réelles", () => {
    expect(canUniversesCross("real", "real")).toBe(true);
  });

  it("un compte temporary ne peut pas accéder aux données réelles", () => {
    expect(canUniversesCross("temporary", "real")).toBe(false);
  });

  it("un compte temporary peut accéder aux données démo", () => {
    expect(canUniversesCross("temporary", "demo")).toBe(true);
  });

  it("un compte internal peut accéder aux données démo", () => {
    expect(canUniversesCross("internal", "demo")).toBe(true);
  });

  it("un compte internal peut accéder aux données réelles", () => {
    expect(canUniversesCross("internal", "real")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Messages UX d'isolation
// ═══════════════════════════════════════════════════════════════════════════════

describe("Messages UX d'isolation", () => {
  it("retourne un message FR quand real tente d'accéder à démo", () => {
    const msg = getUniverseBlockMessage("real", "demo");
    expect(msg).toContain("démonstration");
    expect(msg.length).toBeGreaterThan(10);
  });

  it("retourne un message FR quand temporary tente d'accéder à réel", () => {
    const msg = getUniverseBlockMessage("temporary", "real");
    expect(msg).toContain("démonstration");
  });

  it("tous les labels d'univers sont définis en français", () => {
    const universes = ["internal", "temporary", "real"] as const;
    universes.forEach((u) => {
      expect(ACCESS_UNIVERSE_LABELS[u]).toBeTruthy();
      expect(typeof ACCESS_UNIVERSE_LABELS[u]).toBe("string");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Permissions des rôles internes
// ═══════════════════════════════════════════════════════════════════════════════

describe("Permissions rôles internes", () => {
  it("admin peut tout faire", () => {
    const p = INTERNAL_ROLE_PERMISSIONS.admin;
    expect(p.canCreateDemoAccess).toBe(true);
    expect(p.canCreateInternalCode).toBe(true);
    expect(p.canRevokeCode).toBe(true);
    expect(p.canViewAllFleets).toBe(true);
    expect(p.canManageAdmins).toBe(true);
  });

  it("commercial peut créer des accès démo mais pas gérer les admins", () => {
    expect(internalCanCreateDemoAccess("commercial")).toBe(true);
    expect(internalCanManageAdmins("commercial")).toBe(false);
    expect(internalCanRevokeCode("commercial")).toBe(false);
    expect(INTERNAL_ROLE_PERMISSIONS.commercial.canCreateInternalCode).toBe(false);
  });

  it("dev peut créer des accès démo et révoquer des codes", () => {
    expect(internalCanCreateDemoAccess("dev")).toBe(true);
    expect(internalCanRevokeCode("dev")).toBe(true);
    expect(internalCanManageAdmins("dev")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Permissions des rôles temporaires
// ═══════════════════════════════════════════════════════════════════════════════

describe("Permissions rôles temporaires", () => {
  it("investisseur est en lecture seule", () => {
    expect(temporaryIsReadOnly("investor")).toBe(true);
    expect(temporaryCanCreateVehicle("investor")).toBe(false);
    expect(TEMPORARY_ROLE_PERMISSIONS.investor.canExportData).toBe(false);
    expect(TEMPORARY_ROLE_PERMISSIONS.investor.canInviteUsers).toBe(false);
    expect(TEMPORARY_ROLE_PERMISSIONS.investor.canViewBilling).toBe(false);
  });

  it("prospect peut créer des véhicules (dans flotte démo)", () => {
    expect(temporaryIsReadOnly("prospect")).toBe(false);
    expect(temporaryCanCreateVehicle("prospect")).toBe(true);
  });

  it("prospect ne peut pas exporter ni inviter", () => {
    expect(TEMPORARY_ROLE_PERMISSIONS.prospect.canExportData).toBe(false);
    expect(TEMPORARY_ROLE_PERMISSIONS.prospect.canInviteUsers).toBe(false);
  });

  it("canWrite retourne false pour un investisseur", () => {
    const ctx = buildUserUniverseContext({
      internalRole:  null,
      temporaryRole: "investor",
      expiresAt:     new Date(Date.now() + 86_400_000).toISOString(),
    });
    expect(canWrite(ctx)).toBe(false);
  });

  it("canWrite retourne true pour un prospect", () => {
    const ctx = buildUserUniverseContext({
      internalRole:  null,
      temporaryRole: "prospect",
      expiresAt:     new Date(Date.now() + 86_400_000).toISOString(),
    });
    expect(canWrite(ctx)).toBe(true);
  });

  it("canWrite retourne true pour un compte real", () => {
    const ctx = buildUserUniverseContext({
      internalRole:  null,
      temporaryRole: null,
      expiresAt:     null,
    });
    expect(canWrite(ctx)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Expiration des accès temporaires
// ═══════════════════════════════════════════════════════════════════════════════

describe("Expiration accès temporaires", () => {
  it("détecte un accès expiré", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(isTemporaryAccessExpired(past)).toBe(true);
  });

  it("détecte un accès encore valide", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(isTemporaryAccessExpired(future)).toBe(false);
  });

  it("retourne null si pas d'expiration", () => {
    expect(isTemporaryAccessExpired(null)).toBe(false);
    expect(temporaryDaysRemaining(null)).toBeNull();
  });

  it("calcule correctement les jours restants", () => {
    const in7days = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const days = temporaryDaysRemaining(in7days);
    expect(days).toBeGreaterThanOrEqual(6);
    expect(days).toBeLessThanOrEqual(7);
  });

  it("retourne 0 pour un accès expiré", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(temporaryDaysRemaining(past)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Validation de format des codes
// ═══════════════════════════════════════════════════════════════════════════════

describe("Validation format des codes d'accès", () => {
  it("accepte un code au format correct", () => {
    expect(validateCodeFormat("SAMBA-INV-ABC-0042")).toBeNull();
    expect(validateCodeFormat("SAMBA-PRO-XY1-9999")).toBeNull();
    expect(validateCodeFormat("SAMBA-COM-DEF-0001")).toBeNull();
  });

  it("rejette un code vide", () => {
    expect(validateCodeFormat("")).toBeTruthy();
  });

  it("rejette un code trop court", () => {
    expect(validateCodeFormat("SAMBA")).toBeTruthy();
  });

  it("rejette un code mal formaté", () => {
    expect(validateCodeFormat("samba-inv-abc-0042")).not.toBeNull(); // minuscules
    expect(validateCodeFormat("SAMBA_INV_ABC_0042")).not.toBeNull(); // underscores
    expect(validateCodeFormat("INVALID")).not.toBeNull();
  });

  it("normalise correctement les codes", () => {
    expect(normalizeCode("  samba-inv-abc-0042  ")).toBe("SAMBA-INV-ABC-0042");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. Détection du rôle depuis le préfixe
// ═══════════════════════════════════════════════════════════════════════════════

describe("Détection du rôle depuis le préfixe", () => {
  it("détecte investor depuis SAMBA-INV-", () => {
    expect(guessRoleFromCode("SAMBA-INV-ABC-0001")).toBe("investor");
  });

  it("détecte prospect depuis SAMBA-PRO-", () => {
    expect(guessRoleFromCode("SAMBA-PRO-XYZ-0001")).toBe("prospect");
  });

  it("détecte commercial depuis SAMBA-COM-", () => {
    expect(guessRoleFromCode("SAMBA-COM-ABC-0001")).toBe("commercial");
  });

  it("détecte dev depuis SAMBA-DEV-", () => {
    expect(guessRoleFromCode("SAMBA-DEV-ABC-0001")).toBe("dev");
  });

  it("retourne null pour un préfixe inconnu", () => {
    expect(guessRoleFromCode("SAMBA-UNKNOWN-ABC-0001")).toBeNull();
  });

  it("détecte l'univers temporaire pour investor et prospect", () => {
    expect(guessUniverseFromCode("SAMBA-INV-ABC-0001")).toBe("temporary");
    expect(guessUniverseFromCode("SAMBA-PRO-ABC-0001")).toBe("temporary");
  });

  it("détecte l'univers internal pour commercial et dev", () => {
    expect(guessUniverseFromCode("SAMBA-COM-ABC-0001")).toBe("internal");
    expect(guessUniverseFromCode("SAMBA-DEV-ABC-0001")).toBe("internal");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. Règles de création de codes
// ═══════════════════════════════════════════════════════════════════════════════

describe("Règles de création de codes", () => {
  it("admin peut créer des codes investor", () => {
    expect(canCreateCode("admin", "investor").allowed).toBe(true);
  });

  it("admin peut créer des codes prospect", () => {
    expect(canCreateCode("admin", "prospect").allowed).toBe(true);
  });

  it("admin peut créer des codes commercial", () => {
    expect(canCreateCode("admin", "commercial").allowed).toBe(true);
  });

  it("admin peut créer des codes dev", () => {
    expect(canCreateCode("admin", "dev").allowed).toBe(true);
  });

  it("commercial peut créer des codes investor", () => {
    expect(canCreateCode("commercial", "investor").allowed).toBe(true);
  });

  it("commercial peut créer des codes prospect", () => {
    expect(canCreateCode("commercial", "prospect").allowed).toBe(true);
  });

  it("commercial NE PEUT PAS créer des codes commercial", () => {
    const result = canCreateCode("commercial", "commercial");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it("commercial NE PEUT PAS créer des codes dev", () => {
    expect(canCreateCode("commercial", "dev").allowed).toBe(false);
  });

  it("dev NE PEUT PAS créer des codes commercial", () => {
    expect(canCreateCode("dev", "commercial").allowed).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. Contexte utilisateur univers
// ═══════════════════════════════════════════════════════════════════════════════

describe("buildUserUniverseContext", () => {
  it("retourne internal pour un admin", () => {
    const ctx = buildUserUniverseContext({
      internalRole:  "admin",
      temporaryRole: null,
      expiresAt:     null,
    });
    expect(ctx.universe).toBe("internal");
    expect(ctx.internalRole).toBe("admin");
    expect(ctx.isReadOnly).toBe(false);
    expect(ctx.expiresAt).toBeNull();
  });

  it("retourne temporary pour un investisseur", () => {
    const exp = new Date(Date.now() + 86_400_000).toISOString();
    const ctx = buildUserUniverseContext({
      internalRole:  null,
      temporaryRole: "investor",
      expiresAt:     exp,
    });
    expect(ctx.universe).toBe("temporary");
    expect(ctx.temporaryRole).toBe("investor");
    expect(ctx.isReadOnly).toBe(true);
    expect(ctx.expiresAt).toBe(exp);
  });

  it("retourne real quand aucun rôle spécial", () => {
    const ctx = buildUserUniverseContext({
      internalRole:  null,
      temporaryRole: null,
      expiresAt:     null,
    });
    expect(ctx.universe).toBe("real");
    expect(ctx.isReadOnly).toBe(false);
  });

  it("internalRole prime sur temporaryRole (cohérence)", () => {
    const ctx = buildUserUniverseContext({
      internalRole:  "commercial",
      temporaryRole: "investor",  // incohérent mais testé quand même
      expiresAt:     null,
    });
    expect(ctx.universe).toBe("internal");   // internalRole prime
    expect(ctx.isReadOnly).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. Messages d'erreur en français
// ═══════════════════════════════════════════════════════════════════════════════

describe("Messages d'erreur — tous en français", () => {
  it("tous les CODE_INPUT_MESSAGES sont en français non vides", () => {
    Object.values(CODE_INPUT_MESSAGES).forEach((msg) => {
      expect(typeof msg).toBe("string");
      expect(msg.length).toBeGreaterThan(5);
      // Pas de message en anglais (heuristique simple)
      expect(msg).not.toMatch(/\b(error|invalid|not found|expired)\b/i);
    });
  });

  it("getUniverseLabel retourne des labels non vides", () => {
    (["internal", "temporary", "real"] as const).forEach((u) => {
      expect(getUniverseLabel(u).length).toBeGreaterThan(3);
    });
  });
});
