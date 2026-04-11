import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useActionableDashboard } from "@/hooks/useActionableDashboard";
import { ActionableDashboard, ActionableDashboardSkeleton } from "@/components/dashboard/ActionableDashboard";
import { EmptyStateDashboard } from "@/components/dashboard/EmptyStateDashboard";
import { useAuth } from "@/hooks/useAuth";
import { useFeedbackPrompt } from "@/hooks/useFeedbackPrompt";
import { FeedbackWidget } from "@/components/shared/FeedbackWidget";
import type { DashboardAlert } from "@/types/dashboard";

const J30_DONE_KEY = "esamba_feedback_j30_done";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, userFleetId, isLoading: authLoading } = useAuth();
  const actionable = useActionableDashboard();

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
      const row = actionable.alerts.find((a) => a.id === alertId);
      await actionable.resolveAlert(alertId, action);
      if (row?.severity === "critical" && user?.id && userFleetId) {
        feedbackPrompt.fire("alert_resolved", alertId, "alert");
      }
    },
    [actionable.alerts, actionable.resolveAlert, feedbackPrompt, user?.id, userFleetId],
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

  if (authLoading || actionable.loading || !actionable.kpis) {
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

      {actionable.kpis.activeVehicles === 0 ? (
        <div className="rounded-card border border-surface-raised bg-surface p-2">
          <EmptyStateDashboard
            userName={dashboardWelcomeName}
            onAddVehicle={() => navigate("/dashboard/vehicles")}
            onConfigureAlerts={() => navigate("/dashboard/settings")}
            onInviteTeam={() => navigate("/dashboard/teams")}
            onDemoData={() => navigate("/dashboard/settings")}
          />
        </div>
      ) : null}

      {feedbackPrompt.show && user?.id && userFleetId ? (
        <FeedbackWidget
          trigger={feedbackPrompt.trigger}
          entityId={feedbackPrompt.entityId}
          entityType={feedbackPrompt.entityType}
          onDismiss={dismissFeedbackPrompt}
          position="bottom-right"
        />
      ) : null}
    </div>
  );
}
