import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Lock } from "lucide-react";
import { useRoleAccess } from "@/hooks/useRoleAccess";

const Collections = () => {
  const { can } = useRoleAccess();
  const canViewBilling = can("billing.view");

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
          Encaissements
        </h1>
        <p className="text-muted-foreground mt-1">
          Gérez les encaissements et paiements de votre flotte
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Encaissements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <DollarSign className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Page en développement</h3>
            <p className="text-muted-foreground">
              La gestion des encaissements sera bientôt disponible.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Collections;
