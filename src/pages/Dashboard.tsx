import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardStats from "@/components/dashboard/DashboardStats";
import FleetOverview from "@/components/dashboard/FleetOverview";
import RecentActivity from "@/components/dashboard/RecentActivity";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

const Dashboard = () => {
  const navigate = useNavigate();
  const [userRole] = useState<"organizer" | "manager" | "driver" | "mechanic">("organizer");

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar userRole={userRole} />
        <SidebarInset className="flex flex-col flex-1">
          <DashboardHeader userRole={userRole} />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Welcome */}
              <div>
                <h1 className="text-2xl md:text-3xl font-heading font-bold">
                  Bienvenue, Organisateur 👋
                </h1>
                <p className="text-muted-foreground mt-1">
                  Voici un aperçu de vos flottes aujourd'hui
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
