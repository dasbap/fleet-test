import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { ROUTE_PATHS } from '@/navigation/routePaths';
import { CheckCircle2, Smartphone } from 'lucide-react';

/**
 * Parcours minimal chauffeur : numéro CM (SMS) + rappel pour ouvrir un premier créneau.
 */
export function DriverTerrainActivationModal() {
  const navigate = useNavigate();
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
  } = useDriverTerrainActivation();
  const updateProfile = useUpdateDriverProfile();

  const [draftPhone, setDraftPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    setDraftPhone(phone ?? '');
  }, [phone]);

  const open = shouldShowModal && !isLoading;

  const handleSavePhone = async () => {
    setPhoneError(null);
    if (!isValidCameroonMobileInput(draftPhone)) {
      setPhoneError('Saisissez un mobile Cameroun valide (9 chiffres, ex. 6XX XXX XXX).');
      return;
    }
    if (!user?.id) return;
    try {
      const normalized = normalizeCameroonPhoneE164(draftPhone);
      await updateProfile.mutateAsync({
        driverUserId: user.id,
        updates: { phone: normalized },
      });
    } catch {
      /* toast géré par le hook */
    }
  };

  const goToTerrainHub = () => {
    navigate(ROUTE_PATHS.terrain);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
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

          {phoneOk ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              Numéro enregistré pour les SMS.
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="driver-terrain-phone">Mobile Cameroun (+237)</Label>
              <Input
                id="driver-terrain-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="6XX XXX XXX ou +237…"
                value={draftPhone || phone || ''}
                onChange={(e) => {
                  setDraftPhone(e.target.value);
                  setPhoneError(null);
                }}
              />
              {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
              <Button
                type="button"
                size="sm"
                onClick={handleSavePhone}
                disabled={updateProfile.isPending}
              >
                Enregistrer le numéro
              </Button>
            </div>
          )}

          {!hasEverShift && (
            <div className="rounded-md bg-amber-500/10 border border-amber-500/25 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
              Vous n&apos;avez pas encore ouvert de créneau. Utilisez le bouton ci-dessous pour accéder
              au hub terrain.
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={snoozeForOneDay}
              disabled={!canSnooze}
            >
              Plus tard (24 h)
            </Button>
            {canSnooze ? (
              <span className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
                Rappels restants : {snoozeRemaining} sur {MAX_DRIVER_TERRAIN_SNOOZE_USES}
              </span>
            ) : (
              <span className="text-xs text-amber-800 dark:text-amber-200 text-center sm:text-left">
                Limite de reports atteinte — ouvrez un créneau ou complétez l&apos;activation.
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={goToTerrainHub}>
              Ouvrir le hub terrain
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
