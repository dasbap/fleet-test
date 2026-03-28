import { Card, CardContent } from "@/components/ui/card";
import { MapPin, User } from "lucide-react";

interface VehicleCirculationRowProps {
  label: string;
  driver: string;
  route: string;
}

export function VehicleCirculationCard({ label, driver, route }: VehicleCirculationRowProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="font-medium">{label}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {driver}
        </p>
        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {route}
        </p>
      </CardContent>
    </Card>
  );
}
