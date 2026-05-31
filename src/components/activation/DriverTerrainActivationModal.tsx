import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useDriverTerrainActivation } from '@/hooks/useDriverTerrainActivation';
import { useUpdateDriverProfile } from '@/hooks/useDriverProfiles';
import { isValidCameroonMobileInput, normalizeCameroonPhoneE164 } from '@/lib/cameroonPhone';
import { MAX_DRIVER_TERRAIN_SNOOZE_USES } from '@/lib/driverTerrainSnooze';
import { cn } from '@/lib/utils';
import { isTerrainPath, ROUTE_PATHS } from '@/navigation/routePaths';
import { CheckCircle2, Loader2, MapPin, Smartphone } from 'lucide-react';

/**
 * Parcours minimal chauffeur : numéro CM (SMS) + rappel pour ouvrir un premier créneau.
 */
export function DriverTerrainActivationModal() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const {
    shouldShowModal,
    isLoading,
    phone,
    phoneOk,
    hasEverShift,
    snoozeForOneDay,
    canSnooze,
    snoozeRemaining,
    refetch,
  } = useDriverTerrainActivation();
  const updateProfile = useUpdateDriverProfile();

  const [draftPhone, setDraftPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [savedPhone, setSavedPhone] = useState<string | null>(null);

  useEffect(() => {
    setDraftPhone(phone ?? '');
  }, [phone]);

  useEffect(() => {
    if (phoneOk) {
      setSavedPhone(null);
    }
  }, [phoneOk]);

  const open = shouldShowModal && !isLoading;
  const phoneRegistered =
    phoneOk || (savedPhone != null && isValidCameroonMobileInput(savedPhone));

  const handleSavePhone = async () => {
    setPhoneError(null);
    if (!isValidCameroonMobileInput(draftPhone)) {
      setPhoneError('Saisissez un mobile Cameroun valide (9 chiffres, ex. 6XX XXX XXX).');
      return;
    }
    if (!user?.id) {
      setPhoneError('Session expirée. Reconnectez-vous puis réessayez.');
      return;
    }
    try {
      const normalized = normalizeCameroonPhoneE164(draftPhone);
      await updateProfile.mutateAsync({
        driverUserId: user.id,
        updates: { phone: normalized },
      });
      setSavedPhone(normalized);
      setDraftPhone(normalized);
      await refetch();
    } catch {
      /* toast géré par le hook */
    }
  };

  const goToTerrainHub = () => {
    // Ne pas fermer la modale avant la navigation : un démontage immédiat annule le clic (mobile).
    navigate(ROUTE_PATHS.terrain, { replace: true });
  };

  if (isTerrainPath(pathname)) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className={cn(
          'sm:max-w-md [&>button.absolute]:hidden',
          /* Bottom sheet mobile : CTA au-dessus de la zone pouce / onglets */
          'max-sm:top-auto max-sm:bottom-0 max-sm:max-h-[88dvh] max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-2xl',
          'pb-[max(1.5rem,env(safe-area-inset-bottom))]',
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <Smartphone className="h-5 w-5 text-brand" aria-hidden />
            Activer votre suivi terrain
          </DialogTitle>
          <DialogDescription className="text-left text-slate-600 dark:text-slate-400 space-y-2">
            <span className="block">
              L&apos;activation commence par <strong>ouvrir un créneau</strong> (hub Terrain).
              Sans créneau, les rappels SMS Orange (+237) et les statistiques de flotte restent inactifs.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-surface-raised bg-surface p-3 text-sm text-slate-700 dark:text-slate-300">
            <p className="font-medium text-slate-900 dark:text-slate-100 mb-1">Étapes</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Renseignez votre numéro mobile (réception des SMS E-Samba).</li>
              <li>Ouvrez l&apos;app → <strong>Terrain</strong> → « Ouvrir créneau » sur votre véhicule affecté.</li>
            </ol>
          </div>

          {phoneRegistered ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              Numéro enregistré pour les SMS.
            </div>
          ) : (
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSavePhone();
              }}
            >
              <Label htmlFor="driver-terrain-phone">Mobile Cameroun (+237)</Label>
              <Input
                id="driver-terrain-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="6XX XXX XXX ou +237…"
                value={draftPhone}
                onChange={(e) => {
                  setDraftPhone(e.target.value);
                  setPhoneError(null);
                  setSavedPhone(null);
                }}
              />
              {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
              <Button type="submit" size="sm" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Enregistrement…
                  </>
                ) : (
                  'Enregistrer le numéro'
                )}
              </Button>
            </form>
          )}

          {!hasEverShift && (
            <div className="rounded-md bg-amber-500/10 border border-amber-500/25 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
              Vous n&apos;avez pas encore ouvert de créneau. Utilisez le bouton ci-dessous pour accéder
              au hub terrain.
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col gap-3 sm:flex-col sm:items-stretch sm:justify-start">
          <Button
            type="button"
            variant="default"
            className="order-1 w-full min-h-11 touch-manipulation gap-2"
            data-testid="driver-terrain-hub-cta"
            onClick={goToTerrainHub}
          >
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            Ouvrir le hub terrain
          </Button>
          <Button
            type="button"
            variant="outline"
            className="order-2 w-full min-h-11 touch-manipulation sm:w-auto"
            onClick={snoozeForOneDay}
            disabled={!canSnooze}
          >
            Plus tard (24 h)
          </Button>
          {canSnooze ? (
            <span className="order-3 text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
              Rappels restants : {snoozeRemaining} sur {MAX_DRIVER_TERRAIN_SNOOZE_USES}
            </span>
          ) : (
            <span className="order-3 text-xs text-amber-800 dark:text-amber-200 text-center sm:text-left">
              Limite de reports atteinte — ouvrez un créneau ou complétez l&apos;activation.
            </span>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
