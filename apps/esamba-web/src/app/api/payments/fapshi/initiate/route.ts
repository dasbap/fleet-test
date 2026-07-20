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
  amount?: number;
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
  const vehicleCount = Math.max(body.vehicleCount ?? 1, 1);
  const durationMonths = resolveDurationMonths(
    body.billing,
    body.durationMonths,
  );

  const { data: subscription, error: subError } = await supabase
    .from("abonnements")
    .select("id, fleet_id")
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
    .select("price_per_vehicle, is_active")
    .eq("code", body.planCode.trim())
    .maybeSingle();

  if (planError || !plan?.is_active) {
    return NextResponse.json({ error: "Plan introuvable" }, { status: 400 });
  }

  const amountXaf =
    body.amount && body.amount > 0
      ? body.amount
      : plan.price_per_vehicle * vehicleCount * durationMonths;

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

  const { error: paymentError } = await supabase.from("paiements").insert({
    org_id: context.orgId,
    provider: "fapshi",
    amount: amountXaf,
    currency: "XAF",
    status: "initiated",
    external_ref: body.subscriptionId,
    provider_reference: merchantRef,
    idempotency_key: merchantRef,
    raw_payload: {
      subscriptionId: body.subscriptionId,
      planCode: body.planCode,
      vehicleCount,
      durationMonths,
      fleetId: context.fleetId,
      fapshiExternalId: body.subscriptionId,
    },
  });

  if (paymentError) {
    return NextResponse.json({ error: paymentError.message }, { status: 500 });
  }

  return NextResponse.json({
    checkoutUrl,
    link: checkoutUrl,
    reference: merchantRef,
    amountXaf,
  });
}
