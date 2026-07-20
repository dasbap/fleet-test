import { z } from "zod";
import { OFFLINE_QUEUE_SCHEMA_VERSION } from "./constants";

export const offlineMediaRefSchema = z.object({
  ref: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
});

export const offlineIncidentCreatePayloadSchema = z.object({
  draftId: z.string().optional(),
  fleetId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  driverUserId: z.string().uuid(),
  description: z.string().min(1),
  severity: z.string().min(1),
  incidentCategory: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  evidenceDataUrl: z.string().nullable().optional(),
  evidenceMediaRef: offlineMediaRefSchema.nullable().optional(),
});

export const offlineShiftStartPayloadSchema = z.object({
  assignmentId: z.string().uuid(),
  kmStart: z.number().nonnegative(),
});

export const offlineShiftClosePayloadSchema = z.object({
  shiftId: z.string().uuid(),
  kmEnd: z.number().nonnegative(),
  revenueDeclared: z.number().nonnegative(),
  collectionMode: z.enum(["cash", "momo", "mix"]),
  proofType: z.string().min(1),
  proofValue: z.string(),
  proofMediaRef: offlineMediaRefSchema.nullable().optional(),
});

export const offlineFuelCreatePayloadSchema = z.object({
  fleetId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  driverUserId: z.string().uuid(),
  liters: z.number().positive(),
  amountXof: z.number().nonnegative(),
  odometerKm: z.number().nonnegative(),
  purchasedAt: z.string().min(1),
  stationName: z.string().nullable().optional(),
  receiptRef: z.string().nullable().optional(),
});

export const offlineDvirCreatePayloadSchema = z.object({
  fleetId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  inspectedBy: z.string().uuid(),
  inspectionType: z.enum(["pre_trip", "post_trip", "weekly", "periodic", "interim"]),
  items: z.record(
    z.object({
      status: z.string(),
      note: z.string().nullable().optional(),
    }),
  ),
  notes: z.string().nullable().optional(),
  odometerKm: z.number().nullable().optional(),
  photoDataUrls: z.array(z.string()).optional(),
  photoMediaRefs: z.array(offlineMediaRefSchema).optional(),
});

export const offlineJobTypeSchema = z.enum([
  "incident:create",
  "shift:start",
  "shift:close",
  "fuel:create",
  "dvir:create",
  "maintenance:note",
  "scan:log",
]);

export const offlineJobStatusSchema = z.enum([
  "pending",
  "syncing",
  "succeeded",
  "failed",
  "conflict",
]);

export const OFFLINE_SCHEMA_VERSION = OFFLINE_QUEUE_SCHEMA_VERSION;
