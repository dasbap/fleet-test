import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Clock, Wrench, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const activities = [
  {
    id: "1",
    type: "closure",
    message: "Clôture journalière validée",
    detail: "LT 1234 A - Alain Mbarga",
    time: "Il y a 5 min",
    icon: CheckCircle2,
    color: "success",
  },
  {
    id: "2",
    type: "alert",
    message: "Entretien requis",
    detail: "LT 5678 B - Vidange à 65,000 km",
    time: "Il y a 23 min",
    icon: AlertTriangle,
    color: "warning",
  },
  {
    id: "3",
    type: "maintenance",
    message: "Intervention terminée",
    detail: "LT 9012 C - Remplacement freins",
    time: "Il y a 1h",
    icon: Wrench,
    color: "info",
  },
  {
    id: "4",
    type: "payment",
    message: "Paiement reçu",
    detail: "Flotte Akwa - 450,000 FCFA",
    time: "Il y a 2h",
    icon: DollarSign,
    color: "primary",
  },
  {
    id: "5",
    type: "pending",
    message: "Clôture en attente",
    detail: "LT 7890 E - 2 jours de retard",
    time: "Il y a 3h",
    icon: Clock,
    color: "destructive",
  },
];

const RecentActivity = () => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-heading">Activité récente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  activity.color === "success" && "bg-success/10 text-success",
                  activity.color === "warning" && "bg-warning/10 text-warning-foreground",
                  activity.color === "info" && "bg-info/10 text-info",
                  activity.color === "primary" && "bg-primary/10 text-primary",
                  activity.color === "destructive" && "bg-destructive/10 text-destructive"
                )}
              >
                <activity.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{activity.message}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {activity.detail}
                </p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {activity.time}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
