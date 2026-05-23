/**
 * DemoAdminPage — page d'administration des accès démo E-Samba.
 *
 * Accessible uniquement aux admins plateforme (is_platform_admin()).
 * Onglets : Sessions actives | Créer un accès.
 *
 * Route : /dashboard/admin/demo
 */

import { useRoleAccess } from "@/hooks/useRoleAccess";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Plus } from "lucide-react";
import { useAdminDemoAccounts } from "@/hooks/useAdminDemoAccounts";
import { DemoSessionsPanel } from "@/components/admin/DemoSessionsPanel";
import { CreateDemoForm }    from "@/components/admin/CreateDemoForm";

export default function DemoAdminPage() {
  const { isAdmin, rbac } = useRoleAccess();
  const {
    sessions,
    demoFleets,
    isLoading,
    reload,
    createAccess,
    suspendAccount,
    reactivateAccount,
    resetFleet,
    generateMagicLink,
  } = useAdminDemoAccounts();

  if (rbac.isLoading) {
    return null;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">

      {/* En-tête de page */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Accès démo E-Samba</h1>
        <p className="text-muted-foreground text-sm">
          Gestion des comptes démo prospects, investisseurs et équipe interne.
          Toutes les actions sont auditées.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions" className="gap-1.5">
            <Users className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="create" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Créer un accès
          </TabsTrigger>
        </TabsList>

        {/* Onglet Sessions */}
        <TabsContent value="sessions" className="mt-6">
          <DemoSessionsPanel
            sessions={sessions}
            isLoading={isLoading}
            onReload={reload}
            onSuspend={suspendAccount}
            onReactivate={reactivateAccount}
            onResetFleet={resetFleet}
            onGenerateMagicLink={generateMagicLink}
          />
        </TabsContent>

        {/* Onglet Créer */}
        <TabsContent value="create" className="mt-6">
          <div className="max-w-md">
            <div className="rounded-lg border p-6 space-y-2">
              <h2 className="text-base font-semibold">Nouvel accès démo</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Crée un compte prospect et génère un magic link à partager.
              </p>
              <CreateDemoForm
                demoFleets={demoFleets}
                onSubmit={createAccess}
                onSuccess={() => void reload()}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
