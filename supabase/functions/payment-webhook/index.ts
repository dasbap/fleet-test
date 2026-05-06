/**
 * Edge Function: payment-webhook
 * IPN (Instant Payment Notification) handler CinetPay.
 * Appelé par CinetPay après confirmation du paiement Mobile Money.
 * 1. Vérifie la transaction auprès de l'API CinetPay (anti-falsification)
 * 2. Si statut = ACCEPTED, appelle confirmer_paiement_et_activer_abonnement
 * 3. Retourne 200 dans tous les cas (CinetPay rejoue en cas d'échec)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CINETPAY_API_KEY = Deno.env.get("CINETPAY_API_KEY")!;
const CINETPAY_SITE_ID = Deno.env.get("CINETPAY_SITE_ID")!;
const CINETPAY_CHECK_URL = "https://api-checkout.cinetpay.com/v2/payment/check";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  // CinetPay envoie un POST form-encoded ou JSON selon config
  let transaction_id: string | null = null;

  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      transaction_id = body.cpm_trans_id ?? body.transaction_id ?? null;
    } else {
      const form = await req.formData();
      transaction_id = form.get("cpm_trans_id")?.toString() ?? null;
    }
  } catch {
    return ok("parse_error");
  }

  if (!transaction_id) {
    return ok("missing_transaction_id");
  }

  // 1. Vérification anti-falsification auprès de CinetPay
  const checkRes = await fetch(CINETPAY_CHECK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: CINETPAY_API_KEY,
      site_id: CINETPAY_SITE_ID,
      transaction_id,
    }),
  });

  const checkData = await checkRes.json();

  // Statut attendu pour paiement réussi
  const isAccepted =
    checkData.data?.status === "ACCEPTED" ||
    checkData.data?.cpm_result === "00";

  if (!isAccepted) {
    // Pas encore confirmé ou rejeté — on loggue et on répond 200
    console.log(`Webhook reçu pour ${transaction_id}, statut: ${checkData.data?.status}`);
    return ok("not_accepted");
  }

  // 2. Activation de l'abonnement via RPC service_role
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { error } = await supabase.rpc("confirmer_paiement_et_activer_abonnement", {
    p_gateway_transaction_id: transaction_id,
    p_raw_payload: checkData,
  });

  if (error) {
    // Idempotent : si déjà confirmé la RPC retourne sans erreur critique
    console.error("RPC confirmer error:", error.message);
    // On retourne quand même 200 pour éviter que CinetPay rejoue indéfiniment
    return ok("rpc_error");
  }

  console.log(`Abonnement activé pour transaction ${transaction_id}`);
  return ok("activated");
});

function ok(reason: string) {
  return new Response(JSON.stringify({ ok: true, reason }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
