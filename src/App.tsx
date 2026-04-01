import * as Sentry from "@sentry/react";
import { Suspense } from "react";
import Providers from "@/components/Providers";
import { PageSEO } from "@/components/PageSEO";
import { OfflinePendingSyncBridge } from "@/components/OfflinePendingSyncBridge";
import { BrowserRouter, Routes } from "react-router-dom";
import { RoutePageFallback } from "@/components/RoutePageFallback";
import { DeepLinkListener } from "@/components/navigation/DeepLinkListener";
import { PushNotificationBridge } from "@/components/mobile/PushNotificationBridge";
import { appRoutes } from "@/app/routes/app.routes";
import { AppErrorFallback } from "@/components/errors/AppErrorFallback";
import { logError } from "@/lib/logging";

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
    <Providers>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <DeepLinkListener />
        <PushNotificationBridge />
        <PageSEO />
        <OfflinePendingSyncBridge />
        <Suspense fallback={<RoutePageFallback />}>
          <Routes>{appRoutes}</Routes>
        </Suspense>
      </BrowserRouter>
    </Providers>
  </Sentry.ErrorBoundary>
);

export default App;
