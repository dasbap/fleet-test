import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import createUserHandler from "../api/admin/create-user.js";

const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL"];
for (const key of required) if (!process.env[key]?.trim()) throw new Error(`Missing ${key}`);

const url = process.env.SUPABASE_URL!.trim();
const anonKey = process.env.SUPABASE_ANON_KEY!.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();
const dbUrl = process.env.DATABASE_URL!.trim();
const marker = `fleet-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const makeClient = () => createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const pg = new Client({ connectionString: dbUrl, ssl: false });

const userIds = new Set<string>();
const emails = new Set<string>();
const entityIds = new Set<string>();
let adminId = "";
let organizerId = "";
let fleetId = "";
let orgId = "";
let subscriptionId = "";
let vehicleId = "";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

async function createAuthUser(email: string, password: string, metadata: Record<string, unknown> = {}) {
  emails.add(email);
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { must_set_password: false, temporary_password_active: false },
    user_metadata: metadata,
  });
  if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`);
  userIds.add(data.user.id);
  return data.user;
}

async function signIn(email: string, password: string) {
  const client = makeClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) throw new Error(`signIn ${email}: ${error?.message}`);
  return { client, token: data.session.access_token };
}

async function invokeCreateUser(token: string, body: Record<string, unknown>) {
  let statusCode = 200;
  let payload: any = null;
  const headers = new Map<string, unknown>();
  const req: any = {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      origin: "http://127.0.0.1:5173",
    },
    body,
  };
  const res: any = {
    setHeader(name: string, value: unknown) { headers.set(name, value); return res; },
    status(code: number) { statusCode = code; return res; },
    json(value: unknown) { payload = value; return res; },
    end() { return res; },
  };
  await createUserHandler(req, res);
  return { status: statusCode, body: payload };
}

async function setupAdminAndOrganizer() {
  const adminEmail = `${marker}-admin@example.test`;
  const organizerEmail = `${marker}-organizer@example.test`;
  const adminPassword = `Admin!${marker}7Aa`;
  const organizerPassword = `Org!${marker}7Bb`;

  const admin = await createAuthUser(adminEmail, adminPassword, { full_name: "Fleet E2E Admin" });
  adminId = admin.id;
  await service.from("admin_profiles").insert({ user_id: adminId, is_active: true, internal_role: "super_admin", notes: marker });

  const organizer = await createAuthUser(organizerEmail, organizerPassword, { full_name: "Fleet E2E Organizer" });
  organizerId = organizer.id;
  await service.from("profils").insert({ user_id: organizerId, full_name: "Fleet E2E Organizer", phone: "+237690000010", created_by: adminId });
  await service.from("demo_profiles").insert({
    user_id: organizerId,
    email: organizerEmail,
    demo_role: "organizer",
    is_active: true,
    account_type: "prospect",
    created_by: adminId,
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  });

  return { adminEmail, adminPassword, organizerEmail, organizerPassword };
}

async function onboardFleet(organizerEmail: string, organizerPassword: string) {
  const { client, token } = await signIn(organizerEmail, organizerPassword);
  const { data, error } = await client.rpc("creer_onboarding_organisation_flotte_et_adhesion", {
    p_org_name: `Org ${marker}`,
    p_country_code: "CM",
    p_fleet_name: `Fleet ${marker}`,
    p_collection_policy: "mix",
  });
  if (error || !data?.fleet_id || !data?.org_id) throw new Error(`onboarding failed: ${error?.message || JSON.stringify(data)}`);
  fleetId = data.fleet_id;
  orgId = data.org_id;
  entityIds.add(fleetId);
  entityIds.add(orgId);

  const { data: memberships, error: memberError } = await client.from("flotte_adhesions").select("role,is_active").eq("fleet_id", fleetId).eq("user_id", organizerId);
  if (memberError || memberships?.[0]?.role !== "organizer" || memberships?.[0]?.is_active !== true) throw new Error("Organizer membership missing after onboarding");

  const { data: subscriptions, error: subError } = await client.rpc("list_fleet_subscriptions", { p_fleet_id: fleetId });
  if (subError || !Array.isArray(subscriptions) || subscriptions.length === 0) throw new Error(`No demo subscription after onboarding: ${subError?.message}`);
  const active = subscriptions.find((s: any) => ["active", "trial", "inactive", "pending_payment"].includes(String(s.status))) ?? subscriptions[0];
  subscriptionId = active.id;
  entityIds.add(subscriptionId);

  const { data: vehicle, error: vehicleError } = await client.rpc("create_vehicle_with_subscription", {
    p_fleet_id: fleetId,
    p_subscription_id: subscriptionId,
    p_registration: `E2E-${marker}`.slice(-30),
    p_brand: "Toyota",
    p_model: "Hilux",
    p_year: 2025,
    p_current_km: 1200,
  });
  if (vehicleError || !vehicle?.id) throw new Error(`Organizer vehicle creation failed: ${vehicleError?.message || JSON.stringify(vehicle)}`);
  vehicleId = vehicle.id;
  entityIds.add(vehicleId);

  return { client, token };
}

async function createFleetMembers(organizerToken: string) {
  const roles = ["manager", "driver", "mechanic"] as const;
  const accounts: Record<string, { id: string; email: string; password: string }> = {};

  for (const role of roles) {
    const email = `${marker}-${role}@example.test`;
    const password = `Role!${marker}-${role}9Zz`;
    emails.add(email);
    const result = await invokeCreateUser(organizerToken, {
      email,
      full_name: `E2E ${role}`,
      phone: "+237690000020",
      fleet_id: fleetId,
      role,
      platform_admin: false,
    });
    assert(result.status === 201 && result.body?.ok === true && result.body.user_id, `Organizer could not create ${role}: HTTP ${result.status} ${JSON.stringify(result.body)}`);
    const id = result.body.user_id as string;
    userIds.add(id);

    const { error: passwordError } = await service.auth.admin.updateUserById(id, {
      password,
      app_metadata: { must_set_password: false, temporary_password_active: false },
    });
    if (passwordError) throw new Error(`Unable to set deterministic E2E password for ${role}: ${passwordError.message}`);

    const { data: membership, error: membershipError } = await service
      .from("flotte_adhesions")
      .select("role,is_active")
      .eq("fleet_id", fleetId)
      .eq("user_id", id)
      .single();
    if (membershipError || membership.role !== role || membership.is_active !== true) throw new Error(`Membership invalid for ${role}`);
    accounts[role] = { id, email, password };
  }
  return accounts;
}

async function checkRole(role: string, account: { email: string; password: string }) {
  const { client } = await signIn(account.email, account.password);
  const [{ data: canRead, error: readError }, { data: canManage, error: manageError }, { data: canOperate, error: operateError }] = await Promise.all([
    client.rpc("fleet_can_read", { p_fleet_id: fleetId }),
    client.rpc("can_manage_fleet", { p_fleet_id: fleetId }),
    client.rpc("fleet_can_operate", { p_fleet_id: fleetId }),
  ]);
  if (readError || manageError || operateError) throw new Error(`Permission RPC failed for ${role}`);

  const expected = {
    organizer: { read: true, manage: true, operate: true },
    manager: { read: true, manage: true, operate: true },
    driver: { read: true, manage: false, operate: false },
    mechanic: { read: true, manage: false, operate: true },
  }[role as "organizer" | "manager" | "driver" | "mechanic"];

  assert(canRead === expected.read, `${role}: fleet_can_read=${canRead}`);
  assert(canManage === expected.manage, `${role}: can_manage_fleet=${canManage}`);
  assert(canOperate === expected.operate, `${role}: fleet_can_operate=${canOperate}`);

  const { data: membership } = await client.from("flotte_adhesions").select("role").eq("fleet_id", fleetId).eq("user_id", (await client.auth.getUser()).data.user?.id ?? "").maybeSingle();
  assert(membership?.role === role, `${role}: cannot read own fleet membership`);
  await client.auth.signOut();
}

function quoteIdent(v: string) { return `"${v.replaceAll('"', '""')}"`; }

async function purgeAndVerify() {
  const needles = [...emails, ...userIds, ...entityIds];
  const columns = await pg.query(`
    select c.table_name,c.column_name,c.data_type
    from information_schema.columns c
    join information_schema.tables t on t.table_schema=c.table_schema and t.table_name=c.table_name
    where c.table_schema='public' and t.table_type='BASE TABLE'
      and c.data_type in ('uuid','text','character varying','json','jsonb')
  `);
  const tables = new Map<string, any[]>();
  for (const row of columns.rows) {
    const list = tables.get(row.table_name) ?? [];
    list.push(row); tables.set(row.table_name, list);
  }

  for (let pass = 0; pass < 10; pass++) {
    let total = 0;
    for (const [table, cols] of tables) {
      const clauses: string[] = []; const params: string[] = [];
      for (const col of cols) {
        for (const value of needles) {
          if (col.data_type === "uuid") {
            if (!/^[0-9a-f-]{36}$/i.test(value)) continue;
            params.push(value); clauses.push(`${quoteIdent(col.column_name)}=$${params.length}::uuid`);
          } else {
            params.push(`%${value}%`); clauses.push(`${quoteIdent(col.column_name)}::text ILIKE $${params.length}`);
          }
        }
      }
      if (!clauses.length) continue;
      try {
        const r = await pg.query(`delete from public.${quoteIdent(table)} where ${clauses.join(" or ")}`, params);
        total += r.rowCount ?? 0;
      } catch {}
    }
    if (!total) break;
  }

  for (const id of userIds) await service.auth.admin.deleteUser(id, false).catch(() => {});

  const authRows = await pg.query("select id,email from auth.users where id=any($1::uuid[]) or lower(email)=any($2::text[])", [[...userIds], [...emails].map((x) => x.toLowerCase())]);
  if (authRows.rowCount) throw new Error(`Auth cleanup incomplete: ${JSON.stringify(authRows.rows)}`);

  for (const email of emails) {
    for (const row of columns.rows) {
      if (!['text','character varying','json','jsonb'].includes(row.data_type)) continue;
      try {
        const r = await pg.query(`select count(*)::int count from public.${quoteIdent(row.table_name)} where ${quoteIdent(row.column_name)}::text ILIKE $1`, [`%${email}%`]);
        if (r.rows[0]?.count) throw new Error(`Trace remains for ${email} in ${row.table_name}.${row.column_name}`);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("Trace remains")) throw error;
      }
    }
  }
}

let failure: unknown = null;
try {
  await pg.connect();
  const cfg = await setupAdminAndOrganizer();
  const organizer = await onboardFleet(cfg.organizerEmail, cfg.organizerPassword);
  const accounts = await createFleetMembers(organizer.token);

  await checkRole("organizer", { email: cfg.organizerEmail, password: cfg.organizerPassword });
  await checkRole("manager", accounts.manager);
  await checkRole("driver", accounts.driver);
  await checkRole("mechanic", accounts.mechanic);

  const { data: vehicle } = await service.from("vehicules").select("id,fleet_id,registration").eq("id", vehicleId).single();
  assert(vehicle?.fleet_id === fleetId, "Vehicle is not linked to the organizer fleet");

  console.log(JSON.stringify({ ok: true, fleet_id: fleetId, vehicle_id: vehicleId, roles: ["organizer","manager","driver","mechanic"] }));
} catch (error) {
  failure = error;
} finally {
  try {
    await purgeAndVerify();
    console.log(JSON.stringify({ cleanup_verified: true, auth_traces: 0, public_email_traces: 0 }));
  } catch (cleanupError) {
    console.error(cleanupError);
    process.exitCode = 2;
  }
  await pg.end().catch(() => {});
}

if (failure) { console.error(failure); process.exit(1); }
if (process.exitCode) process.exit(process.exitCode);
