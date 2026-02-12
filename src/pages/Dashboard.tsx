import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardStats from "@/components/dashboard/DashboardStats";
import FleetOverview from "@/components/dashboard/FleetOverview";
import RecentActivity from "@/components/dashboard/RecentActivity";
import { SystemHealthAlert } from "@/components/dashboard/SystemHealthAlert";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

const Dashboard = () => {
  const { role, userFleetId, isLoading } = useAuth();
  const navigate = useNavigate();
  const userRole = role || "organizer";

  useRealtimeNotifications(userFleetId || undefined);

  useEffect(() => {
    if (!isLoading && !userFleetId && role === null) {
      navigate("/dashboard/create-fleet");
    }
  }, [isLoading, userFleetId, role, navigate]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <SystemHealthAlert />

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

      <DashboardStats />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FleetOverview />
        </div>
        <div>
          <RecentActivity />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
