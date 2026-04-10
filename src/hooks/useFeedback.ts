import { useMutation } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { FeedbackRepository } from "@/repositories/feedback.repository";
import { FeedbackService } from "@/services/feedback.service";

export interface SubmitFeedbackPayload {
  message: string;
  rating: 1 | 2 | 3 | 4 | 5;
}

const feedbackRepository = new FeedbackRepository();
const feedbackService = new FeedbackService(feedbackRepository);

export function useSubmitFeedback() {
  const { user, userFleetId } = useAuth();

  return useMutation({
    mutationFn: async (payload: SubmitFeedbackPayload) => {
      await feedbackService.submitFeedback({
        fleetId: userFleetId ?? "",
        userId: user?.id ?? "",
        message: payload.message,
        rating: payload.rating,
      });
    },
    onSuccess: () => {
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
