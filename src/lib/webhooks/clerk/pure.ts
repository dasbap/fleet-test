/**
 * Logique pure du webhook Clerk (tests sans Supabase).
 */

export interface ClerkEmailAddress {
  email_address: string;
  id: string;
}

export interface ClerkUserPayload {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string | null;
  phone_numbers: { phone_number: string; id: string }[];
  primary_phone_number_id: string | null;
}

export interface ClerkOrgMembershipPayload {
  organization: { id: string; name: string };
  public_user_data: { user_id: string };
  role: string;
}

/** Téléphone principal Clerk si présent. */
export function primaryPhoneFromUser(user: ClerkUserPayload): string | null {
  if (!user.primary_phone_number_id) return null;
  return (
    user.phone_numbers.find((p) => p.id === user.primary_phone_number_id)?.phone_number ?? null
  );
}

/** Nom affiché à partir du prénom / nom Clerk. */
export function fullNameFromUser(user: ClerkUserPayload): string | null {
  const parts = [user.first_name, user.last_name].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

/** Rôle applicatif (enum role_type) à partir du rôle Clerk organisation. */
export function mapClerkRoleToFleetRole(clerkRole: string): "organizer" | "manager" | "driver" {
  if (clerkRole === "org:admin") return "organizer";
  if (clerkRole === "org:manager") return "manager";
  return "driver";
}

/** Détecte une violation d’unicité PostgreSQL (course sur l’idempotence svix-id). */
export function isPostgresUniqueViolation(err: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!err) return false;
  if (err.code === "23505") return true;
  const m = typeof err.message === "string" ? err.message.toLowerCase() : "";
  return m.includes("duplicate");
}
