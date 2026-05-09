import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { FailurePredictionRepository } from "@/repositories/failure-prediction.repository";
import { FailurePredictionService } from "@/services/failure-prediction.service";

const failurePredictionRepository = new FailurePredictionRepository();
const failurePredictionService = new FailurePredictionService(failurePredictionRepository);

export function useFailurePrediction(vehicleId?: string) {
  const { userFleetId } = useAuth();

  return useQuery({
    queryKey: ["failure-prediction", userFleetId, vehicleId],
    queryFn: () => failurePredictionService.getFailureRiskPredictions(userFleetId!, vehicleId),
    enabled: !!userFleetId,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useFailurePredictionHealthcheck() {
  const { userFleetId } = useAuth();

  return useMutation({
    mutationFn: async (recipientPhone?: string) => {
      if (!userFleetId) {
        throw new Error("Aucune flotte active");
      }
      return failurePredictionService.sendHealthcheckMessageIfConfigured(userFleetId, recipientPhone);
    },
    onSuccess: (result) => {
      if (result === "sent") {
        toast({
          title: "Module IA validé",
          description: "Message de confirmation envoyé: tout fonctionne.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Vérification IA échouée",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
