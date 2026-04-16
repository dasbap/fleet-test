import * as Sentry from "@sentry/react";
import { lazy, Suspense } from "react";
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

const App = () => (
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
    {/* Router en premier : HelpProvider, PageSEO et les toasts utilisent useLocation / la navigation. */}
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Providers>
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
      </Providers>
    </BrowserRouter>
  </Sentry.ErrorBoundary>
);

export default App;
