/**
 * Edge Function : generate-scheduled-report
 *
 * Déclenchée par pg_cron (via HTTP CRON) toutes les heures ou à la demande.
 * Récupère les rapports planifiés arrivés à échéance, génère un CSV/JSON
 * et enregistre le résultat dans scheduled_report_runs.
 *
 * Pour l'instant : génération d'un résumé JSON (le rendu PDF/Excel est géré
 * côté client avec jspdf / xlsx). L'Edge Function sert de déclencheur fiable
 * indépendamment du client.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/** Calcule la prochaine date d'exécution selon la fréquence. */
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
    const targetDay = dayOfWeek ?? 1; // lundi par défaut
    let daysUntil = (targetDay - from.getUTCDay() + 7) % 7;
    if (daysUntil === 0 && next <= from) daysUntil = 7;
    next.setUTCDate(from.getUTCDate() + daysUntil);
    return next;
  }

  // monthly
  const targetDay = dayOfMonth ?? 1;
  next.setUTCDate(targetDay);
  if (next <= from) {
    next.setUTCMonth(next.getUTCMonth() + 1);
    next.setUTCDate(targetDay);
  }
  return next;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  const now = new Date();

  // Récupère les rapports planifiés arrivés à échéance
  const { data: dueReports, error: fetchErr } = await supabase
    .rpc("get_due_scheduled_reports", { p_now: now.toISOString() });

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const results: Array<{ id: string; status: string }> = [];

  for (const report of dueReports ?? []) {
    // Crée un enregistrement d'exécution
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
      // Collecte les données brutes selon le type de rapport
      const payload = await collectReportData(report);

      // Stocke dans Supabase Storage (bucket reports — à créer si besoin)
      const storagePath = `reports/${report.fleet_id}/${report.id}/${run.id}.json`;
      await supabase.storage
        .from("reports")
        .upload(storagePath, JSON.stringify(payload), {
          contentType: "application/json",
          upsert: true,
        });

      // Marque le run comme réussi et met à jour next_run_at
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      await supabase
        .from("scheduled_report_runs")
        .update({ status: "failed", error_message: msg, finished_at: new Date().toISOString() })
        .eq("id", run.id);
      results.push({ id: report.id, status: "failed" });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

/** Collecte les données brutes pour chaque type de rapport. */
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
