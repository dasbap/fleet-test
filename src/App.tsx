import * as Sentry from "@sentry/react";
import { lazy, Suspense } from "react";
import { PageSEO } from "@/components/PageSEO";
import Providers from "@/components/Providers";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RoutePageFallback } from "@/components/RoutePageFallback";
import { DeepLinkListener } from "@/components/navigation/DeepLinkListener";
import { PushNotificationBridge } from "@/components/mobile/PushNotificationBridge";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const DashboardRouteGroup = lazy(() =>
  import("@/app/DashboardRouteGroup").then((m) => ({ default: m.DashboardRouteGroup }))
);

const App = () => (
  <Sentry.ErrorBoundary
    fallback={({ resetError }) => (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-muted-foreground text-center">
          Une erreur est survenue. Veuillez recharger la page.
        </p>
        <button
          type="button"
          onClick={() => (resetError ? resetError() : window.location.reload())}
          className="text-sm font-medium text-primary underline underline-offset-4 hover:no-underline"
        >
          Recharger la page
        </button>
      </div>
    )}
  >
    <Providers>
      <BrowserRouter>
        <DeepLinkListener />
        <PushNotificationBridge />
        <PageSEO />
        <Suspense fallback={<RoutePageFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/settings"
              element={<Navigate to="/dashboard/settings" replace />}
            />
            <DashboardRouteGroup />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </Providers>
  </Sentry.ErrorBoundary>
);

export default App;
