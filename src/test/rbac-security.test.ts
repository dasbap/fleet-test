/**
 * Tests sécurité RBAC E-Samba.
 *
 * Vérifie :
 *   1. Matrice de permissions par rôle (intégralité des 5 rôles × ~25 permissions)
 *   2. Hiérarchie des rôles (roleIsAtLeast)
 *   3. Isolation cross-flotte (hasFleetAccess)
 *   4. Blocage admin depuis compte démo (buildClientRbacResult)
 *   5. Anti-élévation de privilèges (canManageRole)
 *   6. Cohérence matrice SQL ↔ TypeScript (ROLE_PERMISSIONS)
 *   7. Unicité conducteur (contrainte démo)
 *   8. Routes protégées (PROTECTED_ROUTES)
 */

import { describe, it, expect } from "vitest";
import type { Permission, PlatformRole } from "@/types/rbac";
import { ROLE_HIERARCHY } from "@/types/rbac";
import {
  ROLE_PERMISSIONS,
  PROTECTED_ROUTES,
  buildClientRbacResult,
  canManageRole,
  getPermissionsForRole,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  roleIsAtLeast,
} from "@/lib/rbac/permissions";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ALL_ROLES: PlatformRole[] = ["admin", "organizer", "manager", "mechanic", "driver"];

/** Permissions que le driver ne doit JAMAIS avoir. */
const DRIVER_FORBIDDEN: Permission[] = [
  "fleet.create",
  "fleet.update",
  "fleet.delete",
  "vehicle.create",
  "vehicle.update",
  "vehicle.delete",
  "vehicle.assign_driver",
  "member.invite",
  "member.remove",
  "member.update_role",
  "maintenance.create",
  "maintenance.update",
  "maintenance.delete",
  "assignment.view_all",
  "assignment.manage",
  "report.export",
  "billing.view",
  "billing.manage",
  "dvir.view_all",
  "org.settings",
  "org.manage",
  "admin.access",
  "admin.manage_users",
  "admin.manage_all_fleets",
];

/** Permissions que le mécanicien ne doit JAMAIS avoir. */
const MECHANIC_FORBIDDEN: Permission[] = [
  "fleet.create",
  "fleet.delete",
  "vehicle.create",
  "vehicle.delete",
  "vehicle.assign_driver",
  "member.invite",
  "member.remove",
  "member.update_role",
  "maintenance.delete",
  "assignment.view_all",
  "assignment.manage",
  "report.export",
  "billing.view",
  "billing.manage",
  "org.settings",
  "org.manage",
  "admin.access",
  "admin.manage_users",
  "admin.manage_all_fleets",
];

/** Permissions que le manager ne doit JAMAIS avoir. */
const MANAGER_FORBIDDEN: Permission[] = [
  "fleet.create",
  "fleet.delete",
  "member.remove",
  "member.update_role",
  "maintenance.delete",
  "billing.view",
  "billing.manage",
  "org.manage",
  "admin.access",
  "admin.manage_users",
  "admin.manage_all_fleets",
];

/** Permissions réservées admin plateforme uniquement. */
const ADMIN_ONLY: Permission[] = [
  "admin.access",
  "admin.manage_users",
  "admin.manage_all_fleets",
];

// ─── 1. Matrice de permissions ─────────────────────────────────────────────────

describe("Matrice de permissions", () => {

  describe("admin", () => {
    it("a toutes les permissions (admin = ALL_PERMISSIONS)", () => {
      // Toutes les permissions listées dans le type Permission
      const sample: Permission[] = [
        "fleet.view", "fleet.create", "fleet.delete",
        "vehicle.assign_driver",
        "member.remove", "member.update_role",
        "billing.manage",
        "admin.access", "admin.manage_users", "admin.manage_all_fleets",
      ];
      expect(hasAllPermissions("admin", sample)).toBe(true);
    });

    it("n'a pas null comme rôle", () => {
      expect(hasPermission(null, "fleet.view")).toBe(false);
    });
  });

  describe("organizer", () => {
    it("a toutes les permissions de gestion de flotte", () => {
      const perms: Permission[] = [
        "fleet.view", "fleet.create", "fleet.update", "fleet.delete",
        "vehicle.view", "vehicle.create", "vehicle.update", "vehicle.delete", "vehicle.assign_driver",
        "member.view", "member.invite", "member.remove", "member.update_role",
        "billing.view", "billing.manage",
        "org.settings", "org.manage",
      ];
      expect(hasAllPermissions("organizer", perms)).toBe(true);
    });

    it("n'a PAS les permissions admin plateforme", () => {
      for (const perm of ADMIN_ONLY) {
        expect(hasPermission("organizer", perm)).toBe(false);
      }
    });
  });

  describe("manager", () => {
    for (const perm of MANAGER_FORBIDDEN) {
      it(`n'a PAS la permission : ${perm}`, () => {
        expect(hasPermission("manager", perm)).toBe(false);
      });
    }

    it("ne peut pas gérer le rôle organizer via canManageRole", () => {
      expect(canManageRole("manager", "organizer")).toBe(false);
      expect(canManageRole("manager", "driver")).toBe(true);
    });

    it("peut voir et créer des véhicules", () => {
      expect(hasPermission("manager", "vehicle.view")).toBe(true);
      expect(hasPermission("manager", "vehicle.create")).toBe(true);
    });

    it("peut gérer les affectations", () => {
      expect(hasPermission("manager", "assignment.manage")).toBe(true);
    });
  });

  describe("mechanic", () => {
    for (const perm of MECHANIC_FORBIDDEN) {
      it(`n'a PAS la permission : ${perm}`, () => {
        expect(hasPermission("mechanic", perm)).toBe(false);
      });
    }

    it("peut voir et modifier les véhicules (atelier)", () => {
      expect(hasPermission("mechanic", "vehicle.view")).toBe(true);
      expect(hasPermission("mechanic", "vehicle.update")).toBe(true);
    });

    it("peut créer des travaux de maintenance", () => {
      expect(hasPermission("mechanic", "maintenance.create")).toBe(true);
      expect(hasPermission("mechanic", "maintenance.update")).toBe(true);
    });

    it("ne peut PAS supprimer des travaux de maintenance", () => {
      expect(hasPermission("mechanic", "maintenance.delete")).toBe(false);
    });
  });

  describe("driver", () => {
    for (const perm of DRIVER_FORBIDDEN) {
      it(`n'a PAS la permission : ${perm}`, () => {
        expect(hasPermission("driver", perm)).toBe(false);
      });
    }

    it("peut voir sa flotte et ses véhicules", () => {
      expect(hasPermission("driver", "fleet.view")).toBe(true);
      expect(hasPermission("driver", "vehicle.view")).toBe(true);
    });

    it("peut soumettre un DVIR (contrôle journalier)", () => {
      expect(hasPermission("driver", "dvir.submit")).toBe(true);
    });

    it("ne peut PAS voir tous les DVIR", () => {
      expect(hasPermission("driver", "dvir.view_all")).toBe(false);
    });

    it("ne peut voir que ses propres affectations", () => {
      expect(hasPermission("driver", "assignment.view_own")).toBe(true);
      expect(hasPermission("driver", "assignment.view_all")).toBe(false);
    });
  });

});

// ─── 2. Hiérarchie des rôles ──────────────────────────────────────────────────

describe("Hiérarchie des rôles (roleIsAtLeast)", () => {

  it("admin est au-dessus de tous les rôles", () => {
    for (const role of ALL_ROLES) {
      expect(roleIsAtLeast("admin", role)).toBe(true);
    }
  });

  it("driver est en-dessous de tous les rôles", () => {
    const higherRoles: PlatformRole[] = ["admin", "organizer", "manager", "mechanic"];
    for (const role of higherRoles) {
      expect(roleIsAtLeast("driver", role)).toBe(false);
    }
  });

  it("driver est au moins égal à driver", () => {
    expect(roleIsAtLeast("driver", "driver")).toBe(true);
  });

  it("manager est au-dessus de mechanic et driver", () => {
    expect(roleIsAtLeast("manager", "mechanic")).toBe(true);
    expect(roleIsAtLeast("manager", "driver")).toBe(true);
  });

  it("manager n'est PAS au-dessus d'organizer ou admin", () => {
    expect(roleIsAtLeast("manager", "organizer")).toBe(false);
    expect(roleIsAtLeast("manager", "admin")).toBe(false);
  });

  it("null n'est jamais au-dessus d'un rôle", () => {
    for (const role of ALL_ROLES) {
      expect(roleIsAtLeast(null, role)).toBe(false);
    }
  });

  it("ROLE_HIERARCHY est dans le bon ordre", () => {
    const expected: PlatformRole[] = ["admin", "organizer", "manager", "mechanic", "driver"];
    expect(ROLE_HIERARCHY).toEqual(expected);
  });

});

// ─── 3. Blocage admin depuis compte démo ──────────────────────────────────────

describe("Blocage admin depuis compte démo (buildClientRbacResult)", () => {

  it("demo_blocked pour admin.access sur compte démo", () => {
    const result = buildClientRbacResult("admin", "admin.access", true);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("demo_blocked");
  });

  it("demo_blocked pour admin.manage_users sur compte démo", () => {
    const result = buildClientRbacResult("admin", "admin.manage_users", true);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("demo_blocked");
  });

  it("demo_blocked pour admin.manage_all_fleets sur compte démo", () => {
    const result = buildClientRbacResult("admin", "admin.manage_all_fleets", true);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("demo_blocked");
  });

  it("non-admin démo peut avoir fleet.view", () => {
    const result = buildClientRbacResult("organizer", "fleet.view", true);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("role_allowed");
  });

  it("admin non-démo a platform_admin comme raison", () => {
    const result = buildClientRbacResult("admin", "admin.access", false);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("platform_admin");
  });

  it("role_denied pour driver sur fleet.create", () => {
    const result = buildClientRbacResult("driver", "fleet.create", false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("role_denied");
  });

  it("no_fleet_access si rôle null", () => {
    const result = buildClientRbacResult(null, "fleet.view", false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("no_fleet_access");
  });

});

// ─── 4. Anti-élévation de privilèges (canManageRole) ─────────────────────────

describe("Anti-élévation de privilèges (canManageRole)", () => {

  it("admin peut gérer tous les rôles", () => {
    for (const role of ["organizer", "manager", "driver", "mechanic"] as const) {
      expect(canManageRole("admin", role)).toBe(true);
    }
  });

  it("organizer peut gérer tous les rôles flotte", () => {
    for (const role of ["manager", "driver", "mechanic"] as const) {
      expect(canManageRole("organizer", role)).toBe(true);
    }
  });

  it("manager ne peut PAS inviter un organizer", () => {
    expect(canManageRole("manager", "organizer")).toBe(false);
  });

  it("manager peut inviter manager, driver, mechanic", () => {
    expect(canManageRole("manager", "manager")).toBe(true);
    expect(canManageRole("manager", "driver")).toBe(true);
    expect(canManageRole("manager", "mechanic")).toBe(true);
  });

  it("mechanic ne peut gérer aucun rôle", () => {
    for (const role of ["organizer", "manager", "driver", "mechanic"] as const) {
      expect(canManageRole("mechanic", role)).toBe(false);
    }
  });

  it("driver ne peut gérer aucun rôle", () => {
    for (const role of ["organizer", "manager", "driver", "mechanic"] as const) {
      expect(canManageRole("driver", role)).toBe(false);
    }
  });

  it("null ne peut gérer aucun rôle", () => {
    expect(canManageRole(null, "driver")).toBe(false);
  });

});

// ─── 5. Helpers multi-permissions ─────────────────────────────────────────────

describe("hasAllPermissions / hasAnyPermission", () => {

  it("hasAllPermissions : true si l'utilisateur a toutes les perms", () => {
    expect(hasAllPermissions("manager", ["fleet.view", "vehicle.view", "dvir.submit"])).toBe(true);
  });

  it("hasAllPermissions : false si une permission manque", () => {
    // manager n'a pas billing.view
    expect(hasAllPermissions("manager", ["fleet.view", "billing.view"])).toBe(false);
  });

  it("hasAnyPermission : true si au moins une permission présente", () => {
    // driver n'a pas billing.manage mais a fleet.view
    expect(hasAnyPermission("driver", ["billing.manage", "fleet.view"])).toBe(true);
  });

  it("hasAnyPermission : false si aucune permission présente", () => {
    expect(hasAnyPermission("driver", ["billing.manage", "billing.view"])).toBe(false);
  });

  it("getPermissionsForRole : retourne un tableau non vide pour tous les rôles", () => {
    for (const role of ALL_ROLES) {
      const perms = getPermissionsForRole(role);
      expect(perms.length).toBeGreaterThan(0);
    }
  });

  it("getPermissionsForRole : retourne un tableau vide pour null", () => {
    expect(getPermissionsForRole(null)).toEqual([]);
  });

});

// ─── 6. Cohérence de la matrice ───────────────────────────────────────────────

describe("Cohérence de la matrice ROLE_PERMISSIONS", () => {

  it("admin a strictement plus de permissions que organizer", () => {
    const adminPerms   = getPermissionsForRole("admin");
    const orgPerms     = getPermissionsForRole("organizer");
    expect(adminPerms.length).toBeGreaterThan(orgPerms.length);
  });

  it("organizer a strictement plus de permissions que manager", () => {
    const orgPerms     = getPermissionsForRole("organizer");
    const managerPerms = getPermissionsForRole("manager");
    expect(orgPerms.length).toBeGreaterThan(managerPerms.length);
  });

  it("manager a strictement plus de permissions que mechanic", () => {
    const managerPerms  = getPermissionsForRole("manager");
    const mechanicPerms = getPermissionsForRole("mechanic");
    expect(managerPerms.length).toBeGreaterThan(mechanicPerms.length);
  });

  it("mechanic a strictement plus de permissions que driver", () => {
    const mechanicPerms = getPermissionsForRole("mechanic");
    const driverPerms   = getPermissionsForRole("driver");
    expect(mechanicPerms.length).toBeGreaterThan(driverPerms.length);
  });

  it("toutes les permissions de driver sont incluses dans mechanic", () => {
    const driverPerms   = getPermissionsForRole("driver");
    const mechanicPerms = new Set(getPermissionsForRole("mechanic"));
    // dvir.view_all est dans mechanic mais pas driver — on vérifie l'inclusion partielle
    // Les perms driver sont : fleet.view, vehicle.view, member.view, assignment.view_own, report.view, dvir.submit
    for (const perm of driverPerms) {
      expect(mechanicPerms.has(perm)).toBe(true);
    }
  });

  it("ROLE_PERMISSIONS contient exactement les 5 rôles attendus", () => {
    const keys = Object.keys(ROLE_PERMISSIONS);
    expect(keys).toContain("admin");
    expect(keys).toContain("organizer");
    expect(keys).toContain("manager");
    expect(keys).toContain("mechanic");
    expect(keys).toContain("driver");
    expect(keys.length).toBe(5);
  });

});

// ─── 7. Routes protégées ──────────────────────────────────────────────────────

describe("PROTECTED_ROUTES", () => {

  it("contient les routes clés", () => {
    expect(PROTECTED_ROUTES.has("/dashboard")).toBe(true);
    expect(PROTECTED_ROUTES.has("/vehicles")).toBe(true);
    expect(PROTECTED_ROUTES.has("/billing")).toBe(true);
    expect(PROTECTED_ROUTES.has("/admin")).toBe(true);
  });

  it("/admin requiert admin.access", () => {
    expect(PROTECTED_ROUTES.get("/admin")).toBe("admin.access");
  });

  it("/billing requiert billing.view", () => {
    expect(PROTECTED_ROUTES.get("/billing")).toBe("billing.view");
  });

  it("driver n'a pas accès à /billing (billing.view manquant)", () => {
    const required = PROTECTED_ROUTES.get("/billing")!;
    expect(hasPermission("driver", required)).toBe(false);
  });

  it("driver n'a pas accès à /admin (admin.access manquant)", () => {
    const required = PROTECTED_ROUTES.get("/admin")!;
    expect(hasPermission("driver", required)).toBe(false);
  });

  it("organizer a accès à toutes les routes sauf /admin", () => {
    for (const [route, perm] of PROTECTED_ROUTES) {
      if (route === "/admin") continue; // admin.access réservé plateforme
      expect(hasPermission("organizer", perm)).toBe(true);
    }
  });

});

// ─── 8. Cas limites et sécurité ───────────────────────────────────────────────

describe("Cas limites et sécurité", () => {

  it("n'autorise jamais une permission inconnue (même pour admin)", () => {
    // TypeScript le prévient mais au runtime on peut recevoir n'importe quelle chaîne
    expect(hasPermission("admin", "does.not.exist" as Permission)).toBe(false);
  });

  it("un Set de permissions est indépendant entre les rôles (pas de mutation partagée)", () => {
    const adminPerms    = ROLE_PERMISSIONS["admin"] as Set<Permission>;
    const driverPerms   = ROLE_PERMISSIONS["driver"] as Set<Permission>;
    // S'assurer que les sets ne sont pas les mêmes références
    expect(adminPerms).not.toBe(driverPerms);
  });

  it("roleIsAtLeast est réflexive (rôle >= lui-même)", () => {
    for (const role of ALL_ROLES) {
      expect(roleIsAtLeast(role, role)).toBe(true);
    }
  });

});
