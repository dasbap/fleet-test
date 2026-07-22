/**
 * CreateDemoForm — formulaire de création d'un accès démo E-Samba.
 *
 * Champs : email, company_name, account_type, fleet_id, trial_days, label, send_email.
 * Appelle useAdminDemoAccounts.createAccess() et expose le magic_url résultant.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CreateDemoPayload, DemoFleet } from "@/hooks/useAdminDemoAccounts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateDemoFormProps {
  demoFleets: DemoFleet[];
  onSubmit: (payload: CreateDemoPayload) => Promise<{ ok: boolean; magic_url?: string; error?: string }>;
  onSuccess?: () => void;
}

// ─── Durées par défaut par type ───────────────────────────────────────────────

const DEFAULT_TRIAL_DAYS: Record<string, number> = {
  investor: 2,
  prospect: 7,
  internal: 30,
  dev:      30,
};

const ACCOUNT_TYPE_LABELS = {
  investor: "Investisseur (48h)",
  prospect: "Prospect (7j)",
  internal: "Interne (30j)",
  dev:      "Dev (30j)",
};

const AUTO_FLEET_VALUE = "auto";

// ─── Composant ────────────────────────────────────────────────────────────────

export function CreateDemoForm({ demoFleets, onSubmit, onSuccess }: CreateDemoFormProps) {
  const { toast } = useToast();

  const [email,        setEmail]        = useState("");
  const [companyName,  setCompanyName]  = useState("");
  const [accountType,  setAccountType]  = useState<string>("prospect");
  const [fleetId,      setFleetId]      = useState<string>(AUTO_FLEET_VALUE);
  const [trialDays,    setTrialDays]    = useState(7);
  const [label,        setLabel]        = useState("");
  const [sendEmail,    setSendEmail]    = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [magicUrl,     setMagicUrl]     = useState<string | null>(null);

  // Met à jour trialDays quand le type change
  function handleTypeChange(type: string) {
    setAccountType(type);
    setTrialDays(DEFAULT_TRIAL_DAYS[type] ?? 7);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      toast({ title: "Email requis", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    const result = await onSubmit({
      email:        email.trim(),
      company_name: companyName.trim() || undefined,
      account_type: accountType as CreateDemoPayload["account_type"],
      fleet_id:     fleetId === AUTO_FLEET_VALUE ? undefined : fleetId,
      trial_days:   trialDays,
      label:        label.trim() || undefined,
      send_email:   sendEmail,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      toast({
        title:       "Erreur création",
        description: result.error ?? "Erreur inconnue",
        variant:     "destructive",
      });
      return;
    }

    toast({ title: "Accès démo créé" });

    if (result.magic_url) {
      setMagicUrl(result.magic_url);
    } else {
      // Reset et callback si pas de lien à afficher
      resetForm();
      onSuccess?.();
    }
  }

  function resetForm() {
    setEmail("");
    setCompanyName("");
    setAccountType("prospect");
    setFleetId(AUTO_FLEET_VALUE);
    setTrialDays(7);
    setLabel("");
    setSendEmail(false);
    setMagicUrl(null);
  }

  function copyLink() {
    if (!magicUrl) return;
    void navigator.clipboard.writeText(magicUrl);
    toast({ title: "Lien copié" });
  }

  // ── Dialog magic link ──────────────────────────────────────────────────────

  if (magicUrl) {
    return (
      <Dialog open onOpenChange={() => { resetForm(); onSuccess?.(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Accès démo créé ✓</DialogTitle>
            <DialogDescription>
              Transmets ce lien au prospect. Il expire selon la durée configurée
              et authentifie automatiquement l'utilisateur.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted p-3 break-all font-mono text-sm">
              {magicUrl}
            </div>

            <div className="flex gap-2">
              <Button onClick={copyLink} className="flex-1">
                <Copy className="h-4 w-4 mr-2" />
                Copier le lien
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(magicUrl, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ouvrir
              </Button>
            </div>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => { resetForm(); onSuccess?.(); }}
            >
              Créer un autre accès
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Formulaire ────────────────────────────────────────────────────────────

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="demo-email">Email *</Label>
        <Input
          id="demo-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="prospect@entreprise.com"
          required
          autoComplete="off"
        />
      </div>

      {/* Entreprise */}
      <div className="space-y-1.5">
        <Label htmlFor="demo-company">Entreprise</Label>
        <Input
          id="demo-company"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Transport Mokolo SA"
        />
      </div>

      {/* Type de compte */}
      <div className="space-y-1.5">
        <Label>Type de compte</Label>
        <Select value={accountType} onValueChange={handleTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Durée */}
      <div className="space-y-1.5">
        <Label htmlFor="demo-days">Durée d'essai (jours)</Label>
        <Input
          id="demo-days"
          type="number"
          min={1}
          max={90}
          value={trialDays}
          onChange={(e) => setTrialDays(Number(e.target.value))}
        />
      </div>

      {/* Flotte démo */}
      {demoFleets.length > 0 && (
        <div className="space-y-1.5">
          <Label>Flotte démo assignée</Label>
          <Select value={fleetId} onValueChange={setFleetId}>
            <SelectTrigger>
              <SelectValue placeholder="Auto (aucune flotte spécifique)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={AUTO_FLEET_VALUE}>Auto</SelectItem>
              {demoFleets.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Label commercial */}
      <div className="space-y-1.5">
        <Label htmlFor="demo-label">Label (interne)</Label>
        <Input
          id="demo-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="RDV Salon Transport Abidjan 2026"
        />
      </div>

      {/* Envoyer email */}
      <div className="flex items-center gap-3">
        <Switch
          id="demo-send-email"
          checked={sendEmail}
          onCheckedChange={setSendEmail}
        />
        <Label htmlFor="demo-send-email" className="cursor-pointer">
          Envoyer le lien par email automatiquement
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Création en cours…</>
        ) : (
          "Créer l'accès démo"
        )}
      </Button>
    </form>
  );
}
