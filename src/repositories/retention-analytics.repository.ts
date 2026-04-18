import { supabase } from "@/integrations/supabase/client";
import type {
  CohortRow,
  DauRow,
  FunnelRow,
  RetentionKpis,
} from "@/types/retention-analytics";

const FUNNEL_ROLE_ORDER = ["driver", "organizer", "manager", "mechanic"] as const;

/**
 * Lecture des vues analytics rétention (filtrage `org_id` côté client).
 */
export class RetentionAnalyticsRepository {
  async getKpis(orgId: string): Promise<RetentionKpis | null> {
    const { data, error } = await supabase
      .from("v_retention_kpis")
      .select("*")
      .eq("org_id", orgId)
      .maybeSingle();

    if (error) {
      console.error("v_retention_kpis:", error);
      throw new Error(error.message);
    }
    return data as RetentionKpis | null;
  }

  async getCohorts(orgId: string, limit = 12): Promise<CohortRow[]> {
    const { data, error } = await supabase
      .from("v_retention_cohorts")
      .select("*")
      .eq("org_id", orgId)
      .order("cohort_week", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("v_retention_cohorts:", error);
      throw new Error(error.message);
    }
    return (data ?? []) as CohortRow[];
  }

  async getDau(orgId: string): Promise<DauRow[]> {
    const { data, error } = await supabase
      .from("v_daily_active_users")
      .select("*")
      .eq("org_id", orgId)
      .order("day", { ascending: true });

    if (error) {
      console.error("v_daily_active_users:", error);
      throw new Error(error.message);
    }
    return (data ?? []) as DauRow[];
  }

  async getFunnel(orgId: string): Promise<FunnelRow[]> {
    const { data, error } = await supabase
      .from("v_activation_funnel")
      .select("*")
      .eq("org_id", orgId)
      .order("role", { ascending: true });

    if (error) {
      console.error("v_activation_funnel:", error);
      throw new Error(error.message);
    }
    const rows = (data ?? []) as FunnelRow[];
    return [...rows].sort(
      (a, b) =>
        FUNNEL_ROLE_ORDER.indexOf(a.role as (typeof FUNNEL_ROLE_ORDER)[number]) -
        FUNNEL_ROLE_ORDER.indexOf(b.role as (typeof FUNNEL_ROLE_ORDER)[number]),
    );
  }
}
