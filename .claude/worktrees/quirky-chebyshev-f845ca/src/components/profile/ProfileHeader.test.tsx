import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProfileHeader from "./ProfileHeader";
import type { User } from "@supabase/supabase-js";

/** Utilisateur minimal pour les tests */
function mockUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "test@example.com",
    user_metadata: { full_name: "Jean Dupont" },
    created_at: "2024-01-15T10:00:00Z",
    ...overrides,
  } as User;
}

describe("ProfileHeader", () => {
  it("affiche le nom, l'email et le rôle", () => {
    const user = mockUser();
    render(
      <ProfileHeader
        user={user}
        role="manager"
        fullName="Jean Dupont"
        initials="JD"
        createdAt="15 janvier 2024"
      />
    );

    expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByText("Gestionnaire")).toBeInTheDocument();
    expect(screen.getByText(/Membre depuis 15 janvier 2024/)).toBeInTheDocument();
  });

  it("affiche les initiales dans l'avatar fallback", () => {
    const user = mockUser();
    render(
      <ProfileHeader
        user={user}
        role={null}
        fullName="Jean Dupont"
        initials="JD"
        createdAt="N/A"
      />
    );

    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("n'affiche pas de badge rôle si role est null", () => {
    const user = mockUser();
    render(
      <ProfileHeader
        user={user}
        role={null}
        fullName="Jean Dupont"
        initials="JD"
        createdAt="N/A"
      />
    );

    expect(screen.queryByText("Organisateur")).not.toBeInTheDocument();
    expect(screen.queryByText("Gestionnaire")).not.toBeInTheDocument();
    expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
  });
});
