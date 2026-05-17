import { lazy } from "react";
import { Route } from "react-router-dom";
import { RequireGuest } from "@/navigation/guards/RequireGuest";

/** Code-split : n’alourdit pas le chargement initial de la landing ni des pages sans auth. */
const AuthPage          = lazy(() => import("@/features/auth/screens/AuthPage"));
const MobileLoginScreen = lazy(() => import("@/features/auth/screens/MobileLoginScreen"));
const HybridAuthPage    = lazy(() => import("@/components/auth/HybridAuthPage"));

/**
 * Routes publiques auth.
 * - /login     → HybridAuthPage (OTP téléphone + email/password) — défaut mobile
 * - /login/v1  → MobileLoginScreen (ancienne page — conservée pour rollback)
 * - /auth      → AuthPage complète (inscription, récupération mdp)
 */
export const authPublicRoutes = (
  <>
    <Route
      path="/