import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { NotificationRepository, type NotificationPlatform } from "@/repositories/notification.repository";
import { NotificationService } from "@/services/notification.service";

const notificationRepository = new NotificationRepository();
const notificationService = new NotificationService(notificationRepository);

export interface RegisterNotificationTokenPayload {
  userId: string;
  token: string;
  platform: NotificationPlatform;
  deviceInfo?: Record<string, unknown>;
}

export function useRegisterNotificationToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RegisterNotificationTokenPayload) =>
      notificationService.registerDeviceToken(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-tokens"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Notifications indisponibles",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useNotificationUserContext() {
  const { user } = useAuth();

  return useMemo(
    () => ({
      userId: user?.id ?? null,
      email: user?.email ?? null,
    }),
    [user?.email, user?.id],
  );
}

