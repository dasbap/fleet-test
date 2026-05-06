import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, Smartphone } from "lucide-react";
import { useInitiatePayment, usePaymentStatus, type Gateway } from "@/hooks/usePayment";

interface Plan {
  code: string;
  name: string;
  price_xaf: number;
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan;
}

const GATEWAY_OPTIONS: { value: Gateway; label: string; color: string }[] = [
  { value: "orange_money_cm", label: "Orange Money", color: "bg-orange-500 hover:bg-orange-600" },
  { value: "mtn_momo_cm", label: "MTN MoMo", color: "bg-yellow-400 hover:bg-yellow-500" },
];

export function PaymentDialog({ open, onOpenChange, plan }: PaymentDialogProps) {
  const [phone, setPhone] = useState("");
  const [gateway, setGateway] = useState<Gateway>("orange_money_cm");
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState("");

  const initiate = useInitiatePayment();
  const { data: status } = usePaymentStatus(transactionId);

  useEffect(() => {
    if (open) {
      const pending = sessionStorage.getItem("pending_payment_txn");
      if (pending) setTransactionId(pending);
    }
  }, [open]);

  function validatePhone(value: string) {
    const cleaned = value.replace(/\s/g, "");
    if (!/^6\d{8}$/.test(cleaned)) {
      setPhoneError("Format requis : 6XX XXX XXX (9 chiffres)");
      return false;
    }
    setPhoneError("");
    return true;
  }

  async function handleSubmit() {
    const cleaned = phone.replace(/\s/g, "");
    if (!validatePhone(cleaned)) return;

    const result = await initiate.mutateAsync({
      plan_code: plan.code,
      phone_number: cleaned,
      gateway,
    });

    setTransactionId(result.transaction_id);

    if (result.payment_url) {
      window.open(result.payment_url, "_blank", "noopener,noreferrer");
    }
  }

  function handleClose() {
    if (status?.status === "pending" || initiate.isPending) return;
    setTransactionId(null);
    setPhone("");
    initiate.reset();
    onOpenChange(false);
  }

  const isCompleted = status?.status === "completed";
  const isFailed = status?.status === "failed";
  const isPolling = !!transactionId && !isCompleted && !isFailed;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Paiement Mobile Money</DialogTitle>
          <DialogDescription>
            {plan.name} — {plan.price_xaf.toLocaleString("fr-CM")} FCFA / mois
          </DialogDescription>
        </DialogHeader>

        {isCompleted && (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-center font-medium">Paiement confirmé !</p>
            <p className="text-center text-sm text-muted-foreground">
              Ton abonnement {plan.name} est maintenant actif.
            </p>
            <Button onClick={handleClose}>Fermer</Button>
          </div>
        )}

        {isFailed && (
          <div className="flex flex-col items-center gap-3 py-6">
            <XCircle className="h-12 w-12 text-red-500" />
            <p className="text-center font-medium">Paiement échoué</p>
            <Button variant="outline" onClick={() => { setTransactionId(null); initiate.reset(); }}>
              Réessayer
            </Button>
          </div>
        )}

        {isPolling && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-center font-medium">En attente de confirmation</p>
            <p className="text-center text-sm text-muted-foreground">
              Valide le paiement sur ton téléphone ({phone || "…"})
            </p>
          </div>
        )}

        {!transactionId && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Opérateur</Label>
              <div className="flex gap-2">
                {GATEWAY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setGateway(opt.value)}
                    className={`flex-1 rounded-lg py-2 px-3 text-sm font-medium text-white transition-all
                      ${opt.color}
                      ${gateway === opt.value ? "ring-2 ring-offset-2 ring-primary" : "opacity-70"}
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Numéro de téléphone</Label>
              <div className="flex items-center gap-2">
                <span className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
                  +237
                </span>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="6 XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => validatePhone(phone.replace(/\s/g, ""))}
                  maxLength={11}
                />
              </div>
              {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
            </div>

            {initiate.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {initiate.error?.message ?? "Erreur lors de l'initiation du paiement"}
                </AlertDescription>
              </Alert>
            )}

            <Button className="w-full" onClick={handleSubmit} disabled={initiate.isPending || !phone}>
              {initiate.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connexion…</>
              ) : (
                <><Smartphone className="mr-2 h-4 w-4" /> Payer {plan.price_xaf.toLocaleString("fr-CM")} FCFA</>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Tu recevras une notification sur ton téléphone pour confirmer le paiement.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
