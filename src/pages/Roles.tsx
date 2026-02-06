import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Roles = () => {
  const { role } = useAuth();
  const userRole = role || "organizer";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar userRole={userRole} />
        <SidebarInset className="flex flex-col flex-1">
          <DashboardHeader userRole={userRole} />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-2">
                  <Shield className="h-7 w-7" />
                  Gestion des rôles
                </h1>
                <p className="text-muted-foreground mt-1">
                  Gérez les permissions et rôles des membres de votre flotte
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Rôles et permissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Shield className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Page en développement</h3>
                    <p className="text-muted-foreground">
                      La gestion des rôles sera bientôt disponible.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Roles;
