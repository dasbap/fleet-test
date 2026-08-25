import { Bell, Home, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "@/lib/auth-actions";
import type { AppRole } from "@/hooks/useAuth";
import { useAuth } from "@/hooks/useAuth";
import { useAlerts } from "@/hooks/useAlerts";
import { UniversalSearch } from "@/components/shared/UniversalSearch";
import { AdaptiveNetworkQualityBadge, OfflineSyncIndicator } from "@/components/shared/OfflineBanner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DashboardHeaderProps {
  userRole: AppRole;
  displayName?: string;
  initials?: string;
  isPlatformAdmin?: boolean;
}

const roleLabels = {
  organizer: "Organisateur",
  manager: "Gestionnaire",
  driver: "Chauffeur",
  mechanic: "Mécanicien",
};

const DashboardHeader = ({
  userRole,
  displayName,
  initials,
  isPlatformAdmin = false,
}: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const { userFleetId, tenantOptions, setActiveFleetId } = useAuth();
  const { data: alertes } = useAlerts(userFleetId ?? undefined);
  const alertesCount = alertes?.length ?? 0;
  const displayRoleLabel = isPlatformAdmin ? "Admin plateforme" : roleLabels[userRole];
  const showFleetControls = !isPlatformAdmin;

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex h-full items-center justify-between gap-2 px-3 sm:gap-4 sm:px-4">
        {/* Left */}
        <div data-testid="dashboard-header-left" className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
          <SidebarTrigger aria-label="Ouvrir le menu dashboard" className="-ml-1 shrink-0" />
          <Button variant="ghost" size="icon" className="hidden shrink-0 sm:inline-flex" asChild>
            <Link to="/" aria-label="Retour accueil">
              <Home className="w-5 h-5" />
            </Link>
          </Button>
          {showFleetControls && tenantOptions.length > 1 ? (
            <Select value={userFleetId ?? undefined} onValueChange={setActiveFleetId}>
              <SelectTrigger className="h-9 min-w-0 flex-1 sm:w-[220px] sm:flex-none">
                <SelectValue placeholder="Sélectionner une flotte" />
              </SelectTrigger>
              <SelectContent>
                {tenantOptions.map((tenant) => (
                  <SelectItem key={tenant.fleetId} value={tenant.fleetId}>
                    {tenant.fleetName ?? tenant.fleetId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {showFleetControls ? (
            <UniversalSearch fleetId={userFleetId} className="hidden min-w-0 max-w-md flex-1 lg:block" />
          ) : null}
        </div>

        {/* Right */}
        <div data-testid="dashboard-header-right" className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
          {showFleetControls ? (
            <div className="hidden items-center gap-2 sm:flex">
              <AdaptiveNetworkQualityBadge />
              <OfflineSyncIndicator />
            </div>
          ) : null}
          {/* Notifications */}
          {showFleetControls ? (
          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link to="/dashboard/alerts" aria-label={`${alertesCount} alerte${alertesCount !== 1 ? "s" : ""} non résolue${alertesCount !== 1 ? "s" : ""}`}>
              <Bell className="w-5 h-5" />
              {alertesCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                  {alertesCount > 99 ? "99+" : alertesCount}
                </span>
              )}
            </Link>
          </Button>
          ) : null}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {initials || "US"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium">
                    {displayName || "Utilisateur"}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {displayRoleLabel}
                  </Badge>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard/profile">
                  <User className="w-4 h-4 mr-2" />
                  Profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/dashboard/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Paramètres
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={async () => {
                  await signOut();
                  navigate("/", { replace: true });
                }}
              >
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
