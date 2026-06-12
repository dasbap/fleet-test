import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import IncidentsTable from "@/components/incidents/IncidentsTable";
import IncidentFormDialog from "@/components/incidents/IncidentFormDialog";
import IncidentDetailsDialog from "@/components/incidents/IncidentValidationDialog";
import { useIncidents, type Incident } from "@/hooks/useIncidents";
import { PageLoader } from "@/components/dashboard/PageLoader";

const Incidents = () => {
  const { role, userFleetId, isLoading: authLoading } = useAuth();
  const { canReportIncident, canCreateMaintenanceFromIncident } = usePermissions();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const { data: incidents = [], isLoading, refetch } = useIncidents(userFleetId ?? undefined);

  const handleIncidentCreated = () => {
    setIsFormOpen(false);
    refetch();
  };

  if (authLoading) {
    return <PageLoader />;
  }

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold">
              Gestion des Incidents
            </h1>
            <p className="text-muted-foreground mt-1">
              {role === "driver" || role === "mechanic"
                ? "Signalez et suivez les incidents sur vos véhicules"
                : "Gérez tous les incidents de votre flotte"}
            </p>
          </div>
          {canReportIncident && userFleetId && (
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Signaler un incident
            </Button>
          )}
        </div>

        <IncidentsTable
          incidents={incidents}
          isLoading={isLoading}
          onRefresh={refetch}
          onViewDetails={setSelectedIncident}
          canCreateMaintenance={canCreateMaintenanceFromIncident}
        />
      </div>

      <IncidentFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={handleIncidentCreated}
        fleetId={userFleetId ?? undefined}
      />

      {selectedIncident ? (
        <IncidentDetailsDialog
          open
          onOpenChange={(open) => {
            if (!open) setSelectedIncident(null);
          }}
          incident={selectedIncident}
          onSuccess={() => {
            setSelectedIncident(null);
            refetch();
          }}
          canCreateMaintenance={canCreateMaintenanceFromIncident}
        />
      ) : null}
    </>
  );
};

export default Incidents;
