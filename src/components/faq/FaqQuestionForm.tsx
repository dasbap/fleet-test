import { useState } from "react";
import { Link } from "react-router-dom";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthOptional } from "@/hooks/useAuth";
import { useSubmitFaqQuestion } from "@/hooks/useFaqQuestions";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { ROUTE_PATHS } from "@/navigation/routePaths";

export function FaqQuestionForm() {
  const auth = useAuthOptional();
  const user = auth?.user ?? null;
  const { isAdmin, isSuperAdmin, isLoading: isRoleLoading } = useRoleAccess();
  const [question, setQuestion] = useState("");
  const submitQuestion = useSubmitFaqQuestion();

  if (!user) {
    return (
      <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
        <p>Connectez-vous pour poser une question a l'equipe E-Samba.</p>
        <Button asChild className="mt-3">
          <Link to={ROUTE_PATHS.auth}>Connexion</Link>
        </Button>
      </div>
    );
  }

  if (isRoleLoading) {
    return (
      <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
        Verification des droits...
      </div>
    );
  }

  if (isAdmin || isSuperAdmin) {
    return (
      <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
        <p>Les admins repondent aux questions depuis le module admin.</p>
        <Button asChild className="mt-3" variant="outline">
          <Link to={ROUTE_PATHS.dashboardAdminFaq}>Ouvrir le module FAQ admin</Link>
        </Button>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;
    await submitQuestion.mutateAsync({ question: trimmed });
    setQuestion("");
  }

  return (
    <form
      className="rounded-lg border p-4"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <label htmlFor="faq-user-question" className="text-sm font-medium">
        Poser une question
      </label>
      <Textarea
        id="faq-user-question"
        className="mt-2"
        rows={4}
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Ecrivez ici..."
      />
      <Button
        type="submit"
        className="mt-3"
        disabled={submitQuestion.isPending || question.trim().length < 8}
      >
        <Send className="mr-2 h-4 w-4" aria-hidden />
        {submitQuestion.isPending ? "Envoi..." : "Envoyer la question"}
      </Button>
    </form>
  );
}
