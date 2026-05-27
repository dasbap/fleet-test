import { supabase } from "@/integrations/supabase/client";

export interface TutorialProgressRow {
  user_id: string;
  tutorial_id: string;
  fleet_id: string | null;
  position_sec: number;
  completed_at: string | null;
  updated_at: string;
}

export class TutorialProgressRepository {
  async findProgressForUser(
    userId: string,
    tutorialIds: string[],
  ): Promise<Record<string, TutorialProgressRow>> {
    if (tutorialIds.length === 0) return {};

    const { data, error } = await supabase
      .from("tutorial_progress")
      .select("user_id, tutorial_id, fleet_id, position_sec, completed_at, updated_at")
      .eq("user_id", userId)
      .in("tutorial_id", tutorialIds);

    if (error) {
      console.error("Error fetching tutorial progress:", error);
      throw new Error("Impossible de charger la progression des tutoriels.");
    }

    const map: Record<string, TutorialProgressRow> = {};
    for (const row of data ?? []) {
      map[row.tutorial_id] = row as TutorialProgressRow;
    }
    return map;
  }

  async upsertProgress(params: {
    userId: string;
    tutorialId: string;
    fleetId: string | null;
    positionSec: number;
    completed: boolean;
  }): Promise<void> {
    const { error } = await supabase.from("tutorial_progress").upsert(
      {
        user_id: params.userId,
        tutorial_id: params.tutorialId,
        fleet_id: params.fleetId,
        position_sec: Math.max(0, Math.floor(params.positionSec)),
        completed_at: params.completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,tutorial_id" },
    );

    if (error) {
      console.error("Error upserting tutorial progress:", error);
      throw new Error("Impossible d'enregistrer la progression.");
    }
  }

  async listFavoriteIds(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("tutorial_favorites")
      .select("tutorial_id")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching tutorial favorites:", error);
      return [];
    }

    return (data ?? []).map((row) => row.tutorial_id as string);
  }

  async setFavorite(userId: string, tutorialId: string, value: boolean): Promise<void> {
    if (!value) {
      const { error } = await supabase
        .from("tutorial_favorites")
        .delete()
        .eq("user_id", userId)
        .eq("tutorial_id", tutorialId);
      if (error) {
        console.error("Error removing tutorial favorite:", error);
        throw new Error("Impossible de retirer le favori.");
      }
      return;
    }

    const { error } = await supabase.from("tutorial_favorites").upsert(
      {
        user_id: userId,
        tutorial_id: tutorialId,
      },
      { onConflict: "user_id,tutorial_id" },
    );

    if (error) {
      console.error("Error setting tutorial favorite:", error);
      throw new Error("Impossible d'ajouter le favori.");
    }
  }

  async recordView(params: {
    userId: string;
    tutorialId: string;
    fleetId: string | null;
    source: "online" | "offline";
    watchedSec: number;
  }): Promise<void> {
    const { error } = await supabase.from("tutorial_views").insert({
      user_id: params.userId,
      tutorial_id: params.tutorialId,
      fleet_id: params.fleetId,
      source: params.source,
      watched_sec: Math.max(0, Math.floor(params.watchedSec)),
    });

    if (error) {
      console.error("Error recording tutorial view:", error);
    }
  }
}
