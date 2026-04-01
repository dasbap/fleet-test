import { describe, it, expect } from "vitest";
import {
  hasModuleAccess,
  hasModuleAccessMobile,
  MODULE_ACCESS,
  DASHBOARD_BACKOFFICE_ROLES,
} from "@/auth/permissions";

describe("hasModuleAccess", () => {
  it("refuse un rôle null", () => {
    expect(hasModuleAccess(null, "finances")).toBe(false);
  });

  it("autorise le superviseur (organizer) sur finances", () => {
    expect(hasModuleAccess("organizer", "finances")).toBe(true);
  });

  it("refuse le gestionnaire de flotte sur finances", () => {
    expect(hasModuleAccess("manager", "finances")).toBe(false);
  });

  it("aligne backoffice avec DASHBOARD_BACKOFFICE_ROLES", () => {
    expect(MODULE_ACCESS.backoffice).toEqual(DASHBOARD_BACKOFFICE_ROLES);
  });
});

describe("hasModuleAccessMobile", () => {
  it("mappe SUPERVISOR vers organizer pour finances", () => {
    expect(hasModuleAccessMobile("SUPERVISOR", "finances")).toBe(true);
  });

  it("mappe FLEET_MANAGER vers manager — pas d’accès finances", () => {
    expect(hasModuleAccessMobile("FLEET_MANAGER", "finances")).toBe(false);
  });

  it("autorise mécanicien sur historique atelier", () => {
    expect(hasModuleAccessMobile("MECHANIC", "history_workshop")).toBe(true);
  });
});
