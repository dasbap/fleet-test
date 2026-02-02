import { Car, MoreVertical, MapPin, User, Fuel } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const vehicles = [
  {
    id: "1",
    plate: "LT 1234 A",
    model: "Toyota Corolla 2022",
    driver: "Alain Mbarga",
    status: "active",
    km: 45230,
    fuel: 75,
    location: "Douala, Akwa",
  },
  {
    id: "2",
    plate: "LT 5678 B",
    model: "Hyundai Elantra 2021",
    driver: "Marie Essomba",
    status: "active",
    km: 62150,
    fuel: 45,
    location: "Douala, Bonapriso",
  },
  {
    id: "3",
    plate: "LT 9012 C",
    model: "Nissan Sunny 2020",
    driver: "Non assigné",
    status: "maintenance",
    km: 89340,
    fuel: 20,
    location: "Atelier central",
  },
  {
    id: "4",
    plate: "LT 3456 D",
    model: "Toyota Yaris 2023",
    driver: "Paul Ndjock",
    status: "active",
    km: 12450,
    fuel: 90,
    location: "Douala, Deido",
  },
  {
    id: "5",
    plate: "LT 7890 E",
    model: "Kia Rio 2021",
    driver: "Non assigné",
    status: "blocked",
    km: 78900,
    fuel: 5,
    location: "Douala, Bassa",
  },
];

const statusConfig = {
  active: { label: "Actif", variant: "default" as const, className: "bg-success text-success-foreground" },
  maintenance: { label: "Entretien", variant: "secondary" as const, className: "bg-warning text-warning-foreground" },
  blocked: { label: "Bloqué", variant: "destructive" as const, className: "" },
};

const FleetOverview = () => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-heading">Aperçu de la flotte</CardTitle>
        <Button variant="outline" size="sm">
          Voir tout
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              {/* Vehicle Icon */}
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Car className="w-6 h-6 text-primary" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{vehicle.plate}</span>
                  <Badge
                    className={cn(
                      statusConfig[vehicle.status].className
                    )}
                    variant={statusConfig[vehicle.status].variant}
                  >
                    {statusConfig[vehicle.status].label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {vehicle.model}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{vehicle.driver}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{vehicle.location}</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="hidden md:flex items-center gap-6">
                <div className="text-center">
                  <div className="text-sm font-medium">{vehicle.km.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">km</div>
                </div>
                <div className="flex items-center gap-1">
                  <Fuel className="w-4 h-4 text-muted-foreground" />
                  <div className={cn(
                    "text-sm font-medium",
                    vehicle.fuel < 25 ? "text-destructive" : vehicle.fuel < 50 ? "text-warning-foreground" : "text-success"
                  )}>
                    {vehicle.fuel}%
                  </div>
                </div>
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Voir détails</DropdownMenuItem>
                  <DropdownMenuItem>Modifier</DropdownMenuItem>
                  <DropdownMenuItem>Historique</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default FleetOverview;
