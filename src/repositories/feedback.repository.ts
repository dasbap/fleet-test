import { supabase } from "@/integrations/supabase/client";

/** Valeurs alignées sur le widget NPS et la colonne `nps_trigger`. */
export type FeedbackNpsTrigger =
  | "alert_resolved"
  | "maintenance_closed"
  | "first_month"
  | "manual";

export interface FeedbackInsert {
  fleet_id: string;
  user_id: string;
  message: string;
  rating: 1 | 2 | 3 | 4 | 5;
  nps_trigger?: FeedbackNpsTrigger | null;
  entity_id?: string | null;
  entity_type?: "vehicle" | "maintenance" | "alert" | null;
}

export class FeedbackRepository {
  async create(payload: FeedbackInsert): Promise<void> {
    const { error } = await supabase.from("feedback").insert({
      fleet_id: payload.fleet_id,
      user_id: payload.user_id,
      message: payload.message,
      rating: payload.rating,
      nps_trigger: payload.nps_trigger ?? null,
      entity_id: payload.entity_id ?? null,
      entity_type: payload.entity_type ?? null,
    });

    if (error) {
      console.error("Error creating feedback:", error);
      throw new Error(error.message);
    }
  }
}
