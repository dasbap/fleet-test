import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import IncidentsTable from "@/components/incidents/IncidentsTable";
import IncidentFormDialog from "@/components/incidents/IncidentFormDialog";
import { useIncidents } from "@/hooks/useIncidents";

const Incidents = () => {
  const navigate = useNavigate();
  const { user, role, isLoading: authLoading } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { incidents, isLoading, refetch } = useIncidents();

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handleIncidentCreated = () => {
    setIsFormOpen(false);
    refetch();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar userRole={role || "driver"} />
        <SidebarInset className="flex flex-col flex-1">
          <DashboardHeader userRole={role || "driver"} />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
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
                {(role === "driver" || role === "organizer" || role === "manager") && (
                  <Button onClick={() => setIsFormOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Signaler un incident
                  </Button>
                )}
              </div>

              {/* Incidents Table */}
              <IncidentsTable 
                incidents={incidents} 
                isLoading={isLoading}
                userRole={role || "driver"}
                onRefresh={refetch}
              />
            </div>
          </main>
        </SidebarInset>
      </div>

      <IncidentFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={handleIncidentCreated}
      />
    </SidebarProvider>
  );
};

export default Incidents;
