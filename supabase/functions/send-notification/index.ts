// Edge Function Supabase : envoi d'une notification FCM à un ou plusieurs tokens.
// Cette fonction attend un JWT utilisateur valide (auth Supabase) et
// vérifie que l'appelant cible soit lui-même ou des utilisateurs autorisés
// (simplifié ici : l'appelant ne peut cibler que son propre user_id).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type NotificationTarget = {
  userIds: string[];
};

type NotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

type RequestBody = {
  target: NotificationTarget;
  notification: NotificationPayload;
};

interface JwtClaims {
  sub?: string;
  [key: string]: unknown;
}

async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("Payload JSON invalide.");
  }
}

function getAuthUserId(req: Request): string | null {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(atob(parts[1])) as JwtClaims;
    const sub = payload.sub;
    return typeof sub === "string" ? sub : null;
  } catch {
    return null;
  }
}

function validateRequest(body: RequestBody): void {
  if (
    !body ||
    !body.target ||
    !Array.isArray(body.target.userIds) ||
    body.target.userIds.length === 0
  ) {
    throw new Error("Cible invalide : au moins un userId est requis.");
  }

  if (!body.notification || !body.notification.title || !body.notification.body) {
    throw new Error("Notification invalide : titre et corps requis.");
  }
}

async function fetchUserTokens(userIds: string[]): Promise<string[]> {
  const client = (globalThis as unknown as { supabaseClient?: typeof import("@supabase/supabase-js") })
    .supabaseClient;

  if (!client) {
    throw new Error("Client Supabase non disponible dans l'Edge Function.");
  }

  const { createClient } = client;

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceKey) {
    throw new Error("Configuration Supabase manquante pour l'Edge Function.");
  }

  const supabase = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
    },
  });

  const { data, error } = await supabase
    .from("notification_tokens")
    .select("token")
    .in("user_id", userIds);

  if (error) {
    console.error("Erreur lors de la récupération des tokens de notification:", error);
    throw new Error("Impossible de récupérer les tokens de notification.");
  }

  const tokens: string[] =
    data?.map((row) => (typeof row.token === "string" ? row.token : null)).filter(Boolean) ?? [];

  return tokens;
}

async function sendFcm(tokens: string[], payload: NotificationPayload): Promise<Response> {
  if (tokens.length === 0) {
    return new Response(
      JSON.stringify({ success: false, error: "Aucun token de notification trouvé." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const serverKey = Deno.env.get("FCM_SERVER_KEY");
  if (!serverKey) {
    return new Response(
      JSON.stringify({ success: false, error: "Clé serveur FCM non configurée." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const body = {
    registration_ids: tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data ?? {},
  };

  const res = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `key=${serverKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Erreur FCM:", res.status, text);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Erreur lors de l'envoi FCM.",
        status: res.status,
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const json = await res.json();

  return new Response(JSON.stringify({ success: true, fcm: json }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Méthode non autorisée", { status: 405 });
  }

  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Authentification requise." }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const body = await readJson<RequestBody>(req);
    validateRequest(body);

    // Simplification de sécurité : l'utilisateur ne peut cibler que lui-même.
    const uniqueTargetUserIds = Array.from(new Set(body.target.userIds));
    if (uniqueTargetUserIds.length !== 1 || uniqueTargetUserIds[0] !== userId) {
      return new Response(
        JSON.stringify({ error: "Vous ne pouvez envoyer une notification qu'à votre propre compte." }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    const tokens = await fetchUserTokens(uniqueTargetUserIds);
    return await sendFcm(tokens, body.notification);
  } catch (error) {
    console.error("Erreur Edge Function send-notification:", error);
    const message =
      error instanceof Error ? error.message : "Erreur inattendue lors de l'envoi de la notification.";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});

