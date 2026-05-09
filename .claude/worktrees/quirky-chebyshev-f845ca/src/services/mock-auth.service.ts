/**
 * Authentification mockée (email / téléphone + mot de passe).
 * Évolution prévue : OTP SMS via une méthode dédiée côté service, puis adaptateur Supabase.
 */
import { DEMO_FLEET_ID } from "@/mocks/demo/constants";
import { isValidUuid } from "@/lib/isUuid";
import type { AppRole, AuthUser, FleetMembership } from "@/types/auth";

const STORAGE_KEY = "esamba-mock-auth-v1";
const MIN_PASSWORD_LENGTH = 4;

/** Données persistées en localStorage (session mockée). */
export interface MockPersistedSession {
  user: AuthUser;
  role: AppRole;
  memberships: FleetMembership[];
}

/**
 * Service d'authentification factice pour prototypage et tests sans backend.
 * Remplacer par un adaptateur Supabase / API en conservant la même surface si possible.
 */
export class MockAuthService {
  /** Connexion email ou téléphone + mot de passe. */
  signInWithPassword(
    identifier: string,
    password: string,
    testRole: AppRole = "manager",
  ): { error: Error | null } {
    const trimmed = identifier.trim();
    if (!trimmed) {
      return { error: new Error("Identifiant requis") };
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return {
        error: new Error(
          `Mot de passe trop court (minimum ${MIN_PASSWORD_LENGTH} caractères)`,
        ),
      };
    }
    if (!this.isValidIdentifier(trimmed)) {
      return { error: new Error("Email ou numéro de téléphone invalide") };
    }

    const isEmail = trimmed.includes("@");
    const user: AuthUser = {
      id: `mock-${crypto.randomUUID()}`,
      email: isEmail ? trimmed.toLowerCase() : undefined,
      phone: !isEmail ? this.normalizePhone(trimmed) : undefined,
      created_at: new Date().toISOString(),
      user_metadata: {
        full_name: isEmail
          ? trimmed.split("@")[0]?.replace(/\./g, " ") ?? "Utilisateur démo"
          : "Utilisateur mobile",
      },
    };

    const memberships = this.buildDemoFleetMemberships(user.id, testRole);
    const payload: MockPersistedSession = {
      user,
      role: testRole,
      memberships,
    };
    this.persist(payload);
    return { error: null };
  }

  loadPersisted(): MockPersistedSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as MockPersistedSession;
      if (!parsed?.user?.id || !parsed.role) return null;

      // FIX P0 : migration des sessions avec fleet_id non-UUID (ex. "fleet-esamba-sn")
      // Avant ce fix, loadPersisted() retournait les anciennes sessions stales telles quelles,
      // causant "invalid input syntax for type uuid" côté Supabase.
      const hasInvalidFleetId =
        !parsed.memberships?.length ||
        parsed.memberships.some((m) => !isValidUuid(m.fleet_id));

      if (hasInvalidFleetId) {
        parsed.memberships = this.buildDemoFleetMemberships(
          parsed.user.id,
          parsed.role,
        );
        this.persist(parsed);
      }

      return parsed;
    } catch {
      return null;
    }
  }

  clearSession(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  private persist(data: MockPersistedSession): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /** Adhésion factice à la flotte démo pour que `userFleetId` soit renseigné en mock. */
  private buildDemoFleetMemberships(
    userId: string,
    role: AppRole,
  ): FleetMembership[] {
    return [
      {
        id: `mock-memb-${userId}`,
        fleet_id: DEMO_FLEET_ID,
        role,
        is_active: true,
      },
    ];
  }

  private isValidIdentifier(value: string): boolean {
    if (value.includes("@")) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }
    const digits = value.replace(/\D/g, "");
    return digits.length >= 8;
  }

  private normalizePhone(value: string): string {
    const digits = value.replace(/\D/g, "");
    if (value.trim().startsWith("+")) {
      return `+${digits}`;
    }
    return digits;
  }
}

export const mockAuthService = new MockAuthService();
