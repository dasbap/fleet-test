import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Ticket, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface InvitationCodeInputProps {
  onValidCode: (fleetId: string, fleetName: string) => void;
  onClear: () => void;
}

export function InvitationCodeInput({ onValidCode, onClear }: InvitationCodeInputProps) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [fleetName, setFleetName] = useState("");

  const validateCode = async () => {
    if (!code.trim()) return;
    
    setStatus("checking");
    
    try {
      // Check if the invitation code exists and is valid
      const { data, error } = await supabase
        .from("fleet_invitations")
        .select(`
          id,
          fleet_id,
          expires_at,
          max_uses,
          current_uses,
          fleet:fleets(name)
        `)
        .eq("code", code.trim().toUpperCase())
        .maybeSingle();

      if (error || !data) {
        setStatus("invalid");
        return;
      }

      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setStatus("invalid");
        return;
      }

      // Check if max uses reached
      if (data.max_uses && data.current_uses >= data.max_uses) {
        setStatus("invalid");
        return;
      }

      setStatus("valid");
      setFleetName((data.fleet as any)?.name || "Flotte");
      onValidCode(data.fleet_id, (data.fleet as any)?.name || "Flotte");
    } catch (err) {
      console.error("Error validating code:", err);
      setStatus("invalid");
    }
  };

  const handleClear = () => {
    setCode("");
    setStatus("idle");
    setFleetName("");
    onClear();
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="invitationCode">Code d'invitation (optionnel)</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            id="invitationCode"
            type="text"
            placeholder="Ex: FLOTTE-ABC123"
            className="pl-11 uppercase"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (status !== "idle") setStatus("idle");
            }}
            disabled={status === "valid"}
          />
        </div>
        {status === "idle" && code.length > 0 && (
          <Button type="button" variant="secondary" onClick={validateCode}>
            Vérifier
          </Button>
        )}
        {status === "checking" && (
          <Button type="button" variant="secondary" disabled>
            <Loader2 className="h-4 w-4 animate-spin" />
          </Button>
        )}
        {status === "valid" && (
          <Button type="button" variant="outline" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        )}
        {status === "invalid" && (
          <Button type="button" variant="destructive" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {status === "valid" && (
        <p className="text-sm text-chart-2 flex items-center gap-1">
          <Check className="h-4 w-4" />
          Vous rejoindrez la flotte "{fleetName}"
        </p>
      )}
      {status === "invalid" && (
        <p className="text-sm text-destructive">
          Code invalide ou expiré
        </p>
      )}
    </div>
  );
}
