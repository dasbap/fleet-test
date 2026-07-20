import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  WhatsappMonitoringService,
  type WhatsappMonitoringData,
} from "@/services/whatsapp-monitoring.service";
import { WhatsappMonitoringRepository } from "@/repositories/whatsapp-monitoring.repository";
import { shouldRefetchOnWindowFocus } from "@/lib/query/refetchPolicy";

const whatsappMonitoringRepository = new WhatsappMonitoringRepository();
const whatsappMonitoringService = new WhatsappMonitoringService(whatsappMonitoringRepository);

const refetchIntervalWhenVisible = (visibleMs: number, hiddenMs = visibleMs * 3) => {
  if (typeof document === "undefined") return visibleMs;
  return document.visibilityState === "hidden" ? hiddenMs : visibleMs;
};

export function useWhatsappMonitoring() {
  const { userFleetId } = useAuth();

  return useQuery({
    queryKey: ["whatsapp-monitoring", userFleetId],
    queryFn: async (): Promise<WhatsappMonitoringData> => {
      return whatsappMonitoringService.getMonitoringData(userFleetId ?? "");
    },
    enabled: !!userFleetId,
    refetchInterval: () => refetchIntervalWhenVisible(60_000, 180_000),
    staleTime: 45_000,
    refetchOnWindowFocus: shouldRefetchOnWindowFocus(),
  });
}
