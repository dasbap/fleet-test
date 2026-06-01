import { lazy, Suspense } from "react";
import Providers from "@/components/Providers";
import { PageSEO } from "@/components/PageSEO";
import { BrowserRouter, Routes } from "react-router-dom";
import { WebVitalsRouteSync } from "@/components/WebVitalsRouteSync";
import { PostHogPageViewSync } from "@/components/analytics/PostHogPageViewSync";
import { RoutePageFallback } from "@/components/RoutePageFallback";
import { appRoutes } from "@/app/routes/app.routes";
import { LazySentryErrorBoundary } from "@/components/errors/LazySentryErrorBoundary";
import { HelpProvider } from "@/context/HelpContext";

const DeepLinkListener = lazy(() =>
  import("@/components/navigation/DeepLinkListener").then((module) => ({
    default: module.DeepLinkListener,
  }))
);

const AppContent = () => (
  <LazySentryErrorBoundary>
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
  </LazySentryErrorBoundary>
);

const App = () => <AppContent />;

export default App;
