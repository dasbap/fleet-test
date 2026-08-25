import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function computeNextRun(
  frequency: "daily" | "weekly" | "monthly",
  dayOfWeek: number | null,
  dayOfMonth: number | null,
  sendHourUtc: number,
  from: Date = new Date(),
): Date {
  const next = new Date(from);
  next.setUTCHours(sendHourUtc, 0, 0, 0);

  if (frequency === "daily") {
    if (next <= from) next.setUTCDate(next.getUTCDate() + 1);
    return next;
  }

  if (frequency === "weekly") {
    const targetDay = dayOfWeek ?? 1;
    let daysUntil = (targetDay - from.getUTCDay() + 7) % 7;
    if (daysUntil === 0 && next <= from) daysUntil = 7;
    next.setUTCDate(from.getUTCDate() + daysUntil);
    return next;
  }

  const targetDay = dayOfMonth ?? 1;
  next.setUTCDate(targetDay);
  if (next <= from) {
    next.setUTCMonth(next.getUTCMonth() + 1);
    next.setUTCDate(targetDay);
  }
  return next;
}

const ALLOWED_ORIGINS = [
  "https://www.e-samba.com",
  "https://e-samba.com",
  "https://app.e-samba.com",
  "capacitor://localhost",
  "http://localhost:5173",
  "https://localhost",
];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Cache-Control": "no-store",
  };
}

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  const length = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;

  for (let index = 0; index < length; index += 1) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }

  return diff === 0;
}

function isAuthorized(req: Request): boolean {
  const authorization = req.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return false;
  const token = authorization.slice(7).trim();
  return Boolean(SUPABASE_SERVICE_ROLE_KEY) && timingSafeEqual(token, SUPABASE_SERVICE_ROLE_KEY);
}

function json(req: Request, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return json(req, { error: "method_not_allowed" }, 405);
  }

  if (!isAuthorized(req)) {
    return json(req, { error: "unauthorized" }, 401);
  }

  const now = new Date();
  const { data: dueReports, error: fetchErr } = await supabase
    .rpc("get_due_scheduled_reports", { p_now: now.toISOString() });

  if (fetchErr) {
    console.error("[generate-scheduled-report] get_due_scheduled_reports failed:", fetchErr.message);
    return json(req, { error: "scheduled_reports_fetch_failed" }, 500);
  }

  const results: Array<{ id: string; status: string }> = [];

  for (const report of dueReports ?? []) {
    const { data: run, error: runErr } = await supabase
      .from("scheduled_report_runs")
      .insert({
        scheduled_report_id: report.id,
        fleet_id: report.fleet_id,
        status: "running",
      })
      .select()
      .single();

    if (runErr || !run) {
      results.push({ id: report.id, status: "run_insert_failed" });
      continue;
    }

    try {
      const payload = await collectReportData(report);
      const storagePath = `reports/${report.fleet_id}/${report.id}/${run.id}.json`;
      await supabase.storage
        .from("reports")
        .upload(storagePath, JSON.stringify(payload), {
          contentType: "application/json",
          upsert: true,
        });

      const nextRun = computeNextRun(
        report.frequency,
        report.day_of_week,
        report.day_of_month,
        report.send_hour_utc,
        now,
      );

      await Promise.all([
        supabase
          .from("scheduled_report_runs")
          .update({ status: "succeeded", storage_path: storagePath, finished_at: new Date().toISOString() })
          .eq("id", run.id),
        supabase
          .from("scheduled_reports")
          .update({ last_run_at: now.toISOString(), next_run_at: nextRun.toISOString() })
          .eq("id", report.id),
      ]);

      results.push({ id: report.id, status: "succeeded" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error";
      console.error("[generate-scheduled-report] report generation failed:", message);
      await supabase
        .from("scheduled_report_runs")
        .update({ status: "failed", error_message: "report_generation_failed", finished_at: new Date().toISOString() })
        .eq("id", run.id);
      results.push({ id: report.id, status: "failed" });
    }
  }

  return json(req, { processed: results.length, results }, 200);
});

async function collectReportData(report: {
  fleet_id: string;
  report_type: string;
}): Promise<Record<string, unknown>> {
  const fleetId = report.fleet_id;

  switch (report.report_type) {
    case "fleet_summary": {
      const { data } = await supabase
        .from("vehicules")
        .select("id, registration, label, status")
        .eq("fleet_id", fleetId);
      return { type: "fleet_summary", fleet_id: fleetId, vehicles: data ?? [], generated_at: new Date().toISOString() };
    }
    case "fuel_history": {
      const { data } = await supabase
        .from("fuel_entries")
        .select("*")
        .eq("fleet_id", fleetId)
        .order("purchased_at", { ascending: false })
        .limit(500);
      return { type: "fuel_history", fleet_id: fleetId, entries: data ?? [], generated_at: new Date().toISOString() };
    }
    case "maintenance_due": {
      const { data } = await supabase
        .from("maintenance_schedules")
        .select("*")
        .eq("fleet_id", fleetId)
        .eq("status", "due");
      return { type: "maintenance_due", fleet_id: fleetId, items: data ?? [], generated_at: new Date().toISOString() };
    }
    case "incidents": {
      const { data } = await supabase
        .from("incidents")
        .select("*")
        .eq("fleet_id", fleetId)
        .order("created_at", { ascending: false })
        .limit(200);
      return { type: "incidents", fleet_id: fleetId, incidents: data ?? [], generated_at: new Date().toISOString() };
    }
    default:
      return { type: report.report_type, fleet_id: fleetId, generated_at: new Date().toISOString() };
  }
}
