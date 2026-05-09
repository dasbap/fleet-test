import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Building2, MapPin, RefreshCw } from "lucide-react";
import { getRoleLabel, getRoleBadgeClass } from "@/lib/roleUtils";
import type { FleetInfo } from "@/hooks/useUserFleets";
import type { FleetMembership } from "@/hooks/useAuth";

interface UserFleetsCardProps {
  fleets: FleetInfo[];
  memberships: FleetMembership[];
  isLoading: boolean;
  error: string | null;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

/** Libellé pays pour code pays connu */
function countryLabel(code: string | undefined): string {
  if (code === "CM") return "Cameroun";
  return code ?? "";
}

/**
 * Carte listant les flottes de l'utilisateur avec leur rôle.
 */
export default function UserFleetsCard({
  fleets,
  memberships,
  isLoading,
  error,
  isRefreshing = false,
  onRefresh,
}: UserFleetsCardProps) {
  return (
    <Card className="animate-fade-in" style={{ animationDelay: "100ms" }}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Mes flottes
            </CardTitle>
            <CardDescription>
              Flottes auxquelles vous êtes rattaché
            </CardDescription>
          </div>
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={isRefreshing || isLoading}
              title="Rafraîchir les flottes"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="text-sm text-destructive mb-3" role="alert">
            {error}
          </p>
        )}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : fleets.length > 0 ? (
          <div className="space-y-3">
            {fleets.map((fleet) => {
              const membership = memberships.find((m) => m.fleet_id === fleet.id);
              return (
                <div
                  key={fleet.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{fleet.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {countryLabel(fleet.country_code)}
                      </p>
                    </div>
                  </div>
                  {membership && (
                    <Badge className={getRoleBadgeClass(membership.role)}>
                      {getRoleLabel(membership.role)}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucune flotte associée</p>
            <p className="text-sm">
              Demandez un code d&apos;invitation à un gestionnaire de flotte
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
