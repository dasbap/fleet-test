import { NextResponse } from "next/server";
import { resolveDurationMonths } from "@/lib/api/billing-env";
import { requireBillingAccess } from "@/lib/api/require-billing-access";

interface CreateBody {
  planId?: string;
  vehicleCount?: number;
  durationMonths?: number;
  billing?: string;
}

export async function POST(request: Request) {
  const auth = await requireBillingAccess();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json()) as CreateBody;
  if (!body.planId) {
    return NextResponse.json({ error: "planId requis" }, { status: 400 });
  }

  const { supabase, context } = auth;
  const durationMonths = resolveDurationMonths(
    body.billing,
    body.durationMonths,
  );

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id, code, is_active, price_per_vehicle")
    .eq("id", body.planId)
    .maybeSingle();

  if (planError || !plan?.is_active) {
    return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
  }

  const vehicleCount = Math.max(body.vehicleCount ?? 1, 1);
  const amountXaf = plan.price_per_vehicle * vehicleCount * durationMonths;
  if (amountXaf <= 0) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

  const now = new Date();
  const endsAt = new Date(now);
  endsAt.setMonth(endsAt.getMonth() + durationMonths);

  const paymentReference = `SUB-${context.fleetId.slice(0, 8)}-${plan.code}-${Date.now()}`;

  const { data: subscription, error } = await supabase
    .from("abonnements")
    .insert({
      fleet_id: context.fleetId,
      plan_id: body.planId,
      status: "pending_payment",
      starts_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    subscriptionId: subscription.id,
    status: "pending_payment",
    vehicleCount,
    durationMonths,
    billing: body.billing ?? "monthly",
    amount: amountXaf,
    currency: "XAF",
    reference: paymentReference,
    planCode: plan.code,
  });
}
