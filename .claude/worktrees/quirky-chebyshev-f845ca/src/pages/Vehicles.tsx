import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import VehiclesTable from "@/components/vehicles/VehiclesTable";
import VehicleFormDialog from "@/components/vehicles/VehicleFormDialog";
import { Button } from "@/components/ui/button";
import { Plus, Car } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useQueryClient } from "@tanstack/react-query";
import { PageLoader } from "@/components/dashboard/PageLoader";

const Vehicles = () => {
  const { userFleetId, isLoading: authLoading } = useAuth();
  const { canWriteFleet } = usePermissions();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
  };

  if (authLoading) {
    return <PageLoader />;
  }

  if (!userFleetId) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Car className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune flotte</h3>
            <p className="text-muted-foreground mb-4">
              Rejoignez une flotte via un code d'invitation ou créez-en une pour gérer vos véhicules.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Tableau de bord
              </Button>
              <Button onClick={() => navigate("/dashboard/create-fleet")}>
                Créer une flotte
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-heading font-bold">
                    Gestion des véhicules
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Gérez les véhicules de votre flotte
                  </p>
                </div>
                {canWriteFleet && (
                  <Button onClick={() => setIsFormOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Ajouter un véhicule
                  </Button>
                )}
              </div>

              {/* Vehicles Table */}
              <VehiclesTable fleetId={userFleetId} />

              {/* Add Vehicle Dialog */}
      <VehicleFormDialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen}
        fleetId={userFleetId}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default Vehicles;
