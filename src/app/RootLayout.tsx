import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { AuthFlowProvider } from "@/hooks/AuthFlowProvider";
import { RoutePageFallback } from "@/components/RoutePageFallback";

export function RootLayout() {
  return (
    <AuthFlowProvider>
      <Suspense fallback={<RoutePageFallback />}>
        <Outlet />
      </Suspense>
    </AuthFlowProvider>
  );
}
