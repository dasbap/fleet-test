import { Link, Navigate } from "react-router-dom";
import { Inbox, ListFilter, Plus, Users } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AllAccountsPanel } from "@/components/admin/AllAccountsPanel";
import { CreateDemoForm } from "@/components/admin/CreateDemoForm";
import { DemoRequestsPanel } from "@/components/admin/DemoRequestsPanel";
import { DemoSessionsPanel } from "@/components/admin/DemoSessionsPanel";
import { useAdminDemoAccounts } from "@/hooks/useAdminDemoAccounts";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { ROUTE_PATHS } from "@/navigation/routePaths";

export default function DemoAdminPage() {
  const {
    isAdmin,
    isSuperAdmin,
    isLoading: isRoleAccessLoading,
  } = useRoleAccess();

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
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Accès et comptes E-Samba
          </h1>

          <p className="text-sm text-muted-foreground">
            Gestion des demandes, utilisateurs, membres de flotte et accès
            internes.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link to={ROUTE_PATHS.dashboardAdminUsers}>Admin comptes</Link>
        </Button>
      </div>

      <Tabs defaultValue="requests">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="requests" className="gap-1.5">
            <Inbox className="h-4 w-4" />
            Demandes
          </TabsTrigger>

          <TabsTrigger value="sessions" className="gap-1.5">
            <Users className="h-4 w-4" />
            Sessions
          </TabsTrigger>

          <TabsTrigger value="all-accounts" className="gap-1.5">
            <ListFilter className="h-4 w-4" />
            Tous les comptes
          </TabsTrigger>

          <TabsTrigger value="create" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Créer un accès
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-6">
          <DemoRequestsPanel
            onCreateAccess={createAccess}
            onReloadSessions={reload}
          />
        </TabsContent>

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

        <TabsContent value="all-accounts" className="mt-6">
          <AllAccountsPanel />
        </TabsContent>

        <TabsContent value="create" className="mt-6">
          <div className="max-w-md">
            <div className="space-y-2 rounded-lg border p-6">
              <h2 className="text-base font-semibold">Nouvel accès utilisateur</h2>

              <p className="mb-4 text-sm text-muted-foreground">
                Crée un compte prospect et génère un accès à partager.
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
