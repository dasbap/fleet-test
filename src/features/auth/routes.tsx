import { lazy } from "react";
import { Route } from "react-router-dom";
import { RequireGuest } from "@/navigation/guards/RequireGuest";

/** Code-split : n’alourdit pas le chargement initial de la landing ni des pages sans auth. */
const AuthPage          = lazy(() => import("@/features/auth/screens/AuthPage"));
const MobileLoginScreen = lazy(() => import("@/features/auth/screens/MobileLoginScreen"));
const HybridAuthPage    = lazy(() => import("@/components/auth/HybridAuthPage"));
const ForgotPasswordPage = lazy(() => import("@/features/auth/screens/ForgotPasswordPage"));
const MagicLinkPage      = lazy(() => import("@/features/auth/screens/MagicLinkPage"));

/**
 * Routes publiques auth.
 * - /login                → HybridAuthPage (OTP téléphone + email/password) — défaut mobile
 * - /login/v1             → MobileLoginScreen (ancienne page — conservée pour rollback)
 * - /auth                 → AuthPage complète (inscription, récupération mdp)
 * - /auth/forgot-password → ForgotPasswordPage (envoi lien reset, standalone)
 * - /auth/magic-link      → MagicLinkPage (connexion sans mot de passe)
 *
 * Note : /auth/callback et /auth/update-password sont déclarés dans app.routes.tsx
 * car ils ne doivent PAS être wrappés dans RequireGuest.
 */
export const authPublicRoutes = (
  <>
    <Route
      path="/login"
      element={
        <RequireGuest>
          <HybridAuthPage />
        </RequireGuest>
      }
    />
    <Route
      path="/login/v1"
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
    <Route
      path="/auth/forgot-password"
      element={
        <RequireGuest>
          <ForgotPasswordPage />
        </RequireGuest>
      }
    />
    <Route
      path="/auth/magic-link"
      element={
        <RequireGuest>
          <MagicLinkPage />
        </RequireGuest>
      }
    />
  </>
);
