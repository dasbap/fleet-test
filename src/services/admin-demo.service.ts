import { AdminDemoRepository } from "@/repositories/admin-demo.repository";
import type {
  DemoAccountType,
  DemoSession,
} from "@/repositories/admin-demo.repository";
import { AdminDemoBffRepository } from "@/repositories/admin-demo-bff.repository";

export type {
  DemoAccountType,
  DemoRole,
  DemoSession,
} from "@/repositories/admin-demo.repository";

export interface CreateDemoPayload {
  email: string;
  full_name?: string;
  company_name?: string;
  phone?: string;
  company_identifier?: string;
  country_code?: string;
  account_type: DemoAccountType;
  trial_days: number;
  label?: string;
  send_email: boolean;
  permanent_access?: boolean;
}

export interface CreateDemoAccessResult {
  ok: boolean;
  user_id?: string;
  magic_url?: string;
  error?: string;
}

export interface AdminDemoDashboardData {
  sessions: DemoSession[];
}

export const MAX_DEMO_TRIAL_DAYS = 31;
export const MAX_DEMO_EXTENSION_HOURS = MAX_DEMO_TRIAL_DAYS * 24;

function formatCreateAccessError(error: string | undefined): string {
  if (error === "bff_route_unavailable") {
    return "Route admin indisponible en local. Lance npm run dev:local ou active le proxy BFF.";
  }
  return error ?? "creation_echouee";
}

export class AdminDemoService {
  constructor(
    private repository: AdminDemoRepository,
    private bffRepository: AdminDemoBffRepository
  ) {}

  async loadDashboardData(): Promise<AdminDemoDashboardData> {
    const sessions = await this.repository.listSessions(false);
    return { sessions };
  }

  async createAccess(
    accessToken: string | null | undefined,
    payload: CreateDemoPayload
  ): Promise<CreateDemoAccessResult> {
    if (!accessToken) return { ok: false, error: "session_expirée" };

    const email = payload.email.trim().toLowerCase();
    const fullName = payload.full_name?.trim() ?? "";
    const companyName = payload.company_name?.trim() ?? "";
    const phone = payload.phone?.trim() ?? "";
    const companyIdentifier = payload.company_identifier?.trim() ?? "";
    const countryCode = payload.country_code?.trim().toUpperCase() ?? "";

    if (!email) return { ok: false, error: "email_requis" };
    if (!fullName) return { ok: false, error: "nom_complet_requis" };
    if (!companyName) return { ok: false, error: "entreprise_requise" };
    if (!phone) return { ok: false, error: "telephone_requis" };
    if (!companyIdentifier) return { ok: false, error: "identifiant_entreprise_requis" };
    if (!/^[A-Z]{2}$/.test(countryCode)) return { ok: false, error: "code_pays_invalide" };
    if (payload.trial_days > MAX_DEMO_TRIAL_DAYS) return { ok: false, error: "duree_demo_max_31_jours" };

    try {
      const prospectData = await this.bffRepository.createProspect(accessToken, {
        email,
        full_name: fullName,
        company_name: companyName,
        phone,
        company_identifier: companyIdentifier,
        country_code: countryCode,
        account_type: payload.account_type,
        trial_days: payload.trial_days,
        send_email: payload.send_email,
        permanent_access: payload.permanent_access,
      });

      if (prospectData.rateLimited) return { ok: false, error: "Limite de créations atteinte (10/heure). Réessaie dans une heure." };
      if (!prospectData.ok || !prospectData.user_id) return { ok: false, error: formatCreateAccessError(prospectData.error) };

      const linkData = await this.bffRepository.generateMagicLink(accessToken, {
        user_id: prospectData.user_id,
        fleet_id: prospectData.fleet_id ?? null,
        email,
        label: payload.label,
      });
      if (linkData.rateLimited) return { ok: false, error: "Limite de génération de liens atteinte." };
      return { ok: true, user_id: prospectData.user_id, magic_url: linkData.magic_url };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  async suspendAccount(userId: string, adminId: string): Promise<boolean> {
    if (!userId || !adminId) throw new Error("Identifiants utilisateur requis");
    const result = await this.repository.deactivateAccount(userId, adminId, "suspension manuelle depuis admin UI");
    return result.ok;
  }

  async reactivateAccount(userId: string, adminId: string, extendHours?: number): Promise<boolean> {
    if (!userId || !adminId) throw new Error("Identifiants utilisateur requis");
    if (extendHours !== undefined && extendHours > MAX_DEMO_EXTENSION_HOURS) throw new Error("Une demo ne peut pas depasser un mois depuis sa creation");
    const result = await this.repository.reactivateAccount(userId, adminId, extendHours ?? null);
    return result.ok;
  }

  async updateAccountExpiration(userId: string, adminId: string, expiresAt: string | null): Promise<{ ok: boolean; expires_at?: string; max_expires_at?: string }> {
    if (!userId || !adminId) throw new Error("Identifiants utilisateur requis");
    if (expiresAt !== null && Number.isNaN(new Date(expiresAt).getTime())) throw new Error("Date d'expiration invalide");
    const result = await this.repository.updateAccountExpiration(userId, adminId, expiresAt);
    return { ok: result.ok, expires_at: result.expires_at, max_expires_at: result.max_expires_at };
  }

  async deleteAccount(userId: string, adminId: string): Promise<{ ok: boolean }> {
    if (!userId || !adminId) throw new Error("Identifiants utilisateur requis");
    const result = await this.repository.deleteAccount(userId, adminId, "suppression manuelle depuis admin UI");
    return { ok: result.ok };
  }

  async resetFleet(fleetId: string): Promise<{ ok: boolean; vehiclesDeleted: number }> {
    if (!fleetId) throw new Error("L'identifiant de flotte est requis");
    const result = await this.repository.resetDemoFleet(fleetId);
    return { ok: result.ok, vehiclesDeleted: result.vehicles_deleted ?? 0 };
  }

  async setFleetPlan(fleetId: string, adminId: string, planCode: string): Promise<{ ok: boolean; plan_code?: string }> {
    if (!fleetId || !adminId || !planCode) throw new Error("Identifiants flotte, admin et plan requis");
    const result = await this.repository.setFleetPlan(fleetId, adminId, planCode);
    return { ok: result.ok, plan_code: result.plan_code };
  }

  async generateMagicLink(accessToken: string | null | undefined, userId: string, email: string, fleetId?: string | null, label?: string): Promise<string | null> {
    if (!accessToken || !userId || !email) return null;
    try {
      const data = await this.bffRepository.generateMagicLink(accessToken, { user_id: userId, fleet_id: fleetId ?? null, email: email.trim(), label });
      if (data.rateLimited || !data.ok) return null;
      return data.magic_url ?? null;
    } catch {
      return null;
    }
  }
}
