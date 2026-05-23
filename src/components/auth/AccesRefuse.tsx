import { Lock } from "lucide-react";

interface AccesRefuseProps {
  title?: string;
  description?: string;
}

/**
 * Message d'accès refusé (thème sombre E-Samba).
 */
export function AccesRefuse({
  title = "Accès restreint",
  description = "Vous n'avez pas les droits nécessaires pour effectuer cette action.",
}: AccesRefuseProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
        <Lock className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}
