import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { FaqQuestionRepository } from "@/repositories/faq-question.repository";
import { FaqQuestionService } from "@/services/faq-question.service";

const faqQuestionService = new FaqQuestionService(new FaqQuestionRepository());

export function useSubmitFaqQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      question: string;
      parentQuestionId?: string | null;
    }) =>
      faqQuestionService.submitQuestion(
        payload.question,
        payload.parentQuestionId
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faq-questions"] });
      toast({
        title: "Question envoyee",
        description: "Un admin y repondra prochainement.",
      });
    },
    onError: (error) => {
      toast({
        title: "Question non envoyee",
        description:
          error instanceof Error
            ? error.message
            : "Connectez-vous pour poser une question.",
        variant: "destructive",
      });
    },
  });
}

export function useAdminFaqQuestions(includeAnswered = false) {
  return useQuery({
    queryKey: ["admin-faq-questions", includeAnswered],
    queryFn: () => faqQuestionService.listForAdmin(includeAnswered),
    staleTime: 30_000,
  });
}

export function useAnswerFaqQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { questionId: string; answer: string }) =>
      faqQuestionService.answerQuestion(payload.questionId, payload.answer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faq-questions"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["alerts-list"] });
      toast({
        title: "Reponse envoyee",
        description:
          "L'utilisateur verra la question et la reponse dans ses alertes.",
      });
    },
    onError: (error) => {
      toast({
        title: "Reponse non envoyee",
        description:
          error instanceof Error ? error.message : "Impossible de repondre.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteFaqQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { questionId: string }) =>
      faqQuestionService.deleteQuestion(payload.questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faq-questions"] });
      toast({
        title: "Question supprimee",
        description: "La question FAQ utilisateur a ete retiree.",
      });
    },
    onError: (error) => {
      toast({
        title: "Suppression impossible",
        description:
          error instanceof Error ? error.message : "Impossible de supprimer cette question.",
        variant: "destructive",
      });
    },
  });
}
