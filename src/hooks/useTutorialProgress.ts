import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { tutorialProgressService } from "@/hooks/useTutorials";
import { analytics } from "@/lib/analytics";

export function useSaveTutorialProgress() {
  const { user } = useAuth();
  const { userFleetId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      tutorialId: string;
      positionSec: number;
      completed: boolean;
    }) => {
      if (!user?.id) {
        throw new Error("Connectez-vous pour enregistrer votre progression.");
      }
      const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
      await tutorialProgressService.saveProgress({
        userId: user.id,
        tutorialId: params.tutorialId,
        fleetId: userFleetId ?? null,
        positionSec: params.positionSec,
        completed: params.completed,
        isOnline,
      });
      if (params.completed) {
        analytics.tutorialCompleted(params.tutorialId);
      }
    },
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["tutorials"] });
      void queryClient.invalidateQueries({ queryKey: ["tutorials", vars.tutorialId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Progression non enregistrée",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useRecordTutorialView() {
  const { user } = useAuth();
  const { userFleetId } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      tutorialId: string;
      source: "online" | "offline";
      watchedSec: number;
    }) => {
      if (!user?.id) return;
      const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
      analytics.tutorialViewed(params.tutorialId, params.source, params.watchedSec);
      await tutorialProgressService.recordView({
        userId: user.id,
        tutorialId: params.tutorialId,
        fleetId: userFleetId ?? null,
        source: params.source,
        watchedSec: params.watchedSec,
        isOnline,
      });
    },
  });
}

export function useFlushTutorialSync() {
  const { user } = useAuth();
  const { userFleetId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return 0;
      return tutorialProgressService.flushSyncQueue(user.id, userFleetId ?? null);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tutorials"] });
    },
  });
}
