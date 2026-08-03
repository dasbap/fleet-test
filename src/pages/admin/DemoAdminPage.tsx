/**
 * DemoAdminPage - page d'administration des acces demo E-Samba.
 *
 * Accessible uniquement aux admins plateforme (is_platform_admin()).
 * Onglets : Sessions actives | Creer un acces.
 *
 * Route : /dashboard/admin/demo
 */

import { Link, Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useAdminDemoAccounts } from "@/hooks/useAdminDemoAccounts";
import { DemoSessionsPanel } from "@/components/admin/DemoSessionsPanel";
import { CreateDemoForm } from "@/components/admin/CreateDemoForm";
import { ROUTE_PATHS } from "@/navigation/routePaths";

export default function DemoAdminPage() {
  const { isAdmin, isSuperAdmin, isLoading: isRoleAccessLoading } = useRoleAccess();
  const {
    sessions,
    isLoading,
    reload,
    createAccess,
    suspendAccount,
    reactivateAccount,
    updateAccountExpiration,
    deleteAccount,
    resetFleet,
    generateMagicLink,
  } = useAdminDemoAccounts();

  if (isRoleAccessLoading) {
    return null;
  }

  if (!isAdmin) {
    return <Navigate to={ROUTE_PATHS.dashboard} replace />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Acces demo E-Samba</h1>
          <p className="text-muted-foreground text-sm">
            Gestion des comptes demo prospects, investisseurs et equipe interne.
            Toutes les actions sont auditees.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to={ROUTE_PATHS.dashboardAdminUsers}>Admin comptes</Link>
        </Button>
      </div>

      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions" className="gap-1.5">
            <Users className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="create" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Creer un acces
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-6">
          <DemoSessionsPanel
            sessions={sessions}
            isLoading={isLoading}
            onReload={reload}
            onSuspend={suspendAccount}
            onReactivate={reactivateAccount}
            onUpdateExpiration={updateAccountExpiration}
            onDelete={deleteAccount}
            onResetFleet={resetFleet}
            onGenerateMagicLink={generateMagicLink}
          />
        </TabsContent>

        <TabsContent value="create" className="mt-6">
          <div className="max-w-md">
            <div className="rounded-lg border p-6 space-y-2">
              <h2 className="text-base font-semibold">Nouvel acces demo</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Cree un compte prospect et genere un magic link a partager.
              </p>
              <CreateDemoForm
                onSubmit={createAccess}
                onSuccess={() => void reload()}
                canCreatePermanentAccess={isSuperAdmin}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
