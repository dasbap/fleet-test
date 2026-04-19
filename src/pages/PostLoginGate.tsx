import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuthFlow } from "@/hooks/useAuthFlow";

/**
 * PostLoginGate — aiguillage post-connexion (voir `useAuthFlow` / `computeAuthFlowDecision`).
 * Accueil « première connexion » : porté par la redirection vers `/onboarding` lorsque
 * `detectFirstLogin` / onboarding incomplet le requiert — pas un message séparé sur l’écran de login.
 */
export default function PostLoginGate() {
  const navigate = useNavigate();
  const { decision, isReady } = useAuthFlow();

  useEffect(() => {
    if (!isReady || !decision) return;
    navigate(decision.path, { replace: true });
  }, [isReady, decision, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Chargement de votre espace…</p>
      </div>
    </div>
  );
}
