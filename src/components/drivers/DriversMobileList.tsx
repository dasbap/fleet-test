import { User, Car, Phone, MoreVertical, History, Calendar } from "lucide-react";
import { MobileCard } from "@/components/mobile/ui/MobileCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface DriverMobileRow {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  statusLabel: string;
  statusClassName?: string;
  vehicleRegistration?: string;
  scoreLabel?: string;
  terrainBadges?: string[];
  onProfile: () => void;
  onHistory: () => void;
  onPlan?: () => void;
}

interface DriversMobileListProps {
  drivers: DriverMobileRow[];
}

export function DriversMobileList({ drivers }: DriversMobileListProps) {
  return (
    <ul className="space-y-3" role="list">
      {drivers.map((d) => (
        <li key={d.user_id}>
          <MobileCard className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{d.full_name || "Sans nom"}</p>
                  {d.phone ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" aria-hidden />
                      {d.phone}
                    </p>
                  ) : null}
                  {d.vehicleRegistration ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Car className="h-3 w-3" aria-hidden />
                      {d.vehicleRegistration}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className={cn("text-[10px]", d.statusClassName)}>
                      {d.statusLabel}
                    </Badge>
                    {d.scoreLabel ? (
                      <Badge variant="secondary" className="text-[10px]">
                        {d.scoreLabel}
                      </Badge>
                    ) : null}
                    {d.terrainBadges?.map((b) => (
                      <Badge key={b} variant="outline" className="text-[10px]">
                        {b}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Actions conducteur">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={d.onProfile}>
                    <User className="mr-2 h-4 w-4" />
                    Voir fiche
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={d.onHistory}>
                    <History className="mr-2 h-4 w-4" />
                    Historique
                  </DropdownMenuItem>
                  {d.onPlan ? (
                    <DropdownMenuItem onClick={d.onPlan}>
                      <Calendar className="mr-2 h-4 w-4" />
                      Planifier
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </MobileCard>
        </li>
      ))}
    </ul>
  );
}
