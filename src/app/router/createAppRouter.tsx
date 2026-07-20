import {
  createBrowserRouter,
  createRoutesFromElements,
  type RouteObject,
} from "react-router-dom";
import { appRoutes } from "@/app/routes/app.routes";

/**
 * Esquisse de migration vers Data Router (React Router v6.4+).
 * Non branchée par défaut : `App.tsx` continue d'utiliser BrowserRouter + Routes.
 */
export function buildAppRouteObjects(): RouteObject[] {
  return createRoutesFromElements(appRoutes);
}

export function createAppRouter() {
  return createBrowserRouter(buildAppRouteObjects(), {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  });
}
