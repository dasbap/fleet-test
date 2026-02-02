import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Clock, Wrench, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRecentActivity } from "@/hooks/useDashboardStats";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const getActivityConfig = (activity: { type: string; status?: string }) => {
  switch (activity.type) {
    case 'closure':
      if (activity.status === 'validated') {
        return { icon: CheckCircle2, color: 'success' };
      } else if (activity.status === 'rejected') {
        return { icon: FileWarning, color: 'destructive' };
      }
      return { icon: Clock, color: 'warning' };
    case 'incident':
      return { icon: AlertTriangle, color: 'warning' };
    case 'maintenance':
      if (activity.status === 'ready') {
        return { icon: CheckCircle2, color: 'success' };
      }
      return { icon: Wrench, color: 'info' };
    default:
      return { icon: Clock, color: 'primary' };
  }
};

const RecentActivity = () => {
  const { data: activities, isLoading } = useRecentActivity();

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="font-heading">Activité récente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-heading">Activité récente</CardTitle>
      </CardHeader>
      <CardContent>
        {!activities || activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune activité récente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const config = getActivityConfig(activity);
              const Icon = config.icon;
              
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      config.color === "success" && "bg-success/10 text-success",
                      config.color === "warning" && "bg-warning/10 text-warning-foreground",
                      config.color === "info" && "bg-info/10 text-info",
                      config.color === "primary" && "bg-primary/10 text-primary",
                      config.color === "destructive" && "bg-destructive/10 text-destructive"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.message}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.detail}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(activity.time, { addSuffix: true, locale: fr })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
