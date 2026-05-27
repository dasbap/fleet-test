/**
 * Edge Function : refresh-analytics
 *
 * Rafraîchit les vues matérialisées et recalcule les scores conducteurs actifs.
 * Déclencher via cron Supabase (pg_cron) ou appel POST authentifié.
 *
 * Fréquence recommandée : toutes les heures ("0 * * * *")
 *
 * Tâches :
 *  1. REFRESH MATERIALIZED VIEW mv_fleet_daily_metrics
 *  2. REFRESH MATERIALIZED VIEW mv_driver_score_snapshots
 *  3. Snapshot journalier fleet_daily_snapshots
 *  4. Purge cache fleet_metrics_cache expiré
 *  5. Recalcul scores conducteurs actifs (dernières 24h)
 *
 * Sécurité : CRON_SECRET header obligatoire.
 * Variables ENV :
 *   - CRON_SECRET
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

Deno.serve(async (req: Request) => {
  // Vérification sécurité cron
  const authHeader = req.headers.get("Authorization") ?? "";
  const secret = authHeader.replace("Bearer ", "").trim();

  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const startedAt = Date.now();
  const results: Record<string, unknown> = {};

  // ── 1. Refresh vues matérialisées + snapshots + purge cache ──────────────────
  try {
    const { data: refreshData, error: refreshError } = await supabase
      .rpc("refresh_analytics_views");

    if (refreshError) {
      results.refresh_views = { ok: false, error: refreshError.message };
    } else {
      results.refresh_views = refreshData;
    }
  } catch (e) {
    results.refresh_views = { ok: false, error: String(e) };
  }

  // ── 2. Recalcul scores conducteurs actifs (affectations des 24 dernières heures) ──
  try {
    const { data: activeDrivers, error: driversError } = await supabase
      .from("affectations_vehicules")
      .select("driver_user_id, fleet_id")
      .eq("is_active", true)
      .gte("updated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (driversError) {
      results.driver_scores = { ok: false, error: driversError.message };
    } else {
      const drivers = activeDrivers ?? [];
      let successCount = 0;
      let errorCount = 0;

      // Calculer par lots de 10 pour ne pas saturer la DB
      const BATCH_SIZE = 10;
      for (let i = 0; i < drivers.length; i += BATCH_SIZE) {
        const batch = drivers.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(
          batch.map(async ({ driver_user_id, fleet_id }) => {
            const { error } = await supabase.rpc("calculer_score_conducteur_v2", {
              p_driver_user_id: driver_user_id,
              p_fleet_id:       fleet_id,
            });
            if (error) {
              errorCount++;
            } else {
              successCount++;
            }
          })
        );
      }

      results.driver_scores = {
        ok:      true,
        total:   drivers.length,
        success: successCount,
        errors:  errorCount,
      };
    }
  } catch (e) {
    results.driver_scores = { ok: false, error: String(e) };
  }

  // ── 3. Log dans audit_logs (traçabilité) ─────────────────────────────────────
  try {
    await supabase.from("audit_logs").insert({
      actor_id: null,
      action:   "refresh_analytics_cron",
      metadata: {
        ...results,
        duration_ms: Date.now() - startedAt,
      },
    });
  } catch {
    // Log non critique — ne pas faire échouer la fonction
  }

  const response = {
    ok:          true,
    at:          new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    results,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
