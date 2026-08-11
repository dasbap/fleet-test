import { Link } from "react-router-dom";
import { ArrowUpRight, ClipboardList, CreditCard } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContextualHelpTrigger } from "@/components/help/ContextualHelpTrigger";
import { SubscriptionManagementPanel } from "@/features/billing/components/SubscriptionManagementPanel";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { isBffConfigured } from "@/lib/bff-config";
import { ROUTE_PATHS } from "@/navigation/routePaths";

export default function SubscriptionsPage() {
  const { userFleetId } = useAuth();
  const { can } = useRoleAccess();
  const canManageBilling = can("billing.manage");
  const canPayOnline = isBffConfigured();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Abonnements</h1>
          <p className="text-sm text-muted-foreground">
            Pilotez les abonnements, les slots véhicules et les transferts entre licences.
          </p>
          <ContextualHelpTrigger slug="subscription-overview" className="mt-2" />
        </div>
        {canManageBilling && (
          <Button asChild>
            <Link to={canPayOnline ? ROUTE_PATHS.pricing : ROUTE_PATHS.upgrade}>
              <CreditCard className="mr-1.5 h-4 w-4" />
              Ajouter un abonnement
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" />
            Gestion des licences véhicules
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Un abonnement standard occupe un véhicule. Les plans multi-véhicules utilisent leur
          capacité propre, et chaque nouveau véhicule est associé automatiquement au premier
          abonnement disponible.
        </CardContent>
      </Card>

      {!canManageBilling && (
        <Alert>
          <ArrowUpRight className="h-4 w-4" />
          <AlertDescription>
            Vous pouvez consulter les abonnements. Les ajouts, transferts et arrêts sont réservés
            aux organisateurs de la flotte.
          </AlertDescription>
        </Alert>
      )}

      <SubscriptionManagementPanel fleetId={userFleetId} canManage={canManageBilling} />
    </div>
  );
}
