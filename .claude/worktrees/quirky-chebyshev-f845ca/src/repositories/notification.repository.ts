import { supabase } from "@/integrations/supabase/client";

export type NotificationPlatform = "web" | "ios" | "android";

export interface UpsertNotificationTokenInput {
  userId: string;
  token: string;
  platform: NotificationPlatform;
  deviceInfo?: Record<string, unknown>;
}

export class NotificationRepository {
  async upsertToken(input: UpsertNotificationTokenInput): Promise<void> {
    const { userId, token, platform, deviceInfo } = input;

    const { error } = await supabase.from("notification_tokens").upsert(
      {
        user_id: userId,
        token,
        platform,
        device_info: deviceInfo ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );

    if (error) {
      console.error("Error upserting notification token:", error);
      throw new Error(error.message);
    }
  }

  async disableToken(token: string): Promise<void> {
    const { error } = await supabase
      .from("notification_tokens")
      .delete()
      .eq("token", token);

    if (error) {
      console.error("Error disabling notification token:", error);
      throw new Error(error.message);
    }
  }
}

