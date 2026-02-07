import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardStats from "@/components/dashboard/DashboardStats";
import FleetOverview from "@/components/dashboard/FleetOverview";
import RecentActivity from "@/components/dashboard/RecentActivity";
import { SystemHealthAlert } from "@/components/dashboard/SystemHealthAlert";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

const Dashboard = () => {
  const { user, role, userFleetId, isLoading } = useAuth();
  const navigate = useNavigate();
  const userRole = role || "organizer";

  const userMetadata = user?.user_metadata || {};
  const fullName =
    userMetadata.full_name || user?.email?.split("@")[0] || "Utilisateur";
  const initials = fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Enable real-time notifications
  useRealtimeNotifications(userFleetId || undefined);

  // Rediriger automatiquement les utilisateurs sans flotte vers la création de flotte
  useEffect(() => {
    if (!isLoading && !userFleetId && role === null) {
      // L'utilisateur n'a pas de flotte et pas de rôle défini
      // Rediriger vers la création de flotte pour permettre la création automatique
      navigate("/dashboard/create-fleet");
    }
  }, [isLoading, userFleetId, role, navigate]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar userRole={userRole} />
        <SidebarInset className="flex flex-col flex-1">
          <DashboardHeader
            userRole={userRole}
            displayName={fullName}
            initials={initials}
          />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* System Health Alert for admins */}
              <SystemHealthAlert />

              {/* Welcome */}
              <div>
                <h1 className="text-2xl md:text-3xl font-heading font-bold">
                  Bienvenue, {userRole === 'driver' ? 'Chauffeur' : userRole === 'mechanic' ? 'Mécanicien' : userRole === 'manager' ? 'Gestionnaire' : 'Organisateur'} 👋
                </h1>
                <p className="text-muted-foreground mt-1">
                  {userRole === 'driver' 
                    ? 'Gérez vos courses et clôtures journalières'
                    : 'Voici un aperçu de vos flottes aujourd\'hui'}
                </p>
              </div>

              {/* Stats */}
              <DashboardStats />

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <FleetOverview />
                </div>
                <div>
                  <RecentActivity />
                </div>
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
