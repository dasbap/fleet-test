import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBilling } from "@/hooks/useBilling";
import { useRoleAccess } from "@/hooks/useRoleAccess";

const Finances = () => {
  const { activeTenantContext } = useAuth();
  const { can } = useRoleAccess();
  const canViewBilling = can("billing.view");
  const canManageBilling = can("billing.manage");

  const billingQuery = useBilling(
    activeTenantContext?.orgId,
    activeTenantContext?.fleetId
  );

  const subscription = billingQuery.data?.subscription;
  const payments = billingQuery.data?.recentPayments ?? [];

  if (!canViewBilling) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">Accès réservé aux managers et organisateurs.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-2">
          <DollarSign className="h-7 w-7" />
          Finances
        </h1>
        <p className="text-muted-foreground mt-1">
          Suivez les revenus et dépenses de votre flotte
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Abonnement actif</CardTitle>
        </CardHeader>
        <CardContent>
          {billingQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement des informations de facturation...</p>
          ) : subscription ? (
            <div className="space-y-2 text-sm">
              <p>
                <strong>Plan :</strong> {subscription.plan?.name ?? "Plan non défini"}
              </p>
              <p>
                <strong>Statut :</strong> {subscription.status}
              </p>
              <p>
                <strong>Période :</strong> {new Date(subscription.startsAt).toLocaleDateString()} -{" "}
                {new Date(subscription.endsAt).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun abonnement actif pour cette flotte. Contactez le support pour activer un plan.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paiements récents</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <DollarSign className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Aucun paiement récent pour l'organisation active.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="rounded-md border p-3 text-sm">
                  <p>
                    <strong>Montant :</strong> {payment.amount} {payment.currency}
                  </p>
                  <p>
                    <strong>Fournisseur :</strong> {payment.provider}
                  </p>
                  <p>
                    <strong>Statut :</strong> {payment.status}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Finances;
