import { Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { useMissingClosure } from "@/hooks/useMissingClosure";
import { ROUTE_PATHS } from "@/navigation/routePaths";

/**
 * Bannière d'alerte si des créneaux du jour précédent sont encore ouverts (clôture oubliée).
 * Visible uniquement pour organizer/manager (backoffice).
 */
export function ClosureBanner() {
  const { canAccessBackoffice } = usePermissions();
  const { overdueCount } = useMissingClosure();
  const navigate = useNavigate();

  if (!canAccessBackoffice || overdueCount <= 0) return null;

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm dark:border-red-800 dark:bg-red-950/30 sm:flex-row sm:items-center"
      role="alert"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
        <div className="min-w-0">
          <p className="font-medium text-red-900 dark:text-red-100">
            {overdueCount} créneau{overdueCount > 1 ? "x" : ""} non clôturé{overdueCount > 1 ? "s" : ""}
          </p>
          <p className="mt-0.5 text-red-800/90 dark:text-red-200/90">
            Des créneaux démarrés hier ou avant ne sont pas encore clôturés. Clôturez-les pour valider
            les recettes et l'historique.
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="shrink-0"
        onClick={() => navigate(ROUTE_PATHS.dashboardShiftClosure)}
      >
        Clôturer
      </Button>
    </div>
  );
}
