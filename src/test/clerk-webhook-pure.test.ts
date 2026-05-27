import { describe, expect, it } from "vitest";
import {
  fullNameFromUser,
  isPostgresUniqueViolation,
  mapClerkRoleToFleetRole,
  primaryPhoneFromUser,
  type ClerkUserPayload,
} from "@/lib/webhooks/clerk/pure";

function user(partial: Partial<ClerkUserPayload> & Pick<ClerkUserPayload, "id">): ClerkUserPayload {
  return {
    id: partial.id,
    first_name: partial.first_name ?? null,
    last_name: partial.last_name ?? null,
    email_addresses: partial.email_addresses ?? [],
    primary_email_address_id: partial.primary_email_address_id ?? null,
    phone_numbers: partial.phone_numbers ?? [],
    primary_phone_number_id: partial.primary_phone_number_id ?? null,
  };
}

describe("clerk webhook — pure", () => {
  it("mapClerkRoleToFleetRole", () => {
    expect(mapClerkRoleToFleetRole("org:admin")).toBe("organizer");
    expect(mapClerkRoleToFleetRole("org:manager")).toBe("manager");
    expect(mapClerkRoleToFleetRole("org:member")).toBe("driver");
    expect(mapClerkRoleToFleetRole("")).toBe("driver");
  });

  it("fullNameFromUser", () => {
    expect(fullNameFromUser(user({ id: "1", first_name: "Ada", last_name: "Lovelace" }))).toBe(
      "Ada Lovelace",
    );
    expect(fullNameFromUser(user({ id: "2", first_name: null, last_name: null }))).toBeNull();
  });

  it("isPostgresUniqueViolation", () => {
    expect(isPostgresUniqueViolation(null)).toBe(false);
    expect(isPostgresUniqueViolation({ code: "23505" })).toBe(true);
    expect(isPostgresUniqueViolation({ message: "duplicate key value" })).toBe(true);
    expect(isPostgresUniqueViolation({ code: "42P01" })).toBe(false);
  });

  it("primaryPhoneFromUser", () => {
    const u = user({
      id: "3",
      phone_numbers: [
        { id: "p1", phone_number: "+237600000001" },
        { id: "p2", phone_number: "+237600000002" },
      ],
      primary_phone_number_id: "p2",
    });
    expect(primaryPhoneFromUser(u)).toBe("+237600000002");
    expect(primaryPhoneFromUser(user({ id: "4" }))).toBeNull();
  });
});
