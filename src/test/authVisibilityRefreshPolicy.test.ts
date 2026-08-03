import { describe, expect, it } from "vitest";

import {
  shouldFetchMembershipsForAuthEvent,
  shouldRefreshSessionOnVisibility,
} from "@/features/auth/lib/authProviderUtils";

describe("auth visibility refresh policy", () => {
  it("ignore le retour de focus quand la session expire plus tard", () => {
    expect(shouldRefreshSessionOnVisibility(2_000, 1_000)).toBe(false);
  });

  it("rafraichit quand la session expire bientot", () => {
    expect(shouldRefreshSessionOnVisibility(1_120, 1_000)).toBe(true);
  });

  it("ne rafraichit pas au retour avant-plan de l'app native", () => {
    expect(
      shouldRefreshSessionOnVisibility(1_120, 1_000, 5 * 60, {
        nativeApp: true,
      }),
    ).toBe(false);
  });

  it("rafraichit par prudence quand l'expiration est inconnue", () => {
    expect(shouldRefreshSessionOnVisibility(undefined, 1_000)).toBe(true);
  });

  it("ne recharge pas les memberships sur un SIGNED_IN repete du meme utilisateur", () => {
    expect(
      shouldFetchMembershipsForAuthEvent({
        event: "SIGNED_IN",
        nextUserId: "user-1",
        currentUserId: "user-1",
        membershipCount: 2,
      }),
    ).toBe(false);
  });

  it("ne recharge pas les memberships d'un admin deja resolu sans flotte", () => {
    expect(
      shouldFetchMembershipsForAuthEvent({
        event: "SIGNED_IN",
        nextUserId: "admin-1",
        currentUserId: "admin-1",
        membershipCount: 0,
        membershipsResolved: true,
      }),
    ).toBe(false);
  });

  it("recharge les memberships quand l'utilisateur change", () => {
    expect(
      shouldFetchMembershipsForAuthEvent({
        event: "SIGNED_IN",
        nextUserId: "user-2",
        currentUserId: "user-1",
        membershipCount: 2,
      }),
    ).toBe(true);
  });

  it("ignore les renouvellements de token pour les memberships", () => {
    expect(
      shouldFetchMembershipsForAuthEvent({
        event: "TOKEN_REFRESHED",
        nextUserId: "user-1",
        currentUserId: "user-1",
        membershipCount: 2,
      }),
    ).toBe(false);
  });
});
