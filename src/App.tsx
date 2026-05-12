import * as Sentry from "@sentry/react";
import { lazy, Suspense, type ReactNode } from "react";
import Providers from "@/components/Providers";
import { PageSEO } from "@/components/PageSEO";
import { BrowserRouter, Routes } from "react-router-dom";
import { WebVitalsRouteSync } from "@/components/WebVitalsRouteSync";
import { PostHogPageViewSync } from "@/components/analytics/PostHogPageViewSync";
import { RoutePageFallback } from "@/components/RoutePageFallback";
import { appRoutes } from "@/app/routes/app.routes";
import { AppErrorFallback } from "@/components/errors/AppErrorFallback";
import { HelpProvider } from "@/context/HelpContext";
import { logError } from "@/lib/logging";

const DeepLinkListener = lazy(() =>
  import("@/components/navigation/DeepLinkListener").then((module) => ({
    default: module.DeepLinkListener,
  }))
);

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

// Import dynamique : @clerk/clerk-react n'est chargé que si la clé est présente.
// Quand VITE_CLERK_PUBLISHABLE_KEY est absent, ce code est tree-shaké par Rollup.
const ClerkProviderLazy = CLERK_KEY
  ? lazy(() =>
      import("@clerk/clerk-react").then((m) => ({
        default: ({ children }: { children: ReactNode }) => (
          <m.ClerkProvider publishableKey={CLERK_KEY}>{children}</m.ClerkProvider>
        ),
      }))
    )
  : null;

const AppContent = () => (
  <Sentry.ErrorBoundary
    fallback={AppErrorFallback}
    onError={(error, componentStack, eventId) => {
      logError("Erreur capturée par la boundary racine", error, {
        source: "error-boundary",
        componentStack,
        eventId,
      });
    }}
  >
    <Providers>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <HelpProvider>
          <WebVitalsRouteSync />
          <PostHogPageViewSync />
          <Suspense fallback={null}>
            <DeepLinkListener />
          </Suspense>
          <PageSEO />
          <Suspense fallback={<RoutePageFallback />}>
            <Routes>{appRoutes}</Routes>
          </Suspense>
        </HelpProvider>
      </BrowserRouter>
    </Providers>
  </Sentry.ErrorBoundary>
);

// ClerkProvider enveloppe l'app si la clé est présente (chargé dynamiquement).
// L'auth Supabase reste active par défaut (VITE_AUTH_PROVIDER=supabase).
const App = () =>
  ClerkProviderLazy ? (
    <Suspense fallback={null}>
      <ClerkProviderLazy>
        <AppContent />
      </ClerkProviderLazy>
    </Suspense>
  ) : (
    <AppContent />
  );

export default App;
