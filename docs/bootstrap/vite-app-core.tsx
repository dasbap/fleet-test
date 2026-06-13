/**
 * Référence bootstrap — cœur applicatif E-Samba.
 *
 * Ce fichier documente les modules réels du dépôt.
 * Il n'est PAS importé par l'app : guide de navigation pour dev / audit.
 *
 * Tableau demandé : authStore + useAuth + useOrg + App.tsx + DashboardLayout
 */

// =============================================================================
// authStore — N'EXISTE PAS dans ce dépôt
// =============================================================================
//
// L'état auth est géré par React Context, pas Zustand :
//
//   src/contexts/auth-context.ts      → type AuthContextValue
//   src/contexts/AuthProvider.tsx     → SupabaseAuthProvider | MockAuthProvider
//   src/hooks/useAuthContext.ts       → lecture du contexte
//
// Clés localStorage :
//   sfa_auth_token          — session Supabase
//   esamba.active_fleet_id  — flotte active multi-tenant

// =============================================================================
// useAuth — hook public
// =============================================================================
//
// Fichier : src/hooks/useAuth.ts
//
// export function useAuth() {
//   return useAuthContext();
// }
//
// Valeurs exposées (AuthContextValue) :
//   user, session, role, memberships
//   userFleetId, orgId, activeTenantContext, tenantOptions
//   isLoading, setActiveFleetId, refreshMemberships, refreshUser
//
// Actions (hors hook, évite vendor-supabase sur routes publiques) :
//   src/lib/auth-actions.ts → signIn, signOut, etc.

// =============================================================================
// useOrg — N'EXISTE PAS — équivalent via useAuth
// =============================================================================
//
// const { orgId, activeTenantContext, tenantOptions } = useAuth();
//
// activeTenantContext : { orgId, fleetId, role }
// Hooks billing / rétention consomment orgId depuis useAuth.

// =============================================================================
// App.tsx — point d'entrée React Router
// =============================================================================
//
// Fichier : src/App.tsx
//
// LazySentryErrorBoundary
//   └─ Providers (Query, Theme, Toasts)
//        └─ BrowserRouter (flags v7)
//             └─ HelpProvider
//                  ├─ WebVitalsRouteSync, PostHogPageViewSync
//                  ├─ DeepLinkListener (lazy, Capacitor)
//                  ├─ PageSEO
//                  └─ Routes → appRoutes (src/app/routes/app.routes.tsx)
//
// Montage auth : AuthProviderLayout wrappe routes /auth, /onboarding, /dashboard

// =============================================================================
// DashboardLayout — shell dashboard web vs mobile
// =============================================================================
//
// Fichier : src/components/dashboard/DashboardLayout.tsx
//
// if (isNativePlatform()) → MobileLayout (onglets bas)
// else → SidebarProvider + DashboardSidebar + DashboardHeader + Outlet
//
// Intègre : OfflineBanner, ActivationBanner, useRealtimeNotifications,
//           NotificationsPermissionGate (lazy)

export const APP_CORE_PATHS = {
  authStore: null as string | null,
  useAuth: "src/hooks/useAuth.ts",
  useAuthContext: "src/hooks/useAuthContext.ts",
  authProvider: "src/contexts/AuthProvider.tsx",
  authActions: "src/lib/auth-actions.ts",
  useOrg: null as string | null,
  useOrgEquivalent: "useAuth().orgId + activeTenantContext",
  app: "src/App.tsx",
  main: "src/main.tsx",
  appRoutes: "src/app/routes/app.routes.tsx",
  dashboardRoutes: "src/app/routes/dashboard.routes.tsx",
  dashboardLayout: "src/components/dashboard/DashboardLayout.tsx",
  mobileLayout: "src/layouts/MobileLayout.tsx",
  supabaseClient: "src/integrations/supabase/client.ts",
  protectedRoute: "src/navigation/guards/ProtectedRoute.tsx",
} as const;

/** Schéma minimal pour un nouveau projet (inspiré du dépôt, simplifié). */
export function MinimalAppShellReference() {
  return (
    <div data-reference-only>
      {/* Voir src/App.tsx et src/components/dashboard/DashboardLayout.tsx */}
    </div>
  );
}
