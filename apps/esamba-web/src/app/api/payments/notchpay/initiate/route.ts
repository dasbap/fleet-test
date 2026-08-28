import { NextResponse } from "next/server";
import {
  buildMerchantReference,
  getAppUrl,
  getNotchPayApiKey,
  resolveDurationMonths,
} from "@/lib/api/billing-env";
import { requireBillingAccess } from "@/lib/api/require-billing-access";

const NOTCH_PAY_API_URL = "https://api.notchpay.co";

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

  const apiKey = getNotchPayApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "NOTCH_PAY_API_KEY non configurée côté serveur." },
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
    .select("id, fleet_id, status, vehicle_slots, plan_id")
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
    .select("id, code, price_per_vehicle, is_active, name, max_vehicles")
    .eq("id", subscription.plan_id)
    .maybeSingle();

  if (planError || !plan?.is_active) {
    return NextResponse.json({ error: "Plan introuvable" }, { status: 400 });
  }

  if (plan.code !== body.planCode.trim()) {
    return NextResponse.json(
      { error: "Le plan ne correspond pas a l'abonnement." },
      { status: 400 },
    );
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

  const merchantRef = buildMerchantReference("ESAMBA");
  const callbackUrl = `${getAppUrl()}/dashboard/abonnement/success?ref=${encodeURIComponent(merchantRef)}`;
  const payerEmail = body.email ?? user.email ?? undefined;

  const { data: payment, error: paymentError } = await supabase.rpc(
    "create_payment_intent",
    {
      p_org_id: context.orgId,
      p_fleet_id: context.fleetId,
      p_plan_code: plan.code,
      p_vehicle_count: vehicleCount,
      p_duration_months: durationMonths,
      p_provider: "notch",
      p_external_ref: merchantRef,
      p_idempotency_key: merchantRef,
      p_expected_amount: amountXaf,
      p_vehicle_ids: null,
      p_phone_number: null,
      p_checkout: false,
      p_subscription_id: body.subscriptionId,
      p_provider_reference: null,
    },
  );

  if (paymentError || !payment?.payment_id || payment.status !== "pending") {
    return NextResponse.json({ error: "Création du paiement en attente impossible" }, { status: 500 });
  }

  const failPending = async () => {
    await supabase.rpc("fail_payment_initiation", {
      p_payment_id: payment.payment_id,
    });
  };

  let notchRes: Response;
  try {
    notchRes = await fetch(`${NOTCH_PAY_API_URL}/payments`, {
      method: "POST",
      headers: {
        Authorization: apiKey.startsWith("Bearer ") ? apiKey : `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        amount: amountXaf,
        currency: "XAF",
        reference: merchantRef,
        description: `E-Samba — Plan ${plan.name}`,
        callback: callbackUrl,
        email: payerEmail,
        metadata: {
          paymentId: payment.payment_id,
          fleetId: context.fleetId,
          orgId: context.orgId,
          subscriptionId: body.subscriptionId,
          planCode: plan.code,
          vehicleCount: String(vehicleCount),
          durationMonths: String(durationMonths),
        },
      }),
    });
  } catch {
    await failPending();
    return NextResponse.json({ error: "NotchPay indisponible" }, { status: 502 });
  }

  const notchRaw = await notchRes.text().catch(() => "");
  let notchData: {
    code?: number;
    message?: string;
    transaction?: { authorization_url?: string; reference?: string };
  } = {};

  try {
    notchData = JSON.parse(notchRaw) as typeof notchData;
  } catch {
    notchData = {};
  }

  if (!notchRes.ok) {
    await failPending();
    return NextResponse.json(
      {
        error:
          notchData.message ??
          `Erreur initialisation NotchPay (${notchRes.status})`,
      },
      { status: 502 },
    );
  }

  const checkoutUrl = notchData.transaction?.authorization_url;
  const notchRef = notchData.transaction?.reference ?? merchantRef;

  if (!checkoutUrl) {
    await failPending();
    return NextResponse.json(
      { error: "URL de paiement NotchPay manquante" },
      { status: 502 },
    );
  }

  const { data: bound, error: bindError } = await supabase.rpc(
    "bind_payment_provider_reference",
    {
      p_payment_id: payment.payment_id,
      p_provider_reference: notchRef,
    },
  );

  if (bindError || bound !== true) {
    await failPending();
    return NextResponse.json(
      { error: "Liaison de la référence NotchPay impossible" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    paymentId: payment.payment_id,
    paymentStatus: "pending",
    checkoutUrl,
    authorization_url: checkoutUrl,
    reference: notchRef,
    amountXaf,
  });
}
