import { NextResponse } from "next/server";
import {
  buildMerchantReference,
  getAppUrl,
  getFapshiCredentials,
  resolveDurationMonths,
} from "@/lib/api/billing-env";
import { requireBillingAccess } from "@/lib/api/require-billing-access";

interface InitiateBody {
  subscriptionId?: string;
  planCode?: string;
  vehicleCount?: number;
  durationMonths?: number;
  billing?: string;
  email?: string;
}

export async function POST(request: Request) {
  const auth = await requireBillingAccess();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const fapshiCreds = getFapshiCredentials();
  if (!fapshiCreds) {
    return NextResponse.json(
      {
        error:
          "FAPSHI_API_KEY (et FAPSHI_API_USER pour live.fapshi.com) non configurés.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json()) as InitiateBody;
  if (!body.subscriptionId || !body.planCode) {
    return NextResponse.json(
      { error: "subscriptionId et planCode requis" },
      { status: 400 },
    );
  }

  const { supabase, context, user } = auth;
  const durationMonths = resolveDurationMonths(body.billing, body.durationMonths);

  const { data: subscription, error: subError } = await supabase
    .from("abonnements")
    .select("id, fleet_id, vehicle_slots")
    .eq("id", body.subscriptionId)
    .eq("fleet_id", context.fleetId)
    .maybeSingle();

  if (subError || !subscription) {
    return NextResponse.json(
      { error: "Abonnement introuvable pour cette flotte." },
      { status: 404 },
    );
  }

  if (
    body.vehicleCount != null &&
    (!Number.isInteger(body.vehicleCount) || body.vehicleCount < 1)
  ) {
    return NextResponse.json({ error: "vehicleCount invalide" }, { status: 400 });
  }

  const vehicleCount = subscription.vehicle_slots;
  if (!Number.isInteger(vehicleCount) || vehicleCount < 1) {
    return NextResponse.json(
      { error: "Nombre de vehicules de l'abonnement invalide." },
      { status: 400 },
    );
  }

  if (body.vehicleCount != null && body.vehicleCount !== subscription.vehicle_slots) {
    return NextResponse.json(
      { error: "Le nombre de vehicules ne correspond pas a l'abonnement." },
      { status: 400 },
    );
  }

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("price_per_vehicle, is_active, max_vehicles")
    .eq("code", body.planCode.trim())
    .maybeSingle();

  if (planError || !plan?.is_active) {
    return NextResponse.json({ error: "Plan introuvable" }, { status: 400 });
  }

  if (plan.max_vehicles != null && vehicleCount > plan.max_vehicles) {
    return NextResponse.json(
      { error: "Limite de vehicules du plan depassee" },
      { status: 400 },
    );
  }

  const amountXaf = plan.price_per_vehicle * vehicleCount * durationMonths;
  if (!Number.isFinite(amountXaf) || amountXaf <= 0) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

  const merchantRef = buildMerchantReference("FAPSHI");
  const returnUrl = `${getAppUrl()}/dashboard/abonnement/success?ref=${encodeURIComponent(merchantRef)}`;
  const payerEmail = body.email ?? user.email ?? undefined;
  const useLiveApi = fapshiCreds.endpoint.includes("live.fapshi.com");

  const fapshiRes = await fetch(fapshiCreds.endpoint, {
    method: "POST",
    headers: useLiveApi
      ? {
          apiuser: fapshiCreds.apiUser,
          apikey: fapshiCreds.apiKey,
          "Content-Type": "application/json",
        }
      : {
          Authorization: `Bearer ${fapshiCreds.apiKey}`,
          "Content-Type": "application/json",
        },
    body: JSON.stringify(
      useLiveApi
        ? {
            amount: amountXaf,
            email: payerEmail,
            externalId: body.subscriptionId,
            redirectUrl: returnUrl,
            message: "Abonnement E-Samba.com",
          }
        : {
            amount: amountXaf,
            currency: "XAF",
            externalId: body.subscriptionId,
            redirectUrl: returnUrl,
            description: `E-Samba ${body.planCode}`,
          },
    ),
  }).catch(() => null);

  const fapshiRaw = await fapshiRes?.text().catch(() => "");
  let fapshiData: {
    statusCode?: number;
    message?: string;
    link?: string;
    paymentUrl?: string;
    url?: string;
  } = {};

  try {
    fapshiData = fapshiRaw ? (JSON.parse(fapshiRaw) as typeof fapshiData) : {};
  } catch {
    fapshiData = {};
  }

  if (!fapshiRes?.ok || (useLiveApi && fapshiData.statusCode !== 200)) {
    return NextResponse.json(
      {
        error:
          fapshiData.message ??
          "Fapshi indisponible. Vérifiez FAPSHI_API_USER et FAPSHI_API_KEY.",
      },
      { status: 502 },
    );
  }

  const checkoutUrl =
    fapshiData.link ?? fapshiData.paymentUrl ?? fapshiData.url;

  if (!checkoutUrl) {
    return NextResponse.json(
      { error: "URL de paiement Fapshi manquante" },
      { status: 502 },
    );
  }

  const { data: payment, error: paymentError } = await supabase.rpc(
    "create_payment_intent",
    {
      p_org_id: context.orgId,
      p_fleet_id: context.fleetId,
      p_plan_code: body.planCode.trim(),
      p_vehicle_count: vehicleCount,
      p_duration_months: durationMonths,
      p_provider: "fapshi",
      p_external_ref: body.subscriptionId,
      p_idempotency_key: merchantRef,
      p_expected_amount: amountXaf,
      p_vehicle_ids: null,
      p_phone_number: null,
      p_checkout: false,
      p_subscription_id: body.subscriptionId,
      p_provider_reference: merchantRef,
    },
  );

  if (paymentError || !payment) {
    return NextResponse.json({ error: "Création du paiement impossible" }, { status: 500 });
  }

  return NextResponse.json({
    checkoutUrl,
    link: checkoutUrl,
    reference: merchantRef,
    amountXaf,
  });
}
