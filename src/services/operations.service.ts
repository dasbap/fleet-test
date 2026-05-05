import { OperationsRepository } from "@/repositories/operations.repository";
import {
  getMechanicDaySummary,
  type OrganizerOperationsMock,
  type ManagerOperationsMock,
  type MockDriverDay,
  type MechanicOperationsMock,
  type MockMechanicIntervention,
} from "@/features/operations/mocks/operationsMock";
import {
  organizerOperationsMockSnapshot,
  managerOperationsMockSnapshot,
  driverOperationsMockSnapshot,
  mechanicOperationsMockSnapshot,
} from "@/features/operations/mocks/operationsMockSnapshots";

export type MechanicOperationsPayload = {
  interventionsToday: MockMechanicIntervention[];
  summary: ReturnType<typeof getMechanicDaySummary>;
};

function isOperationsMockEnabled(): boolean {
  if (import.meta.env.PROD) return false;
  return import.meta.env.VITE_OPERATIONS_MOCK === "true";
}

/**
 * Logique métier des écrans Opérations (pas d’appel Supabase direct).
 * Données démo : définir `VITE_OPERATIONS_MOCK=true` dans `.env` (voir snapshots).
 */
export class OperationsService {
  constructor(private repository: OperationsRepository) {}

  async getOrganizerOperations(fleetId: string | null): Promise<OrganizerOperationsMock> {
    if (!fleetId?.trim()) {
      throw new Error("Identifiant de flotte requis");
    }
    if (isOperationsMockEnabled()) {
      return organizerOperationsMockSnapshot;
    }
    return this.repository.fetchOrganizerSnapshot(fleetId);
  }

  async getManagerOperations(fleetId: string | null): Promise<ManagerOperationsMock> {
    if (!fleetId?.trim()) {
      throw new Error("Identifiant de flotte requis");
    }
    if (isOperationsMockEnabled()) {
      return managerOperationsMockSnapshot;
    }
    return this.repository.fetchManagerSnapshot(fleetId);
  }

  async getDriverOperations(userId: string | null): Promise<MockDriverDay> {
    if (!userId?.trim()) {
      throw new Error("Utilisateur non identifié");
    }
    if (isOperationsMockEnabled()) {
      return driverOperationsMockSnapshot;
    }
    return this.repository.fetchDriverDay(userId);
  }

  async getMechanicOperations(fleetId: string | null): Promise<MechanicOperationsPayload> {
    if (!fleetId?.trim()) {
      throw new Error("Identifiant de flotte requis");
    }
    if (isOperationsMockEnabled()) {
      const data: MechanicOperationsMock = mechanicOperationsMockSnapshot;
      return {
        interventionsToday: data.interventionsToday,
        summary: getMechanicDaySummary(data.interventionsToday),
      };
    }
    const data: MechanicOperationsMock = await this.repository.fetchMechanicDay(fleetId);
    return {
      interventionsToday: data.interventionsToday,
      summary: getMechanicDaySummary(data.interventionsToday),
    };
  }
}
