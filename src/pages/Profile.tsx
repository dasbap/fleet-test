import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Building2, Shield, Calendar, Mail, MapPin } from "lucide-react";

interface FleetInfo {
  id: string;
  name: string;
  country_code: string;
}

const roleLabels: Record<string, string> = {
  organizer: "Organisateur",
  manager: "Gestionnaire",
  driver: "Chauffeur",
  mechanic: "Mécanicien",
};

const roleColors: Record<string, string> = {
  organizer: "bg-chart-1 text-primary-foreground",
  manager: "bg-chart-2 text-primary-foreground",
  driver: "bg-chart-3 text-primary-foreground",
  mechanic: "bg-chart-4 text-primary-foreground",
};

const Profile = () => {
  const { user, role, memberships, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [fleets, setFleets] = useState<FleetInfo[]>([]);
  const [isLoadingFleets, setIsLoadingFleets] = useState(true);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchFleets = async () => {
      if (memberships.length === 0) {
        setIsLoadingFleets(false);
        return;
      }

      const fleetIds = memberships.map((m) => m.fleet_id);
      const { data, error } = await supabase
        .from("fleets")
        .select("id, name, country_code")
        .in("id", fleetIds);

      if (!error && data) {
        setFleets(data);
      }
      setIsLoadingFleets(false);
    };

    if (!authLoading) {
      fetchFleets();
    }
  }, [memberships, authLoading]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  const userMetadata = user.user_metadata || {};
  const fullName = userMetadata.full_name || user.email?.split("@")[0] || "Utilisateur";
  const initials = fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }) : "N/A";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar userRole={role || "driver"} />
        <main className="flex-1 flex flex-col">
          <DashboardHeader userRole={role || "driver"} />
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Header Card */}
              <Card className="animate-fade-in">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <Avatar className="h-24 w-24 border-4 border-primary/20">
                      <AvatarImage src={userMetadata.avatar_url} />
                      <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-center md:text-left">
                      <h1 className="text-2xl font-heading font-bold">{fullName}</h1>
                      <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2 mt-1">
                        <Mail className="h-4 w-4" />
                        {user.email}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                        {role && (
                          <Badge className={roleColors[role] || "bg-muted"}>
                            <Shield className="h-3 w-3 mr-1" />
                            {roleLabels[role] || role}
                          </Badge>
                        )}
                        <Badge variant="outline">
                          <Calendar className="h-3 w-3 mr-1" />
                          Membre depuis {createdAt}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Fleets Card */}
              <Card className="animate-fade-in" style={{ animationDelay: "100ms" }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Mes flottes
                  </CardTitle>
                  <CardDescription>
                    Flottes auxquelles vous êtes rattaché
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingFleets ? (
                    <div className="space-y-3">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : fleets.length > 0 ? (
                    <div className="space-y-3">
                      {fleets.map((fleet) => {
                        const membership = memberships.find((m) => m.fleet_id === fleet.id);
                        return (
                          <div
                            key={fleet.id}
                            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{fleet.name}</p>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {fleet.country_code === "CM" ? "Cameroun" : fleet.country_code}
                                </p>
                              </div>
                            </div>
                            {membership && (
                              <Badge className={roleColors[membership.role] || "bg-muted"}>
                                {roleLabels[membership.role] || membership.role}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Aucune flotte associée</p>
                      <p className="text-sm">
                        Demandez un code d'invitation à un gestionnaire de flotte
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Memberships Details */}
              {memberships.length > 0 && (
                <Card className="animate-fade-in" style={{ animationDelay: "200ms" }}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      Détails des adhésions
                    </CardTitle>
                    <CardDescription>
                      Vos rôles et permissions dans chaque flotte
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                              Flotte
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                              Rôle
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                              Statut
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {memberships.map((membership) => {
                            const fleet = fleets.find((f) => f.id === membership.fleet_id);
                            return (
                              <tr
                                key={membership.id}
                                className="border-b last:border-0"
                              >
                                <td className="py-3 px-4">
                                  {fleet?.name || "Chargement..."}
                                </td>
                                <td className="py-3 px-4">
                                  <Badge
                                    className={roleColors[membership.role] || "bg-muted"}
                                  >
                                    {roleLabels[membership.role] || membership.role}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4">
                                  <Badge
                                    variant={membership.is_active ? "default" : "secondary"}
                                  >
                                    {membership.is_active ? "Actif" : "Inactif"}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Profile;
