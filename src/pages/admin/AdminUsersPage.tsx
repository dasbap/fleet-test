import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Shield, UserPlus } from "lucide-react";
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
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/types/auth";

const ROLE_LABELS: Record<AppRole, string> = {
  organizer: "Organisateur",
  manager: "Gestionnaire",
  driver: "Chauffeur",
  mechanic: "Mecanicien",
};

interface CreateUserResult {
  ok: boolean;
  user_id?: string;
  email?: string;
  temporary_password?: string;
  error?: string;
}

export default function AdminUsersPage() {
  const { isAdmin, rbac, isLoading } = useRoleAccess();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [fleetId, setFleetId] = useState("");
  const [role, setRole] = useState<AppRole>("driver");
  const [password, setPassword] = useState("");
  const [platformAdmin, setPlatformAdmin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState<CreateUserResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
          fleet_id: fleetId || undefined,
          role: fleetId ? role : undefined,
          password: password || undefined,
          platform_admin: platformAdmin,
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

  if (isLoading || rbac.platformRole === null) {
    return null;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Shield className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Administration des comptes</h1>
          <p className="text-sm text-muted-foreground">
            Creation de comptes reservee aux administrateurs E-Samba.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border bg-card p-5">
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

        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <div className="space-y-2">
            <Label htmlFor="admin-user-fleet">Fleet ID optionnel</Label>
            <Input
              id="admin-user-fleet"
              value={fleetId}
              onChange={(event) => setFleetId(event.target.value)}
              placeholder="UUID de la flotte"
            />
          </div>
          <div className="space-y-2">
            <Label>Role flotte</Label>
            <Select value={role} onValueChange={(value) => setRole(value as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABELS) as AppRole[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {ROLE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={platformAdmin}
            onChange={(event) => setPlatformAdmin(event.target.checked)}
            className="h-4 w-4"
          />
          Donner aussi le statut administrateur plateforme
        </label>

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
