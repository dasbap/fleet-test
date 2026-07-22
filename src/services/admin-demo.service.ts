import { AdminDemoRepository } from "@/repositories/admin-demo.repository";
import type { DemoAccountType, DemoFleet, DemoSession } from "@/repositories/admin-demo.repository";
import { AdminDemoBffRepository } from "@/repositories/admin-demo-bff.repository";

export type { DemoAccountType, DemoRole, DemoFleet, DemoSession } from "@/repositories/admin-demo.repository";

export interface CreateDemoPayload {
  email: string;
  company_name?: string;
  account_type: DemoAccountType;
  fleet_id?: string;
  trial_days: number;
  label?: string;
  send_email: boolean;
}

export interface CreateDemoAccessResult {
  ok: boolean;
  magic_url?: string;
  error?: string;
}

export interface AdminDemoDashboardData {
  sessions: DemoSession[];
  demoFleets: DemoFleet[];
}

export const MAX_DEMO_TRIAL_DAYS = 31;
export const MAX_DEMO_EXTENSION_HOURS = MAX_DEMO_TRIAL_DAYS * 24;

/**
 * Logique métier administration des comptes démo.
 */
export class AdminDemoService {
  constructor(
    private repository: AdminDemoRepository,
    private bffRepository: AdminDemoBffRepository,
  ) {}

  async loadDashboardData(): Promise<AdminDemoDashboardData> {
    const [sessions, demoFleets] = await Promise.all([
      this.repository.listSessions(false),
      this.repository.listDemoFleets(),
    ]);
    return { sessions, demoFleets };
  }

  async createAccess(
    accessToken: string | null | undefined,
    payload: CreateDemoPayload,
  ): Promise<CreateDemoAccessResult> {
    if (!accessToken) {
      return { ok: false, error: "session_expirée" };
    }

    const email = payload.email.trim();
    if (!email) {
      return { ok: false, error: "email_requis" };
    }

    if (payload.trial_days > MAX_DEMO_TRIAL_DAYS) {
      return { ok: false, error: "duree_demo_max_31_jours" };
    }

    try {
      const prospectData = await this.bffRepository.createProspect(accessToken, {
        email,
        account_type: payload.account_type,
        company_name: payload.company_name,
        fleet_id: payload.fleet_id,
        trial_days: payload.trial_days,
        send_email: payload.send_email,
      });

      if (prospectData.rateLimited) {
        return {
          ok: false,
          error: "Limite de créations atteinte (10/heure). Réessaie dans une heure.",
        };
      }

      if (!prospectData.ok || !prospectData.user_id) {
        return { ok: false, error: prospectData.error ?? "creation_echouee" };
      }

      const linkData = await this.bffRepository.generateMagicLink(accessToken, {
        user_id: prospectData.user_id,
        fleet_id: prospectData.fleet_id ?? payload.fleet_id,
        email,
        label: payload.label,
      });

      if (linkData.rateLimited) {
        return { ok: false, error: "Limite de génération de liens atteinte." };
      }

      return { ok: true, magic_url: linkData.magic_url };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  async suspendAccount(userId: string, adminId: string): Promise<boolean> {
    if (!userId || !adminId) {
      throw new Error("Identifiants utilisateur requis");
    }

    const result = await this.repository.deactivateAccount(
      userId,
      adminId,
      "suspension manuelle depuis admin UI",
    );
    return result.ok;
  }

  async reactivateAccount(userId: string, adminId: string, extendHours?: number): Promise<boolean> {
    if (!userId || !adminId) {
      throw new Error("Identifiants utilisateur requis");
    }

    if (extendHours !== undefined && extendHours > MAX_DEMO_EXTENSION_HOURS) {
      throw new Error("Une demo ne peut pas depasser un mois depuis sa creation");
    }

    const result = await this.repository.reactivateAccount(userId, adminId, extendHours ?? null);
    return result.ok;
  }

  async resetFleet(fleetId: string): Promise<{ ok: boolean; vehiclesDeleted: number }> {
    if (!fleetId) {
      throw new Error("L'identifiant de flotte est requis");
    }

    const result = await this.repository.resetDemoFleet(fleetId);
    return {
      ok: result.ok,
      vehiclesDeleted: result.vehicles_deleted ?? 0,
    };
  }

  async generateMagicLink(
    accessToken: string | null | undefined,
    userId: string,
    email: string,
    fleetId: string,
    label?: string,
  ): Promise<string | null> {
    if (!accessToken || !userId || !email || !fleetId) {
      return null;
    }

    try {
      const data = await this.bffRepository.generateMagicLink(accessToken, {
        user_id: userId,
        fleet_id: fleetId,
        email: email.trim(),
        label,
      });

      if (data.rateLimited || !data.ok) {
        return null;
      }

      return data.magic_url ?? null;
    } catch {
      return null;
    }
  }
}
