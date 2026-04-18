import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton aligné sur la carte « Aperçu de la flotte » (réserve d’espace / CLS). */
export function FleetOverviewSkeleton() {
  return (
    <Card className="h-full min-h-[26rem]">
      <CardHeader>
        <CardTitle className="font-heading">Aperçu de la flotte</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
              <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
              <div className="flex-1 min-w-0">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-32 max-w-full" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
