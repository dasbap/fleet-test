import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFleetDrivers } from "@/hooks/useAssignments";
import { useFleetDriverActivationHealth } from "@/hooks/useFleetDriverActivationHealth";
import { usePermissions } from "@/hooks/usePermissions";
import { useUpdateDriverProfile } from "@/hooks/useDriverProfiles";
import { isValidCameroonMobileInput, normalizeCameroonPhoneE164 } from "@/lib/cameroonPhone";
import { Phone } from "lucide-react";

interface PhoneAlertBannerProps {
  count: number;
  onAction: () => void;
}

/** Bannière : rôles backoffice uniquement, masquée si count = 0. */
export function PhoneAlertBanner({ count, onAction }: PhoneAlertBannerProps) {
  const { canAccessBackoffice } = usePermissions();
  if (!canAccessBackoffice || count <= 0) return null;

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950/30 sm:flex-row sm:items-center"
      role="status"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Phone className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <div className="min-w-0">
          <p className="font-medium text-amber-900 dark:text-amber-100">
            {count} chauffeur{count > 1 ? "s" : ""} sans numéro mobile
          </p>
          <p className="mt-0.5 text-amber-800/90 dark:text-amber-200/90">
            Les séquences SMS et une partie du suivi terrain restent bloquées tant que les numéros ne sont pas
            renseignés.
          </p>
        </div>
      </div>
      <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={onAction}>
        Renseigner les numéros
      </Button>
    </div>
  );
}

interface PhoneCollectionModalProps {
  fleetId: string | null | undefined;
  open: boolean;
  onClose: () => void;
  /** À la fermeture si au moins un numéro a été enregistré pendant la session. */
  onComplete?: (savedCount: number) => void;
}

/**
 * Saisie des mobiles Cameroun (+237) pour les chauffeurs sans téléphone au profil.
 */
export function PhoneCollectionModal({ fleetId, open, onClose, onComplete }: PhoneCollectionModalProps) {
  const { canAccessBackoffice } = usePermissions();
  const { data: health, isLoading: healthLoading } = useFleetDriverActivationHealth(fleetId ?? undefined);
  const { data: allDrivers = [], isLoading: driversLoading } = useFleetDrivers(fleetId ?? undefined);
  const updateProfile = useUpdateDriverProfile();

  const [savedThisSession, setSavedThisSession] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const missingRows = useMemo(() => {
    if (!health?.drivers?.length || !allDrivers.length) return [];
    const noPhoneIds = new Set(health.drivers.filter((d) => !d.has_phone).map((d) => d.user_id));
    return allDrivers
      .filter((d) => noPhoneIds.has(d.user_id))
      .map((d) => ({
        userId: d.user_id,
        label: d.full_name?.trim() || `Conducteur (${d.user_id.slice(0, 8)}…)`,
      }));
  }, [health, allDrivers]);

  useEffect(() => {
    if (open) {
      setSavedThisSession(0);
      setDrafts({});
      setErrors({});
    }
  }, [open]);

  const handleClose = () => {
    if (savedThisSession > 0) {
      onComplete?.(savedThisSession);
    }
    onClose();
  };

  const handleSave = async (userId: string) => {
    const raw = drafts[userId] ?? "";
    setErrors((prev) => ({ ...prev, [userId]: null }));
    if (!isValidCameroonMobileInput(raw)) {
      setErrors((prev) => ({
        ...prev,
        [userId]: "Mobile Cameroun invalide (9 chiffres, ex. 6XX XXX XXX).",
      }));
      return;
    }
    try {
      const normalized = normalizeCameroonPhoneE164(raw);
      await updateProfile.mutateAsync({
        driverUserId: userId,
        updates: { phone: normalized },
      });
      setSavedThisSession((n) => n + 1);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } catch {
      /* toast géré par le hook mutation */
    }
  };

  if (!canAccessBackoffice) return null;

  const loading = healthLoading || driversLoading;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <Phone className="h-5 w-5 text-brand" aria-hidden />
            Numéros chauffeurs
          </DialogTitle>
          <DialogDescription className="text-left">
            Saisissez un mobile Cameroun (+237) pour chaque conducteur concerné. Les données sont enregistrées sur le
            profil.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-4 text-sm text-muted-foreground">Chargement…</p>
        ) : missingRows.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            Tous les chauffeurs ont un numéro renseigné, ou aucun conducteur actif dans cette flotte.
          </p>
        ) : (
          <ul className="space-y-4 py-1">
            {missingRows.map((row) => (
              <li key={row.userId} className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-sm font-medium text-foreground">{row.label}</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor={`phone-${row.userId}`} className="text-xs">
                      Mobile Cameroun (+237)
                    </Label>
                    <Input
                      id={`phone-${row.userId}`}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="6XX XXX XXX"
                      value={drafts[row.userId] ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDrafts((prev) => ({ ...prev, [row.userId]: v }));
                        setErrors((prev) => ({ ...prev, [row.userId]: null }));
                      }}
                    />
                    {errors[row.userId] ? (
                      <p className="text-xs text-destructive">{errors[row.userId]}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="sm:mb-0.5"
                    disabled={updateProfile.isPending}
                    onClick={() => void handleSave(row.userId)}
                  >
                    Enregistrer
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
