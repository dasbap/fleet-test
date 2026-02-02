import { Car, MoreVertical, User, AlertCircle, CheckCircle, Wrench } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Mock data - will be replaced with real data from Supabase
const mockVehicles = [
  {
    id: "1",
    plate: "LT 1234 A",
    brand: "Toyota",
    model: "Corolla",
    year: 2022,
    km: 45230,
    status: "active" as const,
    driver: "Alain Mbarga",
  },
  {
    id: "2",
    plate: "LT 5678 B",
    brand: "Hyundai",
    model: "Elantra",
    year: 2021,
    km: 62150,
    status: "active" as const,
    driver: "Marie Essomba",
  },
  {
    id: "3",
    plate: "LT 9012 C",
    brand: "Nissan",
    model: "Sunny",
    year: 2020,
    km: 89340,
    status: "maintenance" as const,
    driver: null,
  },
  {
    id: "4",
    plate: "LT 3456 D",
    brand: "Toyota",
    model: "Yaris",
    year: 2023,
    km: 12450,
    status: "active" as const,
    driver: "Paul Ndjock",
  },
  {
    id: "5",
    plate: "LT 7890 E",
    brand: "Kia",
    model: "Rio",
    year: 2021,
    km: 78900,
    status: "blocked" as const,
    driver: null,
  },
];

const statusConfig = {
  active: {
    label: "Actif",
    icon: CheckCircle,
    className: "bg-success/10 text-success border-success/20",
  },
  maintenance: {
    label: "Entretien",
    icon: Wrench,
    className: "bg-warning/10 text-warning border-warning/20",
  },
  blocked: {
    label: "Bloqué",
    icon: AlertCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

const VehiclesTable = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Liste des véhicules</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Véhicule</TableHead>
              <TableHead>Immatriculation</TableHead>
              <TableHead>Kilométrage</TableHead>
              <TableHead>Chauffeur</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockVehicles.map((vehicle) => {
              const StatusIcon = statusConfig[vehicle.status].icon;
              return (
                <TableRow key={vehicle.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Car className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {vehicle.brand} {vehicle.model}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {vehicle.year}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono font-semibold">{vehicle.plate}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{vehicle.km.toLocaleString()}</span>
                    <span className="text-muted-foreground ml-1">km</span>
                  </TableCell>
                  <TableCell>
                    {vehicle.driver ? (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>{vehicle.driver}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Non assigné</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1",
                        statusConfig[vehicle.status].className
                      )}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig[vehicle.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Voir détails</DropdownMenuItem>
                        <DropdownMenuItem>Modifier</DropdownMenuItem>
                        <DropdownMenuItem>Affecter chauffeur</DropdownMenuItem>
                        <DropdownMenuItem>Historique</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default VehiclesTable;
