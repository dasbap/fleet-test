import { Car, Users, AlertTriangle, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const stats = [
  {
    label: "Véhicules actifs",
    value: "42",
    change: "+3",
    trend: "up",
    icon: Car,
    color: "primary",
  },
  {
    label: "Chauffeurs en service",
    value: "38",
    change: "-2",
    trend: "down",
    icon: Users,
    color: "info",
  },
  {
    label: "Alertes en attente",
    value: "7",
    change: "+4",
    trend: "up",
    icon: AlertTriangle,
    color: "warning",
  },
  {
    label: "Recettes du jour",
    value: "2.4M",
    suffix: "FCFA",
    change: "+12%",
    trend: "up",
    icon: DollarSign,
    color: "success",
  },
];

const DashboardStats = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="relative overflow-hidden group hover:border-primary/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl md:text-3xl font-heading font-bold">
                    {stat.value}
                  </span>
                  {stat.suffix && (
                    <span className="text-sm text-muted-foreground">{stat.suffix}</span>
                  )}
                </div>
                <div className={cn(
                  "flex items-center gap-1 mt-2 text-sm",
                  stat.trend === "up" ? "text-success" : "text-destructive"
                )}>
                  {stat.trend === "up" ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{stat.change}</span>
                </div>
              </div>
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                stat.color === "primary" && "bg-primary/10 text-primary",
                stat.color === "info" && "bg-info/10 text-info",
                stat.color === "warning" && "bg-warning/10 text-warning-foreground",
                stat.color === "success" && "bg-success/10 text-success"
              )}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
          {/* Gradient accent */}
          <div className={cn(
            "absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity",
            stat.color === "primary" && "bg-gradient-to-r from-primary to-primary/50",
            stat.color === "info" && "bg-gradient-to-r from-info to-info/50",
            stat.color === "warning" && "bg-gradient-to-r from-warning to-warning/50",
            stat.color === "success" && "bg-gradient-to-r from-success to-success/50"
          )} />
        </Card>
      ))}
    </div>
  );
};

export default DashboardStats;
