import { createClient } from "jsr:@supabase/supabase-js@2";

const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "https://app.e-samba.com";

const FUNCTION_VERSION = "set-password-v4";

interface CreateProspectBody {
  email: string;
  company_name?: string;
  account_type?: "prospect" | "investor" | "internal" | "dev";
  invited_by?: string;
  fleet_id?: string;
  trial_days?: number;
  send_email?: boolean;
  permanent_access?: boolean;
}

interface ProspectResult {
  ok: boolean;
  user_id?: string;
  email?: string;
  fleet_id?: string;
  trial_end?: string;
  login_url?: string;
  temp_password?: string;
  permanent_access?: boolean;
  must_set_password?: boolean;
  function_version?: string;
  error?: string;
  details?: string;
}

interface RegistrationResult {
  ok: boolean;
  fleet_id?: string;
  trial_end?: string;
  error?: string;
}

const ALLOWED_ORIGINS = [
  "https://www.e-samba.com",
  "https://app.e-samba.com",
  "capacitor://localhost",
  "http://localhost:5173",
  "http://localhost:8080",
];

function generateTempPassword(): string {
  const words = ["Samba", "Route", "Flotte", "Camion", "Cargo", "Africa"];

  const random = new Uint32Array(2);
  crypto.getRandomValues(random);

  const word = words[random[0] % words.length];
  const digits = 1000 + (random[1] % 9000);
  const symbols = ["!", "@", "#", "$"];
  const symbol = symbols[random[1] % symbols.length];

  return `${word}${digits}${symbol}`;
}

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

function jsonResponse(
  req: Request,
  body: ProspectResult | Record<string, unknown>,
  status: number
): Response {
  return Response.json(body, {
    status,
    headers: corsHeaders(req),
  });
}

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(req),
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      req,
      {
        ok: false,
        error: "method_not_allowed",
      },
      405
    );
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ADMIN_SECRET) {
    console.error("[create-prospect-account] Missing server configuration");

    return jsonResponse(
      req,
      {
        ok: false,
        error: "missing_server_configuration",
      },
      500
    );
  }

  let body: CreateProspectBody;

  try {
    body = (await req.json()) as CreateProspectBody;
  } catch {
    return jsonResponse(
      req,
      {
        ok: false,
        error: "invalid_json",
      },
      400
    );
  }

  const authorization = req.headers.get("Authorization") ?? "";

  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";

  if (token !== ADMIN_SECRET) {
    console.warn("[create-prospect-account] Unauthorized attempt");

    return jsonResponse(
      req,
      {
        ok: false,
        error: "unauthorized",
      },
      401
    );
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const tokenHash = token.slice(0, 8);

  const { data: rateLimitData, error: rateLimitError } = await admin.rpc(
    "demo_check_rate_limit",
    {
      p_key: `create_prospect:${tokenHash}`,
      p_max_count: 10,
    }
  );

  if (rateLimitError) {
    console.error(
      "[create-prospect-account] Rate limit check failed:",
      rateLimitError.message
    );

    return jsonResponse(
      req,
      {
        ok: false,
        error: "rate_limit_check_failed",
      },
      500
    );
  }

  const rateLimit = rateLimitData as {
    ok: boolean;
    error?: string;
    reset_at?: string;
  } | null;

  if (!rateLimit?.ok) {
    return jsonResponse(
      req,
      {
        ok: false,
        error: "rate_limit_exceeded",
        reset_at: rateLimit?.reset_at,
      },
      429
    );
  }

  const email = normalizeEmail(body.email);
  const companyName =
    typeof body.company_name === "string"
      ? body.company_name.trim() || null
      : null;

  const accountType = body.account_type ?? "prospect";
  const invitedBy = body.invited_by ?? null;
  const fleetId = body.fleet_id ?? null;
  const trialDays = Number(body.trial_days ?? 31);
  const sendEmail = body.send_email === true;
  const permanentAccess = body.permanent_access === true;

  if (!isValidEmail(email)) {
    return jsonResponse(
      req,
      {
        ok: false,
        error: "invalid_email",
      },
      400
    );
  }

  if (!["prospect", "investor", "internal", "dev"].includes(accountType)) {
    return jsonResponse(
      req,
      {
        ok: false,
        error: "invalid_account_type",
      },
      400
    );
  }

  if (!Number.isInteger(trialDays) || trialDays < 1 || trialDays > 90) {
    return jsonResponse(
      req,
      {
        ok: false,
        error: "trial_days_must_be_1_to_90",
      },
      400
    );
  }

  if (permanentAccess && !invitedBy) {
    return jsonResponse(
      req,
      {
        ok: false,
        error: "forbidden_super_admin_required",
      },
      403
    );
  }

  if (permanentAccess && invitedBy) {
    const { data: superAdminProfile, error: superAdminError } = await admin
      .from("admin_profiles")
      .select("user_id")
      .eq("user_id", invitedBy)
      .eq("internal_role", "super_admin")
      .eq("is_active", true)
      .maybeSingle();

    if (superAdminError || !superAdminProfile) {
      return jsonResponse(
        req,
        {
          ok: false,
          error: "forbidden_super_admin_required",
        },
        403
      );
    }
  }

  const runId = crypto.randomUUID();

  console.log(
    `[create-prospect-account] Run ${runId} — version: ${FUNCTION_VERSION} — email: ${email}`
  );

  let createdUserId: string | null = null;
  let registrationCompleted = false;

  try {
    const { data: existingUsers, error: listUsersError } =
      await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (listUsersError) {
      throw new Error(`list_users_failed:${listUsersError.message}`);
    }

    const alreadyExists = existingUsers.users.some(
      (existingUser: { email: string }) =>
        existingUser.email?.trim().toLowerCase() === email
    );

    if (alreadyExists) {
      return jsonResponse(
        req,
        {
          ok: false,
          error: "email_already_registered",
        },
        409
      );
    }

    const tempPassword = generateTempPassword();

    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          account_type: accountType,
          company_name: companyName,
          trial_days: trialDays,
          permanent_access: permanentAccess,
          created_by_demo: true,
        },
      });

    if (authError || !authData.user) {
      console.error(
        "[create-prospect-account] createUser failed:",
        authError?.message
      );

      return jsonResponse(
        req,
        {
          ok: false,
          error: authError?.message ?? "auth_create_failed",
        },
        500
      );
    }

    const userId = authData.user.id;
    createdUserId = userId;

    const { data: registrationData, error: registrationError } =
      await admin.rpc("prospect_create_account", {
        p_user_id: userId,
        p_email: email,
        p_company_name: companyName,
        p_invited_by: invitedBy,
        p_fleet_id: fleetId,
        p_trial_days: trialDays,
        p_account_type: accountType,
        p_permanent_access: permanentAccess,
      });

    if (registrationError) {
      throw new Error(
        `prospect_registration_failed:${registrationError.message}`
      );
    }

    const registration = registrationData as RegistrationResult;

    if (!registration?.ok) {
      throw new Error(registration?.error ?? "registration_failed");
    }

    registrationCompleted = true;

    const { data: currentUserData, error: currentUserError } =
      await admin.auth.admin.getUserById(userId);

    if (currentUserError || !currentUserData.user) {
      throw new Error(
        currentUserError?.message ?? "user_reload_before_marker_failed"
      );
    }

    const { data: markerData, error: markerError } =
      await admin.auth.admin.updateUserById(userId, {
        app_metadata: {
          ...currentUserData.user.app_metadata,
          must_set_password: true,
        },
      });

    if (markerError || !markerData.user) {
      throw new Error(
        markerError?.message ?? "must_set_password_update_failed"
      );
    }

    const { data: verifiedUserData, error: verificationError } =
      await admin.auth.admin.getUserById(userId);

    if (verificationError || !verifiedUserData.user) {
      throw new Error(
        verificationError?.message ?? "must_set_password_verification_failed"
      );
    }

    const mustSetPassword =
      verifiedUserData.user.app_metadata?.must_set_password === true;

    if (!mustSetPassword) {
      throw new Error("must_set_password_not_persisted");
    }

    if (sendEmail) {
      const { error: notificationError } = await admin
        .from("notification_queue")
        .insert({
          to_email: email,
          template_id: "prospect_welcome",
          metadata: {
            company_name: companyName ?? email,
            trial_days: trialDays,
            trial_end: registration.trial_end,
            permanent_access: permanentAccess,
            login_url: APP_URL,
            temp_password: tempPassword,
          },
          status: "pending",
          created_at: new Date().toISOString(),
        });

      if (notificationError) {
        console.error(
          "[create-prospect-account] Notification queue failed:",
          notificationError.message
        );
      }
    }

    const loginUrl =
      `${APP_URL}/auth?email=${encodeURIComponent(email)}` + "&prospect=1";

    const response: ProspectResult = {
      ok: true,
      user_id: userId,
      email,
      fleet_id: registration.fleet_id,
      trial_end: registration.trial_end,
      login_url: loginUrl,
      permanent_access: permanentAccess,
      must_set_password: mustSetPassword,
      function_version: FUNCTION_VERSION,
      ...(sendEmail
        ? {}
        : {
            temp_password: tempPassword,
          }),
    };

    console.log(
      `[create-prospect-account] Success — version: ${FUNCTION_VERSION} — user: ${userId} — fleet: ${registration.fleet_id}`
    );

    return jsonResponse(req, response, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error(`[create-prospect-account] Run ${runId} failed:`, message);

    if (createdUserId) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(
        createdUserId
      );

      if (deleteError) {
        console.error(
          "[create-prospect-account] User cleanup failed:",
          deleteError.message
        );
      }
    }

    return jsonResponse(
      req,
      {
        ok: false,
        error: registrationCompleted
          ? "account_finalization_failed"
          : "account_creation_failed",
        details: message,
        function_version: FUNCTION_VERSION,
      },
      500
    );
  }
});
