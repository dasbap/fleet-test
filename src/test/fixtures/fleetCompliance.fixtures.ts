import type { ExpiringVehicleDocument } from "@/repositories/vehicle-document.repository";

export interface PendingClosureFixture {
  id: string;
  created_at: string;
  vehicleRegistration: string | null;
}

export function makePendingClosure(
  overrides: Partial<PendingClosureFixture> = {},
): PendingClosureFixture {
  return {
    id: "closure-1",
    created_at: "2026-04-25T08:00:00.000Z",
    vehicleRegistration: "LT-001-AA",
    ...overrides,
  };
}

export function makeExpiringDocument(
  overrides: Partial<ExpiringVehicleDocument> = {},
): ExpiringVehicleDocument {
  return {
    id: "doc-1",
    vehicle_id: "vehicle-1",
    doc_type: "Assurance",
    expires_at: "2026-05-10",
    ...overrides,
  };
}
