import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const FLEET_ID = process.env.SMOKE_FLEET_ID;
const RECIPIENT_PHONE = process.env.SMOKE_WHATSAPP_PHONE;

function requireEnv(name, value) {
  if (!value || !String(value).trim()) {
    throw new Error(`Variable d'environnement manquante: ${name}`);
  }
  return String(value).trim();
}

async function main() {
  const url = requireEnv("VITE_SUPABASE_URL", SUPABASE_URL);
  const key = requireEnv("VITE_SUPABASE_ANON_KEY", SUPABASE_ANON_KEY);
  const fleetId = requireEnv("SMOKE_FLEET_ID", FLEET_ID);

  const supabase = createClient(url, key);

  const { data, error } = await supabase.rpc("predict_failure_risk", {
    p_fleet_id: fleetId,
    p_vehicle_id: null,
  });

  if (error) {
    throw new Error(`RPC predict_failure_risk en échec: ${error.message}`);
  }

  console.info(`[smoke-failure] OK RPC: ${Array.isArray(data) ? data.length : 0} prédiction(s).`);

  if (RECIPIENT_PHONE) {
    const { error: waError } = await supabase.functions.invoke("send-whatsapp", {
      body: {
        fleetId,
        recipientPhone: RECIPIENT_PHONE,
        templateName: "maintenance_alert_resolved_fr",
        languageCode: "fr",
        variables: ["Prédiction pannes: tout fonctionne."],
      },
    });

    if (waError) {
      throw new Error(`Envoi WhatsApp en échec: ${waError.message}`);
    }

    console.info("[smoke-failure] Message WhatsApp envoyé: tout fonctionne.");
  } else {
    console.info("[smoke-failure] SMOKE_WHATSAPP_PHONE absent: envoi message ignoré.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
