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
  reference?: string;
  amount?: number;
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
  const vehicleCount = Math.max(body.vehicleCount ?? 1, 1);
  const durationMonths = resolveDurationMonths(
    body.billing,
    body.durationMonths,
  );

  const { data: subscription, error: subError } = await supabase
    .from("abonnements")
    .select("id, fleet_id, status")
    .eq("id", body.subscriptionId)
    .eq("fleet_id", context.fleetId)
    .maybeSingle();

  if (subError || !subscription) {
    return NextResponse.json(
      { error: "Abonnement introuvable pour cette flotte." },
      { status: 404 },
    );
  }

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id, price_per_vehicle, is_active, name")
    .eq("code", body.planCode.trim())
    .maybeSingle();

  if (planError || !plan?.is_active) {
    return NextResponse.json({ error: "Plan introuvable" }, { status: 400 });
  }

  const amountXaf =
    body.amount && body.amount > 0
      ? body.amount
      : plan.price_per_vehicle * vehicleCount * durationMonths;

  const merchantRef = body.reference?.trim() || buildMerchantReference("ESAMBA");
  const callbackUrl = `${getAppUrl()}/dashboard/abonnement/success?ref=${encodeURIComponent(merchantRef)}`;
  const payerEmail = body.email ?? user.email ?? undefined;

  const notchRes = await fetch(`${NOTCH_PAY_API_URL}/payments`, {
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
        fleetId: context.fleetId,
        orgId: context.orgId,
        subscriptionId: body.subscriptionId,
        planCode: body.planCode,
        vehicleCount: String(vehicleCount),
        durationMonths: String(durationMonths),
      },
    }),
  });

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
    return NextResponse.json(
      { error: "URL de paiement NotchPay manquante" },
      { status: 502 },
    );
  }

  const { error: paymentError } = await supabase.from("paiements").insert({
    org_id: context.orgId,
    provider: "notch",
    amount: amountXaf,
    currency: "XAF",
    status: "initiated",
    external_ref: notchRef,
    provider_reference: notchRef,
    idempotency_key: merchantRef,
    raw_payload: {
      subscriptionId: body.subscriptionId,
      planCode: body.planCode,
      vehicleCount,
      durationMonths,
      fleetId: context.fleetId,
    },
  });

  if (paymentError) {
    return NextResponse.json({ error: paymentError.message }, { status: 500 });
  }

  return NextResponse.json({
    checkoutUrl,
    authorization_url: checkoutUrl,
    reference: notchRef,
    amountXaf,
  });
}
