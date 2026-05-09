import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useNotificationUserContext, useRegisterNotificationToken } from "@/hooks/useNotifications";
import { getCapacitorPlatform, isNativePlatform } from "@/lib/platform";
import { notificationsClientService } from "@/services/push-notifications-client.service";

const STORAGE_PREFIX = "esamba.notifications.prompted.v1";

function getStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function NotificationsPermissionGate() {
  const { userId } = useNotificationUserContext();
  const { mutateAsync: registerToken, isPending } = useRegisterNotificationToken();
  const [visible, setVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const platform = useMemo(() => {
    if (!isNativePlatform()) return "web";
    const current = getCapacitorPlatform();
    if (current === "ios") return "ios";
    if (current === "android") return "android";
    return "web";
  }, []);

  useEffect(() => {
    if (!userId || typeof window === "undefined") {
      setVisible(false);
      return;
    }

    const prompted = window.localStorage.getItem(getStorageKey(userId));
    setVisible(prompted !== "true");
  }, [userId]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupForegroundHandler = async () => {
      try {
        unlisten = await notificationsClientService.subscribeToForegroundMessages((payload) => {
          const title = payload.notification?.title || "Nouvelle notification";
          const body = payload.notification?.body || "Un nouvel événement est disponible.";
          toast({
            title,
            description: body,
          });
        });
      } catch {
        // Le navigateur peut ne pas supporter le foreground handler.
      }
    };

    void setupForegroundHandler();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleEnableNotifications = async () => {
    if (!userId) {
      toast({
        title: "Session requise",
        description: "Connectez-vous pour activer les notifications.",
        variant: "destructive",
      });
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(getStorageKey(userId), "true");
    }

    try {
      const token = await notificationsClientService.requestPermissionAndGetToken({
        platform,
      });

      if (!token) {
        setVisible(false);
        setStatusMessage("Permission refusée. Vous pouvez réactiver plus tard depuis les réglages.");
        toast({
          title: "Notifications non activées",
          description: "Vous avez refusé la permission de notifications.",
        });
        return;
      }

      await registerToken({
        userId,
        token,
        platform,
        deviceInfo: {
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        },
      });

      setVisible(false);
      setStatusMessage("Notifications activées sur cet appareil.");
      toast({
        title: "Notifications activées",
        description: "Votre appareil est maintenant enregistré pour recevoir les alertes.",
      });
    } catch (error) {
      toast({
        title: "Erreur notifications",
        description:
          error instanceof Error
            ? error.message
            : "Impossible d'activer les notifications pour le moment.",
        variant: "destructive",
      });
    }
  };

  if (!visible && !statusMessage) return null;

  return (
    <Card className="mb-4 border-border/70 bg-card/90 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {visible ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          Notifications push
        </CardTitle>
        <CardDescription>
          {visible
            ? "Activez les notifications pour recevoir les alertes incidents, missions et opérations."
            : statusMessage}
        </CardDescription>
      </CardHeader>
      {visible ? (
        <CardContent className="pt-0">
          <Button onClick={handleEnableNotifications} disabled={isPending} className="w-full sm:w-auto">
            {isPending ? "Activation..." : "Activer les notifications"}
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}

