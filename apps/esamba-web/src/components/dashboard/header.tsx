// ============================================================
// FICHIER : src/components/dashboard/header.tsx
// Barre supérieure : org, user, notifications
// ============================================================

"use client";

import {
  Bell,
  Building2,
  ChevronDown,
  LogOut,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { formatFleetRole } from "@/lib/dashboard/roles";

interface DashboardHeaderProps {
  orgName: string;
  fleetName?: string;
  userName: string;
  userEmail: string;
  avatarUrl?: string;
  alertCount?: number;
  role?: string;
}

function isDisplayableAvatarUrl(url: string | undefined) {
  return Boolean(url?.startsWith("http://") || url?.startsWith("https://"));
}

export function DashboardHeader({
  orgName,
  fleetName,
  userName,
  userEmail,
  avatarUrl,
  alertCount = 0,
  role,
}: DashboardHeaderProps) {
  const router = useRouter();
  const supabase = createClient();
  const roleLabel = formatFleetRole(role);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erreur lors de la déconnexion");
      return;
    }
    router.push("/connexion");
    router.refresh();
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{orgName}</p>
          {fleetName ? (
            <p className="truncate text-xs text-muted-foreground">{fleetName}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          onClick={() => router.push("/dashboard/alertes")}
          aria-label="Alertes"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {alertCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              {alertCount > 9 ? "9+" : alertCount}
            </span>
          ) : null}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex h-9 items-center gap-2 rounded-lg px-2 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar className="h-7 w-7">
              {isDisplayableAvatarUrl(avatarUrl) ? (
                <AvatarImage src={avatarUrl} alt={userName} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left sm:block">
              <p className="text-xs leading-tight font-medium">{userName}</p>
              <p className="text-xs leading-tight text-muted-foreground">
                {userEmail}
              </p>
            </div>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
                {role ? (
                  <p className="text-xs text-muted-foreground">{roleLabel}</p>
                ) : null}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/dashboard/parametres")}>
              <User className="mr-2 h-4 w-4" />
              Mon profil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => void handleLogout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
