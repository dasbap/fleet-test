import { describe, it, expect } from "vitest";
import { MODULE_ACCESS, hasModuleAccess, type ModuleKey } from "@/auth/permissions";
import type { AppRole } from "@/types/auth";

const ALL_ROLES: AppRole[] = ["organizer", "manager", "driver", "mechanic"];

describe("MODULE_ACCESS — matrice rôles × modules", () => {
  for (const moduleKey of Object.keys(MODULE_ACCESS) as ModuleKey[]) {
    const allowed = MODULE_ACCESS[moduleKey];
    it(`module ${moduleKey} : uniquement ${allowed.join(", ")}`, () => {
      for (const role of ALL_ROLES) {
        expect(hasModuleAccess(role, moduleKey)).toBe(allowed.includes(role));
      }
    });
  }
});
