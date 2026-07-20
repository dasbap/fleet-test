import type { ExpiringVehicleDocument } from "@/repositories/vehicle-document.repository";

import type { CollectionMode } from "@/domain/constants/collectionMode";

export interface PendingClosureFixture {
  id: string;
  created_at: string;
  vehicleRegistration: string | null;
  revenue_declared: number;
  collection_mode: CollectionMode;
  kmStart: number | null;
  kmEnd: number | null;
  driverName: string | null;
}

export function makePendingClosure(
  overrides: Partial<PendingClosureFixture> = {},
): PendingClosureFixture {
  return {
    id: "closure-1",
    created_at: "2026-04-25T08:00:00.000Z",
    vehicleRegistration: "LT-001-AA",
    revenue_declared: 45_000,
    collection_mode: "cash",
    kmStart: 12_500,
    kmEnd: 12_680,
    driverName: "Jean Kouassi",
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
