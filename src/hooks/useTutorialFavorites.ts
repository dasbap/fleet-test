import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { tutorialProgressService } from "@/hooks/useTutorials";
import { tutorialOfflineService } from "@/services/tutorial-offline.service";
import { isNativePlatform } from "@/lib/platform";

export function useToggleTutorialFavorite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { tutorialId: string; value: boolean }) => {
      if (isNativePlatform()) {
        await tutorialOfflineService.setFavorite(params.tutorialId, params.value);
      }
      if (!user?.id) return;
      const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
      await tutorialProgressService.setFavorite({
        userId: user.id,
        tutorialId: params.tutorialId,
        value: params.value,
        isOnline,
      });
    },
    onSuccess: (_, params) => {
      void queryClient.invalidateQueries({ queryKey: ["tutorials"] });
      toast({
        title: params.value ? "Ajouté aux favoris" : "Retiré des favoris",
        description: params.value
          ? "Ce tutoriel est prioritaire pour la conservation hors ligne."
          : "Ce tutoriel n'est plus prioritaire.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le favori.",
        variant: "destructive",
      });
    },
  });
}
