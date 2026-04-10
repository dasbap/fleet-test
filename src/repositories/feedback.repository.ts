import { supabase } from "@/integrations/supabase/client";

export interface FeedbackInsert {
  fleet_id: string;
  user_id: string;
  message: string;
  rating: 1 | 2 | 3 | 4 | 5;
}

export class FeedbackRepository {
  async create(payload: FeedbackInsert): Promise<void> {
    const { error } = await supabase.from("feedback").insert({
      fleet_id: payload.fleet_id,
      user_id: payload.user_id,
      message: payload.message,
      rating: payload.rating,
    });

    if (error) {
      console.error("Error creating feedback:", error);
      throw new Error(error.message);
    }
  }
}
