import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

export function useNotchPayCallback(): void {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const status = searchParams.get("status");
    const ref = searchParams.get("ref");
    if (!status) return;

    if (status === "success" || status === "complete") {
      toast({
        title: "Paiement reçu",
        description: ref
          ? `Réf. ${ref} — activation en cours via webhook. Rechargez dans quelques instants.`
          : "Activation en cours via webhook. Rechargez dans quelques instants.",
      });
    } else if (status === "failed" || status === "cancelled") {
      toast({
        title: "Paiement non complété",
        description: "Le paiement a été annulé ou a échoué.",
        variant: "destructive",
      });
    }

    const next = new URLSearchParams(searchParams);
    next.delete("status");
    next.delete("ref");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
