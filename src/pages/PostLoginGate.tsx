import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBilling } from "@/hooks/useBilling";
import { getSafePostLoginPath } from "@/navigation/postLoginRedirect";
import { ROUTE_PATHS } from "@/navigation/routePaths";

/** Fenêtre de détection première connexion : created_at ≈ last_sign_in_at (60s). */
const FIRST_LOGIN_WINDOW_MS = 60_000;
/** Délai max d'attente orgId/fleetId avant de forcer la navigation. */
const MAX_WAIT_MS = 4_000;

function detectFirstLogin(createdAt?: string, lastSignInAt?: string | null): boolean {
  if (!createdAt) return false;
  if (!lastSignInAt) return true;
  return (
    Math.abs(new Date(lastSignInAt).getTime() - new Date(createdAt).getTime()) <
    FIRST_LOGIN_WINDOW_MS
  );
}

/**
 * PostLoginGate — aiguillage post-connexion selon :
 *  1. Adhésion présente ou non (flotte créée)
 *  2. Première connexion (created_at ≈ last_sign_in_at)
 *  3. Plan tarifaire (free = pas d'abonnement actif / paid = abonnement actif)
 */
export default function PostLoginGate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [timedOut, setTimedOut] = useState(false);

  const {
    user,
    session,
    memberships,
    orgId,
    activeTenantContext,
    isLoading: authLoading,
  } = useAuth();

  const fleetId = activeTenantContext?.fleetId ?? null;
  const hasMemberships = memberships.length > 0;

  /** Cible ?next= validée (évite open redirect et boucle /post-login). */
  const nextTarget = useMemo(() => {
    const raw = getSafePostLoginPath(searchParams.get("next")) ?? ROUTE_PATHS.dashboard;
    return raw.startsWith("/post-login") ? ROUTE_PATHS.dashboard : raw;
  }, [searchParams]);

  /** Billing activé uniquement si orgId + fleetId résolus. */
  const { data: billing, isLoading: billingLoading } = useBilling(
    hasMemberships ? orgId : null,
    hasMemberships ? fleetId : null,
  );

  /**
   * Watchdog : après MAX_WAIT_MS, on force la navigation même si orgId/billing
   * ne sont pas encore chargés (évite un écran bloqué sur réseau lent 2G/3G).
   */
  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), MAX_WAIT_MS);
    return () => clearTimeout(id);
  }, []);

  const orgAndFleetReady = !hasMemberships || Boolean(orgId && fleetId);
  const billingReady = !Boolean(orgId && fleetId) || !billingLoading;
  const isReady = !authLoading && (timedOut || (orgAndFleetReady && billingReady));

  useEffect(() => {
    if (!isReady) return;

    // 1. Non authentifié → login
    if (!user) {
      navigate(ROUTE_PATHS.auth, { replace: true });
      return;
    }

    // 2. Aucune adhésion → création de flotte
    if (!hasMemberships) {
      navigate("/start", { replace: true });
      return;
    }

    // 3. Flotte existante → décision basée sur première connexion + plan
    const lastSignInAt = session?.user?.last_sign_in_at ?? null;
    const firstLogin = detectFirstLogin(user.created_at, lastSignInAt);
    const freePlan = !billing?.subscription;

    if (firstLogin) {
      // Première connexion : orienter vers le dashboard avec banner d'accueil
      navigate(`${ROUTE_PATHS.dashboard}?welcome=true`, { replace: true });
    } else if (freePlan) {
      // Plan gratuit revenant : destination prévue (le dashboard gèrera le nudge upgrade)
      navigate(nextTarget, { replace: true });
    } else {
      // Plan payant : destination prévue directement
      navigate(nextTarget, { replace: true });
    }
  }, [isReady, user, hasMemberships, billing, session, navigate, nextTarget]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Chargement de votre espace…</p>
      </div>
    </div>
  );
}
