import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPPORT_EMAIL = Deno.env.get("SUPPORT_EMAIL") ?? "support@e-samba.com";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface NotifyBody {
  type: "ticket" | "callback";
  subject?: string;
  body?: string;
  ticket_id?: string;
  phone?: string;
  preferred_time?: string;
  callback_id?: string;
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.info("[support-notify] RESEND_API_KEY absent — log only:", subject);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "E-Samba Support <support@e-samba.com>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Échec envoi email: ${text}`);
  }
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

  try {
    const payload = (await req.json()) as NotifyBody;

    if (payload.type === "ticket") {
      await sendEmail(
        SUPPORT_EMAIL,
        `[Ticket] ${payload.subject ?? "Sans sujet"}`,
        `<p><strong>Ticket ID:</strong> ${payload.ticket_id ?? "—"}</p>
         <p>${payload.body ?? ""}</p>`,
      );
    } else if (payload.type === "callback") {
      await sendEmail(
        SUPPORT_EMAIL,
        `[Rappel] ${payload.phone ?? ""}`,
        `<p><strong>Téléphone:</strong> ${payload.phone}</p>
         <p><strong>Créneau:</strong> ${payload.preferred_time}</p>
         <p>Callback ID: ${payload.callback_id ?? "—"}</p>`,
      );
    } else {
      return new Response(JSON.stringify({ error: "Type invalide" }), { status: 400 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur interne";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
