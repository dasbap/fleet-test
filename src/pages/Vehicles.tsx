import { useState } from "react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import VehiclesTable from "@/components/vehicles/VehiclesTable";
import VehicleFormDialog from "@/components/vehicles/VehicleFormDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Vehicles = () => {
  const [userRole] = useState<"organizer" | "manager" | "driver" | "mechanic">("manager");
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar userRole={userRole} />
        <SidebarInset className="flex flex-col flex-1">
          <DashboardHeader userRole={userRole} />
          <main className="flex-1 p-6 overflow-auto">
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
                <Button onClick={() => setIsFormOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Ajouter un véhicule
                </Button>
              </div>

              {/* Vehicles Table */}
              <VehiclesTable />

              {/* Add Vehicle Dialog */}
              <VehicleFormDialog 
                open={isFormOpen} 
                onOpenChange={setIsFormOpen} 
              />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Vehicles;
