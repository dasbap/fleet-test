import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const NOTCH_PAY_CALLBACK_PARAMS = [
  "status",
  "ref",
  "reference",
  "trxref",
  "notchpay_trxref",
] as const;

export function useNotchPayCallback(): void {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    const status = searchParams.get("status");
    const ref =
      searchParams.get("ref") ??
      searchParams.get("notchpay_trxref") ??
      searchParams.get("trxref") ??
      searchParams.get("reference");
    if (!status) return;

    if (status === "success" || status === "complete") {
      toast({
        title: "Paiement re\u00e7u",
        description: ref
          ? `R\u00e9f. ${ref} - activation en cours via webhook. Rechargez dans quelques instants.`
          : "Activation en cours via webhook. Rechargez dans quelques instants.",
      });
      void queryClient.invalidateQueries({ queryKey: ["fleet-billing-context"] });
      void queryClient.invalidateQueries({ queryKey: ["payment-history"] });
      void queryClient.invalidateQueries({ queryKey: ["billing-events"] });
    } else if (status === "failed" || status === "cancelled") {
      toast({
        title: "Paiement non compl\u00e9t\u00e9",
        description: "Le paiement a \u00e9t\u00e9 annul\u00e9 ou a \u00e9chou\u00e9.",
        variant: "destructive",
      });
    }

    const next = new URLSearchParams(searchParams);
    for (const key of NOTCH_PAY_CALLBACK_PARAMS) {
      next.delete(key);
    }
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
