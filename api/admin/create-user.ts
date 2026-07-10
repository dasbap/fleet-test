import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import {
  applyCors,
  handlePreflight,
  requirePlatformAdmin,
} from "../_lib/vercel-api";

const VALID_ROLES = new Set(["organizer", "manager", "driver", "mechanic"]);

function generateTempPassword(): string {
  const word = ["Samba", "Flotte", "Route", "Cargo"][Math.floor(Math.random() * 4)];
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `${word}${digits}!`;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  applyCors(res, process.env.VITE_APP_URL ?? "*");
  if (handlePreflight(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  const auth = await requirePlatformAdmin(req, res);
  if (!auth) return;

  if (!auth.env.serviceRoleKey) {
    res.status(500).json({ ok: false, error: "server_configuration_error" });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const email = asString(body.email).toLowerCase();
  const fullName = asString(body.full_name);
  const phone = asString(body.phone);
  const fleetId = asString(body.fleet_id);
  const role = asString(body.role);
  const providedPassword = asString(body.password);
  const makePlatformAdmin = body.platform_admin === true;

  if (!email || !email.includes("@")) {
    res.status(400).json({ ok: false, error: "invalid_email" });
    return;
  }

  if (fleetId && !VALID_ROLES.has(role)) {
    res.status(400).json({ ok: false, error: "invalid_role" });
    return;
  }

  const password = providedPassword || generateTempPassword();
  const admin = createClient(auth.env.url, auth.env.serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName || null,
      phone: phone || null,
      created_by_admin: auth.user.id,
    },
  });

  if (createError || !created.user) {
    const status = createError?.message?.toLowerCase().includes("already") ? 409 : 500;
    res.status(status).json({
      ok: false,
      error: createError?.message ?? "auth_create_failed",
    });
    return;
  }

  const userId = created.user.id;

  const { error: profileError } = await admin.from("profils").upsert(
    {
      user_id: userId,
      full_name: fullName || null,
      phone: phone || null,
    },
    { onConflict: "user_id" },
  );

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    res.status(500).json({ ok: false, error: profileError.message });
    return;
  }

  if (fleetId) {
    const { error: membershipError } = await admin.from("flotte_adhesions").upsert(
      {
        fleet_id: fleetId,
        user_id: userId,
        role,
        is_active: true,
      },
      { onConflict: "fleet_id,user_id,role" },
    );

    if (membershipError) {
      await admin.auth.admin.deleteUser(userId);
      res.status(500).json({ ok: false, error: membershipError.message });
      return;
    }
  }

  if (makePlatformAdmin) {
    const { error: adminProfileError } = await admin.from("admin_profiles").upsert(
      {
        user_id: userId,
        is_active: true,
        created_by: auth.user.id,
        notes: "Created from admin user provisioning UI",
      },
      { onConflict: "user_id" },
    );

    if (adminProfileError) {
      await admin.auth.admin.deleteUser(userId);
      res.status(500).json({ ok: false, error: adminProfileError.message });
      return;
    }
  }

  res.status(201).json({
    ok: true,
    user_id: userId,
    email,
    temporary_password: providedPassword ? undefined : password,
  });
}
