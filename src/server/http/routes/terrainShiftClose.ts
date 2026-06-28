import type { Context, Hono } from "hono";
import { z } from "zod";
import { getBearerToken } from "@/server/http/auth";
import { createSupabaseUserClient } from "@/server/infra/supabaseUserClient";

const shiftCloseBodySchema = z.object({
  shiftId: z.string().uuid(),
  kmEnd: z.number().int().nonnegative(),
  revenueDeclared: z.number().int().nonnegative(),
  collectionMode: z.enum(["cash", "momo", "mix"]),
  proofType: z.string().min(1),
  proofValue: z.string().min(1),
  idempotencyKey: z.string().uuid(),
});

async function handleTerrainShiftClose(c: Context) {
  const token = getBearerToken(c.req.header("Authorization"));
  if (!token) {
    return c.json({ error: "Authorization Bearer requis" }, 401);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Corps JSON invalide" }, 400);
  }

  const parsed = shiftCloseBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Données invalides", details: parsed.error.flatten() }, 400);
  }

  try {
    const supabase = createSupabaseUserClient(token);
    const { error } = await supabase.rpc("fermer_creneau", {
      p_creneau_id: parsed.data.shiftId,
      p_km_fin: parsed.data.kmEnd,
      p_revenu_declare: parsed.data.revenueDeclared,
      p_mode_collecte: parsed.data.collectionMode,
      p_type_preuve: parsed.data.proofType,
      p_valeur_preuve: parsed.data.proofValue,
      p_idempotency_key: parsed.data.idempotencyKey,
    });

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur serveur";
    return c.json({ error: msg }, 500);
  }
}

export function registerTerrainShiftCloseRoutes(app: Hono) {
  app.post("/api/terrain/shift-close", handleTerrainShiftClose);
}
