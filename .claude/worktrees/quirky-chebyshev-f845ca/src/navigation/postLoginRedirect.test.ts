import { describe, it, expect } from "vitest";
import {
  appendNextToLoginPath,
  getSafePostLoginPath,
  isAuthEntryPath,
  POST_LOGIN_NEXT_PARAM,
} from "./postLoginRedirect";

describe("getSafePostLoginPath", () => {
  it("accepte un chemin interne avec query", () => {
    expect(getSafePostLoginPath("/dashboard/vehicles/abc?tab=info")).toBe(
      "/dashboard/vehicles/abc?tab=info",
    );
  });

  it("décode une seule fois une valeur encodée", () => {
    expect(getSafePostLoginPath(encodeURIComponent("/dashboard/alerts"))).toBe(
      "/dashboard/alerts",
    );
  });

  it("rejette les open redirect", () => {
    expect(getSafePostLoginPath("//evil.com")).toBeNull();
    expect(getSafePostLoginPath("/\\evil")).toBeNull();
    expect(getSafePostLoginPath("https://evil.com")).toBeNull();
  });

  it("rejette les chemins vers l’écran de connexion", () => {
    expect(getSafePostLoginPath("/auth")).toBeNull();
    expect(getSafePostLoginPath("/login")).toBeNull();
  });
});

describe("appendNextToLoginPath", () => {
  it("ajoute ?next= pour /auth", () => {
    expect(appendNextToLoginPath("/auth", "/dashboard/reports")).toBe(
      `/auth?${POST_LOGIN_NEXT_PARAM}=%2Fdashboard%2Freports`,
    );
  });

  it("n’ajoute rien si la cible est invalide", () => {
    expect(appendNextToLoginPath("/auth", "//x")).toBe("/auth");
  });
});

describe("isAuthEntryPath", () => {
  it("identifie /auth et /login", () => {
    expect(isAuthEntryPath("/auth")).toBe(true);
    expect(isAuthEntryPath("/login")).toBe(true);
    expect(isAuthEntryPath("/dashboard")).toBe(false);
  });
});
