import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { Shield, UserPlus, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { supabase } from "@/integrations/supabase/client";
import { ROUTE_PATHS } from "@/navigation/routePaths";
import type { AppRole, FleetMembership } from "@/types/auth";
import type { TenantOption } from "@/contexts/auth-context";

type ProvisionRole = AppRole | "admin";

const ROLE_LABELS: Record<ProvisionRole, string> = {
  organizer: "Organisateur",
  manager: "Gestionnaire",
  driver: "Chauffeur",
  mechanic: "Mecanicien",
  admin: "Admin plateforme",
};

const FLEET_ROLES: AppRole[] = ["organizer", "manager", "driver", "mechanic"];

interface CreateUserResult {
  ok: boolean;
  user_id?: string;
  email?: string;
  temporary_password?: string;
  error?: string;
}

interface FleetOption {
  fleetId: string;
  label: string;
}

export function buildProvisionableFleetOptions(
  memberships: FleetMembership[],
  tenantOptions: TenantOption[],
): FleetOption[] {
  const seenFleetIds = new Set<string>();

  return memberships.reduce<FleetOption[]>((options, membership) => {
    if (!membership.is_active || membership.role !== "organizer") {
      return options;
    }
    if (seenFleetIds.has(membership.fleet_id)) {
      return options;
    }

    seenFleetIds.add(membership.fleet_id);
    const tenant = tenantOptions.find((option) => option.fleetId === membership.fleet_id);
    options.push({
      fleetId: membership.fleet_id,
      label: tenant?.fleetName ?? `Flotte ${membership.fleet_id.slice(0, 8)}`,
    });
    return options;
  }, []);
}

export default function AdminUsersPage() {
  const { isAdmin, isSuperAdmin, rbac, isLoading } = useRoleAccess();
  const { memberships, tenantOptions, userFleetId, isTenantOrgLoading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [fleetId, setFleetId] = useState("");
  const [role, setRole] = useState<ProvisionRole>("driver");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState<CreateUserResult | null>(null);

  const fleetOptions = useMemo(
    () => buildProvisionableFleetOptions(memberships, tenantOptions),
    [memberships, tenantOptions],
  );
  const canProvisionAccounts = isAdmin || fleetOptions.length > 0;
  const provisionableRoles = useMemo<ProvisionRole[]>(
    () => (isSuperAdmin ? [...FLEET_ROLES, "admin"] : FLEET_ROLES),
    [isSuperAdmin],
  );
  const requiresFleet = role !== "admin" && (!isAdmin || role !== "organizer");

  useEffect(() => {
    if (!provisionableRoles.includes(role)) {
      setRole("driver");
      return;
    }

    if (!requiresFleet) {
      if (fleetId) {
        setFleetId("");
      }
      return;
    }
    if (fleetId && fleetOptions.some((option) => option.fleetId === fleetId)) return;
    const defaultFleetId =
      fleetOptions.find((option) => option.fleetId === userFleetId)?.fleetId ??
      fleetOptions[0]?.fleetId ??
      "";
    if (defaultFleetId) {
      setFleetId(defaultFleetId);
    }
  }, [fleetId, fleetOptions, provisionableRoles, requiresFleet, role, userFleetId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requiresFleet && !fleetId) {
      toast({
        title: "Flotte requise",
        description: "Choisissez la flotte qui recevra ce compte.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setCreated(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      toast({
        title: "Session expiree",
        description: "Reconnectez-vous puis reessayez.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          full_name: fullName,
          phone,
          fleet_id: requiresFleet ? fleetId : undefined,
          role,
          platform_admin: role === "admin",
          password: password || undefined,
        }),
      });
      const result = (await response.json()) as CreateUserResult;

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "creation_failed");
      }

      setCreated(result);
      setEmail("");
      setFullName("");
      setPhone("");
      setPassword("");
      toast({
        title: "Compte cree",
        description: "Le compte utilisateur est pret.",
      });
    } catch (error) {
      toast({
        title: "Creation impossible",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || isTenantOrgLoading || rbac.platformRole === null) {
    return null;
  }

  if (!canProvisionAccounts) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <UsersRound className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Creer un compte</h1>
            <p className="text-sm text-muted-foreground">
              Ajoutez un compte flotte, ou un admin plateforme si vous etes super admin.
            </p>
          </div>
        </div>
        {isAdmin ? (
          <Button asChild variant="outline">
            <Link to={ROUTE_PATHS.dashboardAdminDemo}>Comptes demo</Link>
          </Button>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border bg-card p-5">
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" aria-hidden />
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">
              Affectation
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
            <div className="space-y-2">
              <Label htmlFor="admin-user-fleet">Flotte cible</Label>
              {requiresFleet ? (
                fleetOptions.length > 0 ? (
                  <Select value={fleetId} onValueChange={setFleetId}>
                    <SelectTrigger id="admin-user-fleet">
                      <SelectValue placeholder="Choisir une flotte" />
                    </SelectTrigger>
                    <SelectContent>
                      {fleetOptions.map((option) => (
                        <SelectItem key={option.fleetId} value={option.fleetId}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="admin-user-fleet"
                    value={fleetId}
                    onChange={(event) => setFleetId(event.target.value)}
                    placeholder="UUID de la flotte cible"
                    required
                  />
                )
              ) : (
                <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  {role === "admin"
                    ? "Un admin plateforme n'est rattache a aucune flotte."
                    : "L'organisateur creera sa flotte apres connexion."}
                </div>
              )}
              {requiresFleet && isAdmin && fleetOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Admin plateforme : renseignez l'UUID de la flotte cible.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>{role === "admin" ? "Role plateforme" : "Role dans la flotte"}</Label>
              <Select value={role} onValueChange={(value) => setRole(value as ProvisionRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {provisionableRoles.map((value) => (
                    <SelectItem key={value} value={value}>
                      {ROLE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="admin-user-email">Email</Label>
            <Input
              id="admin-user-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-user-name">Nom complet</Label>
            <Input
              id="admin-user-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Nom Prenom"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-user-phone">Telephone</Label>
            <Input
              id="admin-user-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+237..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-user-password">Mot de passe temporaire</Label>
            <Input
              id="admin-user-password"
              type="text"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Auto si vide"
            />
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting} className="gap-2">
          <UserPlus className="h-4 w-4" aria-hidden />
          {isSubmitting ? "Creation..." : "Creer le compte"}
        </Button>
      </form>

      {created?.temporary_password && (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">Mot de passe temporaire genere</p>
          <p className="mt-1 font-mono">{created.temporary_password}</p>
        </div>
      )}
    </div>
  );
}
