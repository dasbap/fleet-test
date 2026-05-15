import { lazy } from "react";
import { Route } from "react-router-dom";
import { RequireGuest } from "@/navigation/guards/RequireGuest";

/** Code-split : n’alourdit pas le chargement initial de la landing ni des pages sans auth. */
const AuthPage = lazy(() => import("@/features/auth/screens/AuthPage"));
const MobileLoginScreen = lazy(() => import("@/features/auth/screens/MobileLoginScreen"));

/**
 * Routes publiques auth.
 * Export JSX direct compatible React Router v6 sous `<Routes>`.
 */
export const authPublicRoutes = (
  <>
    <Route
      path="/login"
      element={
        <RequireGuest>
          <MobileLoginScreen />
        </RequireGuest>
      }
    />
    <Route
      path="/auth"
      element={
        <RequireGuest>
          <AuthPage />
        </RequireGuest>
      }
    />
  </>
);
