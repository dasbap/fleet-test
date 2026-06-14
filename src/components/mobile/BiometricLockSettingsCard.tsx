import { useCallback, useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  disableBiometricLock,
  enableBiometricLock,
  getBiometricDisplayLabel,
  isBiometricLockEnabledForUser,
  isNativeBiometricHardwareAvailable,
  shouldUseBiometricLock,
} from "@/services/biometric-lock.service";

const PIN_LEN = 4;

/**
 * Activation du verrou biométrique + PIN (app Capacitor uniquement).
 */
export function BiometricLockSettingsCard() {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [hardwareOk, setHardwareOk] = useState(false);
  const [bioLabel, setBioLabel] = useState("Biométrie");
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const refreshLocalState = useCallback(async () => {
    if (!shouldUseBiometricLock() || !user?.id) {
      setEnabled(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [hw, label, on] = await Promise.all([
        isNativeBiometricHardwareAvailable(),
        getBiometricDisplayLabel(),
        isBiometricLockEnabledForUser(user.id),
      ]);
      setHardwareOk(hw);
      setBioLabel(label);
      setEnabled(on);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refreshLocalState();
  }, [refreshLocalState]);

  if (!shouldUseBiometricLock()) {
    return null;
  }

  const handleSwitch = (checked: boolean) => {
    if (!user?.id) return;
    if (checked) {
      if (!hardwareOk) {
        toast({
          title: "Biométrie indisponible",
          description:
            "Aucune authentification forte (empreinte ou visage) n’est configurée sur cet appareil.",
          variant: "destructive",
        });
        return;
      }
      setPin("");
      setPinConfirm("");
      setPinDialogOpen(true);
      return;
    }
    setDisableDialogOpen(true);
  };

  const submitEnable = async () => {
    if (!user?.id) return;
    if (pin.length !== PIN_LEN || pinConfirm.length !== PIN_LEN) {
      toast({
        title: "Code incomplet",
        description: `Saisissez deux fois le code à ${PIN_LEN} chiffres.`,
        variant: "destructive",
      });
      return;
    }
    if (pin !== pinConfirm) {
      toast({
        title: "Codes différents",
        description: "Les deux saisies doivent être identiques.",
        variant: "destructive",
      });
      return;
    }
    const refreshToken = session?.refresh_token ?? null;
    if (!refreshToken) {
      toast({
        title: "Session introuvable",
        description: "Reconnectez-vous puis réessayez.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      await enableBiometricLock(user.id, refreshToken, pin);
      try {
        sessionStorage.setItem("esamba_biometric_skip_lock_once", "1");
      } catch {
        /* ignore */
      }
      setEnabled(true);
      setPinDialogOpen(false);
      toast({
        title: "Verrou activé",
        description: `Vous pourrez déverrouiller avec ${bioLabel} ou votre code PIN.`,
      });
    } catch (e) {
      toast({
        title: "Activation impossible",
        description: e instanceof Error ? e.message : "Erreur inconnue.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDisable = async () => {
    setSaving(true);
    try {
      await disableBiometricLock();
      setEnabled(false);
      setDisableDialogOpen(false);
      toast({ title: "Verrou désactivé" });
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Impossible de désactiver.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Fingerprint className="h-5 w-5 text-primary" aria-hidden />
            Déverrouillage rapide
          </CardTitle>
          <CardDescription>
            Sur l’app mobile, utilisez {bioLabel} ou un code PIN après une absence (retour
            depuis l’arrière-plan ou relance de l’app).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Chargement…"
              : hardwareOk
                ? `Recommandé pour les comptes partagés ou le terrain.`
                : "Configurez d’abord une empreinte ou un visage dans les réglages système de l’appareil."}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {enabled ? "Activé" : "Désactivé"}
            </span>
            <Switch
              checked={enabled}
              disabled={loading || saving}
              onCheckedChange={handleSwitch}
              aria-label="Activer le déverrouillage biométrique"
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choisir un code PIN</DialogTitle>
            <DialogDescription>
              Ce code complète {bioLabel} si le capteur échoue. {PIN_LEN} chiffres, saisis deux fois.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="mb-2 text-sm font-medium">Code PIN</p>
              <InputOTP
                maxLength={PIN_LEN}
                value={pin}
                onChange={setPin}
                containerClassName="justify-start gap-2"
                inputMode="numeric"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Confirmation</p>
              <InputOTP
                maxLength={PIN_LEN}
                value={pinConfirm}
                onChange={setPinConfirm}
                containerClassName="justify-start gap-2"
                inputMode="numeric"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPinDialogOpen(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button type="button" onClick={() => void submitEnable()} disabled={saving}>
              {saving ? "Enregistrement…" : "Activer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver le déverrouillage rapide ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les données locales de verrouillage seront supprimées. Vous pourrez réactiver l’option
              plus tard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDisable()} disabled={saving}>
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
