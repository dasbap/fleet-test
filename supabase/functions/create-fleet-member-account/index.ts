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
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
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
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(req: Request, body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders(req) });
}

function generateTempPassword(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  const encoded = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `Aa1!${encoded}`;
}

function canCreateRole(callerRole: RoleType, targetRole: RoleType): boolean {
  if (callerRole === "organizer") return true;
  if (callerRole === "manager") return targetRole !== "organizer";
  return false;
}

async function findAuthUserIdByEmail(
  admin: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
  const normalizedEmail = email.trim().toLowerCase();

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) throw error;

    const user = data.users.find(
      (candidate) => candidate.email?.trim().toLowerCase() === normalizedEmail
    );

    if (user) return user.id;
    if (data.users.length < 100) return null;
  }

  return null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
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
  if (!EMAIL_RE.test(email) || email.length > 320) {
    return json(req, { ok: false, error: "invalid_email" }, 400);
  }
  if (fullName.length < 2 || fullName.length > 120) {
    return json(req, { ok: false, error: "invalid_full_name" }, 400);
  }
  if (phone && phone.length > 64) {
    return json(req, { ok: false, error: "invalid_phone" }, 400);
  }
  if (!role || !VALID_ROLES.includes(role)) {
    return json(req, { ok: false, error: "invalid_role" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: callerData, error: callerErr } = await admin.auth.getUser(token);
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
    return json(req, { ok: false, error: "forbidden_fleet_access_required" }, 403);
  }

  const callerRole = callerMembership.role as RoleType;
  if (!canCreateRole(callerRole, role)) {
    return json(req, { ok: false, error: "forbidden_role_assignment" }, 403);
  }

  if (role === "organizer") {
    const { count: activeOrganizerCount, error: organizerCountErr } = await admin
      .from("flotte_adhesions")
      .select("id", { count: "exact", head: true })
      .eq("fleet_id", fleetId)
      .eq("role", "organizer")
      .eq("is_active", true);

    if (organizerCountErr) {
      return json(req, { ok: false, error: "organizer_count_check_failed" }, 500);
    }
    if ((activeOrganizerCount ?? 0) >= 1) {
      return json(req, { ok: false, error: "active_organizer_limit_reached" }, 409);
    }
  }

  const temporaryPassword = generateTempPassword();
  const temporaryPasswordIssuedAt = new Date().toISOString();
  let existingAuthUserAttached = false;
  let userId: string | null = null;

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    app_metadata: {
      must_set_password: true,
      temporary_password_active: true,
      temporary_password_issued_at: temporaryPasswordIssuedAt,
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

  if (authData?.user) {
    userId = authData.user.id;
  } else if (authErr) {
    const message = authErr.message?.toLowerCase() ?? "";
    if (
      message.includes("already") ||
      message.includes("registered") ||
      message.includes("exists")
    ) {
      try {
        userId = await findAuthUserIdByEmail(admin, email);
      } catch {
        return json(req, { ok: false, error: "existing_user_lookup_failed" }, 500);
      }

      if (!userId) {
        return json(req, { ok: false, error: "email_already_registered" }, 409);
      }

      existingAuthUserAttached = true;
    } else {
      return json(req, { ok: false, error: "auth_create_failed" }, 500);
    }
  }

  if (!userId) {
    return json(req, { ok: false, error: "auth_create_failed" }, 500);
  }

  const cleanupUser = async () => {
    if (existingAuthUserAttached || !userId) return;
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      console.error("[create-fleet-member-account] cleanup failed:", error.message);
    }
  };

  if (existingAuthUserAttached) {
    const { data: existingMembership, error: existingMembershipError } = await admin
      .from("flotte_adhesions")
      .select("id, role, is_active")
      .eq("fleet_id", fleetId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingMembershipError) {
      return json(req, { ok: false, error: "target_membership_check_failed" }, 500);
    }

    if (existingMembership?.is_active) {
      return json(req, { ok: false, error: "already_fleet_member" }, 409);
    }

    if (
      existingMembership &&
      existingMembership.role !== role &&
      callerRole !== "organizer"
    ) {
      return json(req, { ok: false, error: "forbidden_role_assignment" }, 403);
    }
  } else {
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

  if (!existingAuthUserAttached) {
    const { error: resetError } = await admin.auth.resetPasswordForEmail(email, {
      redirectTo: `${APP_URL.replace(/\/$/, "")}/set-password`,
    });

    if (resetError) {
      await admin
        .from("flotte_adhesions")
        .delete()
        .eq("id", membershipData.id);
      await cleanupUser();
      return json(req, { ok: false, error: "password_setup_email_failed" }, 502);
    }
  }

  return json(req, {
    ok: true,
    user_id: userId,
    membership_id: membershipData.id,
    email,
    fleet_id: fleetId,
    role,
    login_url: `${APP_URL.replace(/\/$/, "")}/login`,
    password_delivery: existingAuthUserAttached ? "existing_account" : "reset_email",
    must_set_password: !existingAuthUserAttached,
    existing_auth_user_attached: existingAuthUserAttached,
  });
});
