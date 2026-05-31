import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OperationSection } from "@/components/operations/OperationSection";
import { OperationsEmptyState } from "@/components/operations/OperationsEmptyState";
import { OperationsViewSkeleton } from "@/components/operations/OperationsViewSkeleton";
import { COLLECTION_MODE_LABELS } from "@/domain/constants/collectionMode";
import { usePendingClosures } from "@/hooks/useFleetCompliance";
import { useReviewClosure } from "@/hooks/useDriverShifts";
import type { PendingFleetClosure } from "@/repositories/driver-shift.repository";

interface PendingClosuresSectionProps {
  fleetId: string;
}

function formatClosureDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatKmRange(kmStart: number | null, kmEnd: number | null) {
  if (kmStart == null && kmEnd == null) return "—";
  if (kmEnd == null) return `${kmStart?.toLocaleString("fr-FR") ?? "—"} km (départ)`;
  return `${kmStart?.toLocaleString("fr-FR") ?? "—"} → ${kmEnd.toLocaleString("fr-FR")} km`;
}

function PendingClosureRow({
  closure,
  onReview,
  isPending,
}: {
  closure: PendingFleetClosure;
  onReview: (closureId: string, status: "validated" | "rejected") => void;
  isPending: boolean;
}) {
  const modeLabel = COLLECTION_MODE_LABELS[closure.collection_mode] ?? closure.collection_mode;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">
              {closure.vehicleRegistration ?? "Véhicule inconnu"}
            </p>
            <Badge variant="warning">En attente</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {closure.driverName ?? "Conducteur"} · {formatClosureDate(closure.created_at)}
          </p>
          <p className="text-sm text-muted-foreground">
            Recette déclarée :{" "}
            <span className="font-medium text-foreground">
              {closure.revenue_declared.toLocaleString("fr-FR")} FCFA
            </span>
            {" · "}
            {modeLabel}
            {" · "}
            {formatKmRange(closure.kmStart, closure.kmEnd)}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => onReview(closure.id, "rejected")}
          >
            {isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <X className="mr-1 h-4 w-4" aria-hidden />
            )}
            Rejeter
          </Button>
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => onReview(closure.id, "validated")}
          >
            {isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Check className="mr-1 h-4 w-4" aria-hidden />
            )}
            Valider
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Section supervision : clôtures de créneau en attente de validation. */
export function PendingClosuresSection({ fleetId }: PendingClosuresSectionProps) {
  const { data = [], isPending: isLoading } = usePendingClosures(fleetId);
  const reviewMutation = useReviewClosure();

  const handleReview = (closureId: string, status: "validated" | "rejected") => {
    reviewMutation.mutate({ closureId, status });
  };

  return (
    <div id="clotures-en-attente">
      <OperationSection
        title="Clôtures à valider"
        description="Recettes et kilométrages déclarés par les conducteurs en fin de créneau."
      >
        {isLoading ? (
          <OperationsViewSkeleton />
        ) : data.length === 0 ? (
          <OperationsEmptyState message="Aucune clôture en attente de validation." />
        ) : (
          <div className="space-y-3">
            {data.map((closure) => (
              <PendingClosureRow
                key={closure.id}
                closure={closure}
                onReview={handleReview}
                isPending={reviewMutation.isPending}
              />
            ))}
          </div>
        )}
      </OperationSection>
    </div>
  );
}
