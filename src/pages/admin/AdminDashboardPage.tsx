import { Link } from "react-router-dom";
import { CreditCard, KeyRound, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { ROUTE_PATHS } from "@/navigation/routePaths";

const ADMIN_ACTIONS = [
  {
    title: "Comptes utilisateurs",
    description:
      "Créer des comptes, attribuer les accès et promouvoir un administrateur plateforme.",
    href: ROUTE_PATHS.dashboardAdminUsers,
    icon: Users,
    cta: "Gérer",
  },
  {
    title: "Abonnements",
    description:
      "Donner un plan a une flotte avec date d'expiration ou permanence.",
    href: ROUTE_PATHS.dashboardAdminSubscriptions,
    icon: CreditCard,
    cta: "Attribuer",
    superAdminOnly: true,
  },
  {
    title: "Utilisateurs",
    description: "Créer, suivre et gérer les comptes et leurs accès.",
    href: ROUTE_PATHS.dashboardAdminDemo,
    icon: KeyRound,
    cta: "Ouvrir",
  },
] as const;

export default function AdminDashboardPage() {
  const { isSuperAdmin } = useRoleAccess();
  const actions = ADMIN_ACTIONS.filter(
    (action) => !("superAdminOnly" in action) || isSuperAdmin,
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Shield className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Administration</h1>
            <p className="text-sm text-muted-foreground">
              Pilotage plateforme et gestion des accès.
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {actions.map((action) => (
          <Card key={action.href} className="rounded-lg">
            <CardHeader className="flex flex-row items-start gap-3 space-y-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                <action.icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <CardTitle className="text-base">{action.title}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {action.description}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full gap-2">
                <Link to={action.href}>{action.cta}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
