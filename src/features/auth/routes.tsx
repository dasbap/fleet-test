import { Route } from "react-router-dom";
import { RequireGuest } from "@/navigation/guards/RequireGuest";
import AuthPage from "@/features/auth/screens/AuthPage";
import MobileLoginScreen from "@/features/auth/screens/MobileLoginScreen";

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
