import { useMutation } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { FeedbackNpsTrigger } from "@/repositories/feedback.repository";
import { FeedbackRepository } from "@/repositories/feedback.repository";
import { FeedbackService } from "@/services/feedback.service";

export interface SubmitFeedbackPayload {
  message: string;
  rating: 1 | 2 | 3 | 4 | 5;
  npsTrigger?: FeedbackNpsTrigger | null;
  entityId?: string | null;
  entityType?: "vehicle" | "maintenance" | "alert" | null;
}

const feedbackRepository = new FeedbackRepository();
const feedbackService = new FeedbackService(feedbackRepository);

export function useSubmitFeedback(options?: { suppressSuccessToast?: boolean }) {
  const { user, userFleetId } = useAuth();
  const suppressSuccessToast = options?.suppressSuccessToast ?? false;

  return useMutation({
    mutationFn: async (payload: SubmitFeedbackPayload) => {
      await feedbackService.submitFeedback({
        fleetId: userFleetId ?? "",
        userId: user?.id ?? "",
        message: payload.message,
        rating: payload.rating,
        npsTrigger: payload.npsTrigger,
        entityId: payload.entityId,
        entityType: payload.entityType,
      });
    },
    onSuccess: () => {
      if (suppressSuccessToast) return;
      toast({
        title: "Feedback envoyé",
        description: "Merci pour votre retour.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Envoi impossible",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
