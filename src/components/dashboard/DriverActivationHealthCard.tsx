import type { ElementType } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Phone, UserCheck, Users } from "lucide-react";
import { useFleetDriverActivationHealth } from "@/hooks/useFleetDriverActivationHealth";
import { usePermissions } from "@/hooks/usePermissions";

interface StatBlockProps {
  label: string;
  value: string;
  icon: ElementType;
  ok: boolean;
}

function StatBlock({ label, value, icon: Icon, ok }: StatBlockProps) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/40 p-2">
      <Icon className={`h-4 w-4 ${ok ? "text-emerald-500" : "text-amber-500"}`} aria-hidden />
      <span className="text-sm font-bold">{value}</span>
      <span className="text-center text-xs leading-tight text-muted-foreground">{label}</span>
    </div>
  );
}

/**
 * Affiche le taux d'activation terrain des chauffeurs : téléphone renseigné + créneau ouvert.
 * Réservé aux rôles avec accès backoffice (organizer, manager).
 * Données : RPC fleet_driver_activation_health via useFleetDriverActivationHealth.
 */
export function DriverActivationHealthCard() {
  const { canAccessBackoffice } = usePermissions();
  const { data, isLoading } = useFleetDriverActivationHealth();

  // Ne s'affiche que pour les gestionnaires, et uniquement si des chauffeurs existent
  if (!canAccessBackoffice || isLoading || !data || data.total_drivers === 0) return null;

  const { total_drivers, with_phone_count, never_shifted_count, pct_with_phone } = data;
  const activated = total_drivers - never_shifted_count;
  const pctActivated = total_drivers > 0 ? Math.round((activated / total_drivers) * 100) : 0;
  const missingPhone = total_drivers - with_phone_count;
  const allHealthy = missingPhone === 0 && never_shifted_count === 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
          Activation chauffeurs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <StatBlock
            label="Avec téléphone"
            value={`${with_phone_count}/${total_drivers}`}
            icon={Phone}
            ok={missingPhone === 0}
          />
          <StatBlock
            label="Créneau ouvert"
            value={`${activated}/${total_drivers}`}
            icon={UserCheck}
            ok={never_shifted_count === 0}
          />
          <StatBlock
            label="Taux activation"
            value={`${pctActivated}%`}
            icon={Users}
            ok={pctActivated >= 80}
          />
        </div>

        {!allHealthy && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              {missingPhone > 0 &&
                `${missingPhone} chauffeur${missingPhone > 1 ? "s" : ""} sans téléphone. `}
              {never_shifted_count > 0 &&
                `${never_shifted_count} sans créneau ouvert.`}
            </span>
          </div>
        )}

        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link to="/dashboard/teams">Gérer l&apos;équipe →</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
