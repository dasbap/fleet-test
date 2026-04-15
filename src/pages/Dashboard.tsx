import { lazy, Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useActionableDashboard } from "@/hooks/useActionableDashboard";
import { ActionableDashboard, ActionableDashboardSkeleton } from "@/components/dashboard/ActionableDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useFeedbackPrompt } from "@/hooks/useFeedbackPrompt";
import type { DashboardAlert } from "@/types/dashboard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const J30_DONE_KEY = "esamba_feedback_j30_done";

/** Bloc secondaire chargé à la demande (INP : moins de JS sur le chemin critique). */
const EmptyStateDashboardLazy = lazy(() =>
  import("@/components/dashboard/EmptyStateDashboard").then((m) => ({ default: m.EmptyStateDashboard })),
);
const FailureRiskPanelLazy = lazy(() =>
  import("@/components/dashboard/FailureRiskPanel").then((m) => ({ default: m.FailureRiskPanel })),
);
const WhatsappMonitoringPanelLazy = lazy(() =>
  import("@/components/dashboard/WhatsappMonitoringPanel").then((m) => ({ default: m.WhatsappMonitoringPanel })),
);
const FeedbackWidgetLazy = lazy(() =>
  import("@/components/shared/FeedbackWidget").then((m) => ({ default: m.FeedbackWidget })),
);

function EmptyStateDashboardFallback() {
  return (
    <div className="rounded-card border border-surface-raised bg-surface p-6 space-y-4 min-h-[12rem]">
      <Skeleton className="h-8 w-48 mx-auto rounded-md" />
      <Skeleton className="h-4 w-full max-w-md mx-auto" />
      <div className="flex flex-wrap gap-2 justify-center">
        <Skeleton className="h-10 w-32 rounded-card" />
        <Skeleton className="h-10 w-32 rounded-card" />
      </div>
    </div>
  );
}

function SecondaryPanelFallback() {
  return (
    <Card className="min-h-[20rem]">
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-3/4" />
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, userFleetId, isLoading: authLoading } = useAuth();
  const actionable = useActionableDashboard();
  const { alerts, resolveAlert } = actionable;

  const feedbackPrompt = useFeedbackPrompt({
    userId: user?.id ?? "",
    fleetId: userFleetId,
  });
  const fireFeedbackPromptRef = useRef(feedbackPrompt.fire);
  fireFeedbackPromptRef.current = feedbackPrompt.fire;

  const dismissFeedbackPrompt = useCallback(() => {
    if (feedbackPrompt.trigger === "first_month" && user?.id) {
      localStorage.setItem(`${J30_DONE_KEY}_${user.id}`, "1");
    }
    feedbackPrompt.dismiss();
  }, [feedbackPrompt, user?.id]);

  const resolveAlertWithFeedback = useCallback(
    async (alertId: string, action: DashboardAlert["action"]) => {
      const row = alerts.find((a) => a.id === alertId);
      await resolveAlert(alertId, action);
      if (row?.severity === "critical" && user?.id && userFleetId) {
        feedbackPrompt.fire("alert_resolved", alertId, "alert");
      }
    },
    [alerts, resolveAlert, feedbackPrompt, user?.id, userFleetId],
  );

  useEffect(() => {
    if (!user?.id || !userFleetId || !user.created_at) return;
    if (localStorage.getItem(`${J30_DONE_KEY}_${user.id}`)) return;
    const created = new Date(user.created_at).getTime();
    const days = (Date.now() - created) / (86400 * 1000);
    if (days < 30 || days > 45) return;
    fireFeedbackPromptRef.current("first_month");
  }, [user?.id, user?.created_at, userFleetId]);

  const dashboardWelcomeName = useMemo(() => {
    if (!user) return undefined;
    const raw = user.user_metadata?.full_name;
    if (typeof raw === "string" && raw.trim()) {
      return raw.trim().split(/\s+/)[0];
    }
    if (user.email) return user.email.split("@")[0];
    return undefined;
  }, [user]);

  if (authLoading || actionable.coreLoading || !actionable.kpis) {
    return (
      <div className="p-6 space-y-5">
        <ActionableDashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <ActionableDashboard
        kpis={actionable.kpis}
        alerts={actionable.alerts}
        scheduledJobs={actionable.scheduledJobs}
        avgKm={actionable.avgKm}
        todayRevenueXaf={actionable.todayRevenueXaf}
        totalVehicles={actionable.totalVehicles}
        onNavigateVehicle={(vehicleId) => void navigate(`/dashboard/vehicles/${vehicleId}`)}
        onNavigateAlerts={() => void navigate("/dashboard/alerts")}
        onNavigateMaintenance={() => void navigate("/dashboard/maintenance")}
        onResolveAlert={resolveAlertWithFeedback}
      />
      <Suspense fallback={<SecondaryPanelFallback />}>
        <FailureRiskPanelLazy />
      </Suspense>
      <Suspense fallback={<SecondaryPanelFallback />}>
        <WhatsappMonitoringPanelLazy />
      </Suspense>

      {actionable.kpis.activeVehicles === 0 ? (
        <div className="rounded-card border border-surface-raised bg-surface p-2">
          <Suspense fallback={<EmptyStateDashboardFallback />}>
            <EmptyStateDashboardLazy
              userName={dashboardWelcomeName}
              onAddVehicle={() => navigate("/dashboard/vehicles")}
              onConfigureAlerts={() => navigate("/dashboard/settings")}
              onInviteTeam={() => navigate("/dashboard/teams")}
              onDemoData={() => navigate("/dashboard/settings")}
            />
          </Suspense>
        </div>
      ) : null}

      {feedbackPrompt.show && user?.id && userFleetId ? (
        <Suspense fallback={null}>
          <FeedbackWidgetLazy
            trigger={feedbackPrompt.trigger}
            entityId={feedbackPrompt.entityId}
            entityType={feedbackPrompt.entityType}
            onDismiss={dismissFeedbackPrompt}
            position="bottom-right"
          />
        </Suspense>
      ) : null}
    </div>
  );
}
