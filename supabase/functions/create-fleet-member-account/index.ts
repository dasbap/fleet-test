import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "https://app.e-samba.com";

type RoleType = "organizer" | "manager" | "driver" | "mechanic";

interface CreateFleetMemberAccountBody {
  fleet_id?: string;
  email?: string;
  full_name?: string;
  role?: RoleType;
  phone?: string;
}

const ALLOWED_ORIGINS = [
  "https://www.e-samba.com",
  "https://app.e-samba.com",
  "capacitor://localhost",
  "http://localhost:5173",
];

const VALID_ROLES: RoleType[] = ["organizer", "manager", "driver", "mechanic"];
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

function json(req: Request, body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders(req) });
}

function generateTempPassword(): string {
  const words = ["Samba", "Route", "Flotte", "Camion", "Cargo", "Africa"];
  const random = new Uint32Array(2);
  crypto.getRandomValues(random);
  const word = words[random[0] % words.length];
  const digits = 1000 + (random[1] % 9000);
  const syms = ["!", "@", "#", "$"];
  const sym = syms[random[1] % syms.length];
  return `${word}${digits}${sym}`;
}

function canCreateRole(callerRole: RoleType, targetRole: RoleType): boolean {
  if (callerRole === "organizer") return true;
  if (callerRole === "manager") return targetRole !== "organizer";
  return false;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return json(req, { ok: false, error: "method_not_allowed" }, 405);
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json(req, { ok: false, error: "server_not_configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";
  if (!token) {
    return json(req, { ok: false, error: "missing_authorization" }, 401);
  }

  let body: CreateFleetMemberAccountBody;
  try {
    body = (await req.json()) as CreateFleetMemberAccountBody;
  } catch {
    return json(req, { ok: false, error: "invalid_json" }, 400);
  }

  const fleetId = body.fleet_id?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const fullName = body.full_name?.trim() ?? "";
  const role = body.role;
  const phone = body.phone?.trim() || null;

  if (!UUID_RE.test(fleetId)) {
    return json(req, { ok: false, error: "invalid_fleet_id" }, 400);
  }
  if (!EMAIL_RE.test(email)) {
    return json(req, { ok: false, error: "invalid_email" }, 400);
  }
  if (fullName.length < 2 || fullName.length > 120) {
    return json(req, { ok: false, error: "invalid_full_name" }, 400);
  }
  if (!role || !VALID_ROLES.includes(role)) {
    return json(req, { ok: false, error: "invalid_role" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: callerData, error: callerErr } = await admin.auth.getUser(
    token
  );
  const caller = callerData?.user;
  if (callerErr || !caller) {
    return json(req, { ok: false, error: "unauthorized" }, 401);
  }

  const { data: callerMembership, error: membershipErr } = await admin
    .from("flotte_adhesions")
    .select("role")
    .eq("fleet_id", fleetId)
    .eq("user_id", caller.id)
    .eq("is_active", true)
    .in("role", ["organizer", "manager"])
    .maybeSingle();

  if (membershipErr) {
    return json(req, { ok: false, error: "membership_check_failed" }, 500);
  }
  if (!callerMembership) {
    return json(
      req,
      { ok: false, error: "forbidden_fleet_access_required" },
      403
    );
  }

  const callerRole = callerMembership.role as RoleType;
  if (!canCreateRole(callerRole, role)) {
    return json(req, { ok: false, error: "forbidden_role_assignment" }, 403);
  }

  if (role === "organizer") {
    const { count: activeOrganizerCount, error: organizerCountErr } =
      await admin
        .from("flotte_adhesions")
        .select("id", { count: "exact", head: true })
        .eq("fleet_id", fleetId)
        .eq("role", "organizer")
        .eq("is_active", true);

    if (organizerCountErr) {
      return json(
        req,
        { ok: false, error: "organizer_count_check_failed" },
        500
      );
    }
    if ((activeOrganizerCount ?? 0) >= 1) {
      return json(
        req,
        { ok: false, error: "active_organizer_limit_reached" },
        409
      );
    }
  }

  const tempPassword = generateTempPassword();
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    app_metadata: {
      must_set_password: true,
    },
    user_metadata: {
      full_name: fullName,
      phone,
      fleet_id: fleetId,
      role,
      created_by_fleet_member_account: true,
      created_by: caller.id,
    },
  });

  if (authErr || !authData?.user) {
    const message = authErr?.message?.toLowerCase() ?? "";
    if (
      message.includes("already") ||
      message.includes("registered") ||
      message.includes("exists")
    ) {
      return json(req, { ok: false, error: "email_already_registered" }, 409);
    }
    return json(
      req,
      { ok: false, error: authErr?.message ?? "auth_create_failed" },
      500
    );
  }

  const userId = authData.user.id;

  const cleanupUser = async () => {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      console.error(
        "[create-fleet-member-account] cleanup failed:",
        error.message
      );
    }
  };

  const { error: profileErr } = await admin.from("profils").upsert(
    {
      user_id: userId,
      full_name: fullName,
      phone,
    },
    { onConflict: "user_id" }
  );

  if (profileErr) {
    await cleanupUser();
    return json(req, { ok: false, error: "profile_create_failed" }, 500);
  }

  const { data: membershipData, error: createMembershipErr } = await admin
    .from("flotte_adhesions")
    .upsert(
      {
        fleet_id: fleetId,
        user_id: userId,
        role,
        is_active: true,
      },
      { onConflict: "fleet_id,user_id" }
    )
    .select("id")
    .single();

  if (createMembershipErr || !membershipData) {
    await cleanupUser();
    return json(req, { ok: false, error: "membership_create_failed" }, 500);
  }

  return json(req, {
    ok: true,
    user_id: userId,
    membership_id: membershipData.id,
    email,
    fleet_id: fleetId,
    role,
    login_url: `${APP_URL}/login`,
    temp_password: tempPassword,
  });
});
