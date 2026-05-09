import { AlertCircle } from "lucide-react";

interface OperationsQueryMessageProps {
  variant: "no-fleet" | "error";
  message?: string;
}

/** États hors données : pas de flotte ou erreur métier / réseau. */
export function OperationsQueryMessage({ variant, message }: OperationsQueryMessageProps) {
  const text =
    variant === "no-fleet"
      ? "Aucune flotte associée à votre compte. Créez ou rejoignez une flotte pour voir les opérations."
      : (message ?? "Impossible de charger les opérations. Réessayez plus tard.");

  return (
    <div
      className="flex gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground"
      role="alert"
    >
      <AlertCircle className="h-5 w-5 shrink-0 text-destructive" aria-hidden />
      <p>{text}</p>
    </div>
  );
}
