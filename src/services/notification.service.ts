import { z } from "zod";
import {
  NotificationRepository,
  type NotificationPlatform,
  type UpsertNotificationTokenInput,
} from "@/repositories/notification.repository";

const registerTokenSchema = z.object({
  userId: z.string().uuid("Identifiant utilisateur invalide."),
  token: z.string().min(8, "Token de notification invalide."),
  platform: z.enum(["web", "ios", "android"]),
  deviceInfo: z.record(z.unknown()).optional(),
});

export interface RegisterNotificationTokenInput {
  userId: string;
  token: string;
  platform: NotificationPlatform;
  deviceInfo?: Record<string, unknown>;
}

export class NotificationService {
  constructor(private repository: NotificationRepository) {}

  async registerDeviceToken(input: RegisterNotificationTokenInput): Promise<void> {
    const parsed = registerTokenSchema.safeParse(input);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Données de notification invalides.";
      throw new Error(message);
    }

    const normalized: UpsertNotificationTokenInput = {
      userId: parsed.data.userId,
      token: parsed.data.token.trim(),
      platform: parsed.data.platform,
      deviceInfo: parsed.data.deviceInfo,
    };

    await this.repository.upsertToken(normalized);
  }

  async disableDeviceToken(token: string): Promise<void> {
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      throw new Error("Token de notification requis.");
    }
    await this.repository.disableToken(normalizedToken);
  }
}

