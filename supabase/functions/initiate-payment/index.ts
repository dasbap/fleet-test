/**
 * Edge Function: initiate-payment
 * Appelée par le frontend (authentifié) pour initier un paiement Mobile Money via CinetPay.
 * 1. Valide le token JWT Supabase
 * 2. Appelle l'API CinetPay pour créer la transaction
 * 3. Enregistre la tentative via RPC initier_paiement_mobile_money
 * 4. Retourne le payment_url CinetPay à ouvrir dans un WebView/navigateur
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CINETPAY_API_KEY = Deno.env.get("CINETPAY_API_KEY")!;
const CINETPAY_SITE_ID = Deno.env.get("CINETPAY_SITE_ID")!;
const CINETPAY_BASE_URL = "https://api-checkout.cinetpay.com/v2/payment";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InitiatePaymentBody {
  plan_code: string;        // ex. "starter" | "pro" | "enterprise"
  phone_number: string;     // format camerounais: 6XXXXXXXX
  gateway: "orange_money_cm" | "mtn_momo_cm";
  idempotency_key: string;  // UUID généré côté client pour éviter doublons
}

serve(async (req) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Authentification JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    // 2. Récupérer org_id + fleet_id depuis le profil
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, fleet_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return json({ error: "Profil incomplet – organization_id manquant" }, 422);
    }

    const body: InitiatePaymentBody = await req.json();
    const { plan_code, phone_number, gateway, idempotency_key } = body;

    // Validation téléphone camerounais (6XXXXXXXX = 9 chiffres)
    if (!/^6\d{8}$/.test(phone_number)) {
      return json({ error: "Numéro de téléphone invalide (format: 6XXXXXXXX)" }, 422);
    }

    // 3. Récupérer le montant du plan
    const { data: plan } = await supabase
      .from("plans")
      .select("id, price_xaf, name")
      .eq("code", plan_code)
      .single();

    if (!plan) {
      return json({ error: `Plan inconnu: ${plan_code}` }, 422);
    }

    // 4. Appel CinetPay — initiation de paiement
    const transactionId = idempotency_key; // on réutilise comme transaction_id CinetPay
    const cinetPayPayload = {
      apikey: CINETPAY_API_KEY,
      site_id: CINETPAY_SITE_ID,
      transaction_id: transactionId,
      amount: plan.price_xaf,
      currency: "XAF",
      description: `Abonnement Smart Fleet – ${plan.name}`,
      notify_url: `${SUPABASE_URL}/functions/v1/payment-webhook`,
      return_url: `${Deno.env.get("APP_URL") ?? "https://app.e-samba.com"}/billing?status=success`,
      channels: gateway === "orange_money_cm" ? "ORANGE_MONEY" : "MOBILE_MONEY",
      // Paiement direct sans redirection si numéro fourni
      customer_phone_number: `+237${phone_number}`,
      customer_name: user.email ?? "Client",
      customer_email: user.email ?? "client@e-samba.com",
      customer_surname: "",
    };

    const cpRes = await fetch(CINETPAY_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cinetPayPayload),
    });

    const cpData = await cpRes.json();

    // CinetPay retourne code "201" (string) pour succès
    if (cpData.code !== "201" && cpData.code !== 201) {
      console.error("CinetPay error:", cpData);
      return json({ error: "Échec initialisation paiement", detail: cpData.message }, 502);
    }

    // 5. Enregistrement en base via RPC
    const { error: rpcError } = await supabase.rpc("initier_paiement_mobile_money", {
      p_org_id: profile.organization_id,
      p_fleet_id: profile.fleet_id,
      p_plan_code: plan_code,
      p_phone_number: phone_number,
      p_gateway_transaction_id: transactionId,
      p_amount: plan.price_xaf,
      p_idempotency_key: idempotency_key,
    });

    if (rpcError) {
      console.error("RPC error:", rpcError);
      return json({ error: "Erreur enregistrement paiement" }, 500);
    }

    return json({
      payment_url: cpData.data?.payment_url ?? null,
      transaction_id: transactionId,
      amount_xaf: plan.price_xaf,
      plan_name: plan.name,
    });
  } catch (err) {
    console.error("initiate-payment error:", err);
    return json({ error: "Erreur interne" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
