import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { getRoleLabel, getRoleBadgeClass } from "@/lib/roleUtils";
import type { FleetMembership } from "@/hooks/useAuth";
import type { FleetInfo } from "@/hooks/useUserFleets";

interface MembershipsTableProps {
  memberships: FleetMembership[];
  fleetById: Record<string, FleetInfo>;
}

/**
 * Tableau des adhésions : flotte, rôle, statut pour chaque membership.
 */
export default function MembershipsTable({ memberships, fleetById }: MembershipsTableProps) {
  if (memberships.length === 0) return null;

  return (
    <Card className="animate-fade-in" style={{ animationDelay: "200ms" }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Détails des adhésions
        </CardTitle>
        <CardDescription>
          Vos rôles et permissions dans chaque flotte
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  Flotte
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  Rôle
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((membership) => {
                const fleet = fleetById[membership.fleet_id];
                return (
                  <tr key={membership.id} className="border-b last:border-0">
                    <td className="py-3 px-4">
                      {fleet?.name ?? "Chargement..."}
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getRoleBadgeClass(membership.role)}>
                        {getRoleLabel(membership.role)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={membership.is_active ? "default" : "secondary"}>
                        {membership.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
