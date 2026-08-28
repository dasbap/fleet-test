import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { Shield, UserPlus, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
const CENTRAL_AFRICA_COUNTRIES = [
  { code: "CM", label: "Cameroun" },
  { code: "CF", label: "Centrafrique" },
  { code: "TD", label: "Tchad" },
  { code: "CG", label: "Congo" },
  { code: "GA", label: "Gabon" },
  { code: "GQ", label: "Guinée équatoriale" },
] as const;

interface CreateUserResult { ok: boolean; user_id?: string; email?: string; error?: string; }
interface FleetOption { fleetId: string; label: string; }

export function buildProvisionableFleetOptions(memberships: FleetMembership[], tenantOptions: TenantOption[]): FleetOption[] {
  const seenFleetIds = new Set<string>();
  return memberships.reduce<FleetOption[]>((options, membership) => {
    if (!membership.is_active || membership.role !== "organizer" || seenFleetIds.has(membership.fleet_id)) return options;
    seenFleetIds.add(membership.fleet_id);
    const tenant = tenantOptions.find((option) => option.fleetId === membership.fleet_id);
    options.push({ fleetId: membership.fleet_id, label: tenant?.fleetName ?? `Flotte ${membership.fleet_id.slice(0, 8)}` });
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
  const [companyName, setCompanyName] = useState("");
  const [companyIdentifier, setCompanyIdentifier] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [fleetId, setFleetId] = useState("");
  const [role, setRole] = useState<ProvisionRole>("driver");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState<CreateUserResult | null>(null);

  const fleetOptions = useMemo(() => buildProvisionableFleetOptions(memberships, tenantOptions), [memberships, tenantOptions]);
  const canProvisionAccounts = isAdmin || fleetOptions.length > 0;
  const provisionableRoles = useMemo<ProvisionRole[]>(() => isSuperAdmin ? [...FLEET_ROLES, "admin"] : FLEET_ROLES, [isSuperAdmin]);
  const requiresFleet = role !== "admin" && (!isAdmin || role !== "organizer");
  const isNewClientOrganizer = isAdmin && role === "organizer" && !requiresFleet;

  useEffect(() => {
    if (!provisionableRoles.includes(role)) {
      setRole("driver");
      return;
    }
    if (!requiresFleet) {
      if (fleetId) setFleetId("");
      return;
    }
    if (fleetId && fleetOptions.some((option) => option.fleetId === fleetId)) return;
    const defaultFleetId = fleetOptions.find((option) => option.fleetId === userFleetId)?.fleetId ?? fleetOptions[0]?.fleetId ?? "";
    if (defaultFleetId) setFleetId(defaultFleetId);
  }, [fleetId, fleetOptions, provisionableRoles, requiresFleet, role, userFleetId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requiresFleet && !fleetId) {
      toast({ title: "Flotte requise", description: "Choisissez la flotte qui recevra ce compte.", variant: "destructive" });
      return;
    }
    if (isNewClientOrganizer && ![fullName, phone, companyName, companyIdentifier, countryCode].every((value) => value.trim())) {
      toast({ title: "Informations client incomplètes", description: "Nom, téléphone, entreprise, identifiant entreprise et pays sont requis.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    setCreated(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      toast({ title: "Session expiree", description: "Reconnectez-vous puis reessayez.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email,
          full_name: fullName,
          phone,
          company_name: isNewClientOrganizer ? companyName : undefined,
          company_identifier: isNewClientOrganizer ? companyIdentifier : undefined,
          country_code: isNewClientOrganizer ? countryCode : undefined,
          fleet_id: requiresFleet ? fleetId : undefined,
          role,
          platform_admin: role === "admin",
        }),
      });
      const result = (await response.json()) as CreateUserResult;
      if (!response.ok || !result.ok) throw new Error(result.error ?? "creation_failed");
      setCreated(result);
      setEmail("");
      setFullName("");
      setPhone("");
      setCompanyName("");
      setCompanyIdentifier("");
      setCountryCode("");
      toast({ title: "Compte cree", description: "Le compte utilisateur est pret." });
    } catch (error) {
      toast({ title: "Creation impossible", description: error instanceof Error ? error.message : "Erreur inconnue", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || isTenantOrgLoading || rbac.platformRole === null) return null;
  if (!canProvisionAccounts) return <Navigate to="/dashboard" replace />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"><UsersRound className="h-5 w-5" aria-hidden /></div><div><h1 className="text-2xl font-bold tracking-tight">Creer un compte</h1><p className="text-sm text-muted-foreground">Ajoutez un compte flotte ou créez un nouveau client organisateur.</p></div></div>
        {isAdmin ? <Button asChild variant="outline"><Link to={ROUTE_PATHS.dashboardAdminDemo}>Comptes demo</Link></Button> : null}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border bg-card p-5">
        <section className="space-y-4">
          <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-muted-foreground" aria-hidden /><h2 className="text-sm font-semibold uppercase text-muted-foreground">Affectation</h2></div>
          <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
            <div className="space-y-2">
              <Label htmlFor="admin-user-fleet">Flotte cible</Label>
              {requiresFleet ? fleetOptions.length > 0 ? <Select value={fleetId} onValueChange={setFleetId}><SelectTrigger id="admin-user-fleet"><SelectValue placeholder="Choisir une flotte" /></SelectTrigger><SelectContent>{fleetOptions.map((option) => <SelectItem key={option.fleetId} value={option.fleetId}>{option.label}</SelectItem>)}</SelectContent></Select> : <Input id="admin-user-fleet" value={fleetId} onChange={(event) => setFleetId(event.target.value)} placeholder="UUID de la flotte cible" required /> : <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">{role === "admin" ? "Un admin plateforme n'est rattache a aucune flotte." : "Nouveau client : l'organisateur finalisera sa flotte sur /start."}</div>}
            </div>
            <div className="space-y-2"><Label>Role</Label><Select value={role} onValueChange={(value) => setRole(value as ProvisionRole)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{provisionableRoles.map((value) => <SelectItem key={value} value={value}>{ROLE_LABELS[value]}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="admin-user-email">Email *</Label><Input id="admin-user-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="admin-user-name">Nom complet {isNewClientOrganizer ? "*" : ""}</Label><Input id="admin-user-name" value={fullName} onChange={(event) => setFullName(event.target.value)} required={isNewClientOrganizer} /></div>
          <div className="space-y-2"><Label htmlFor="admin-user-phone">Telephone {isNewClientOrganizer ? "*" : ""}</Label><Input id="admin-user-phone" value={phone} onChange={(event) => setPhone(event.target.value)} required={isNewClientOrganizer} /></div>
          {isNewClientOrganizer ? <>
            <div className="space-y-2"><Label htmlFor="admin-user-company">Entreprise *</Label><Input id="admin-user-company" value={companyName} onChange={(event) => setCompanyName(event.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="admin-user-company-id">Identifiant entreprise *</Label><Input id="admin-user-company-id" value={companyIdentifier} onChange={(event) => setCompanyIdentifier(event.target.value)} placeholder="RCCM, NIU, NIF..." required /></div>
            <div className="space-y-2"><Label>Pays *</Label><Select value={countryCode} onValueChange={setCountryCode}><SelectTrigger><SelectValue placeholder="Sélectionner un pays" /></SelectTrigger><SelectContent>{CENTRAL_AFRICA_COUNTRIES.map((country) => <SelectItem key={country.code} value={country.code}>{country.label}</SelectItem>)}</SelectContent></Select></div>
          </> : null}
        </div>

        <Button type="submit" disabled={isSubmitting} className="gap-2"><UserPlus className="h-4 w-4" aria-hidden />{isSubmitting ? "Creation..." : "Creer le compte"}</Button>
      </form>

      {created ? <div className="mt-5 rounded-lg border bg-muted/30 p-4 text-sm"><p className="font-medium">Compte créé</p><p>{created.email}</p></div> : null}
    </div>
  );
}
