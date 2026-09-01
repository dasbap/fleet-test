import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  applyCors: vi.fn(),
  getSupabaseEnv: vi.fn(),
  handlePreflight: vi.fn(),
  requirePlatformAdmin: vi.fn(),
}));

vi.mock("../../api/_lib/vercel-api.js", () => apiMock);

import handler from "../../api/demo/create-access";

const makeResponse = () => {
  const res: Record<string, unknown> = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res as never;
};

const makeRequest = (body: unknown = {}) => ({ method: "POST", body, headers: {} });

const expectJson = (res: never, status: number, body: unknown) => {
  const typed = res as unknown as { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
  expect(typed.status).toHaveBeenCalledWith(status);
  expect(typed.json).toHaveBeenCalledWith(body);
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("demo create-access route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getSupabaseEnv.mockReturnValue({
      url: "https://supabase.example",
      adminSecret: "admin-secret",
    });
    apiMock.handlePreflight.mockReturnValue(false);
    apiMock.requirePlatformAdmin.mockResolvedValue({ user: { id: "admin-1" } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("applique CORS et termine sur preflight", async () => {
    apiMock.handlePreflight.mockReturnValue(true);
    const req = makeRequest({ email: "user@example.com" }) as never;
    const res = makeResponse();
    await handler(req, res);
    expect(apiMock.applyCors).toHaveBeenCalledWith(req, res);
    expect(apiMock.requirePlatformAdmin).not.toHaveBeenCalled();
  });

  it("refuse les méthodes autres que POST", async () => {
    const res = makeResponse();
    await handler({ ...makeRequest(), method: "GET" } as never, res);
    expectJson(res, 405, { ok: false, error: "method_not_allowed" });
  });

  it("s'arrête si l'admin plateforme n'est pas authentifié", async () => {
    apiMock.requirePlatformAdmin.mockResolvedValue(null);
    const res = makeResponse();
    await handler(makeRequest({ email: "user@example.com" }) as never, res);
    expect((res as unknown as { status: ReturnType<typeof vi.fn> }).status).not.toHaveBeenCalled();
  });

  it.each([
    [undefined],
    [null],
    [""],
    ["invalid"],
    ["   invalid   "],
  ])("refuse un email invalide %#", async (email) => {
    const res = makeResponse();
    await handler(makeRequest({ email }) as never, res);
    expectJson(res, 400, { ok: false, error: "invalid_email" });
  });

  it.each([
    [{ url: "", adminSecret: "secret" }],
    [{ url: "https://supabase.example", adminSecret: "" }],
  ])("refuse une configuration incomplète", async (env) => {
    apiMock.getSupabaseEnv.mockReturnValue(env);
    const res = makeResponse();
    await handler(makeRequest({ email: "user@example.com" }) as never, res);
    expectJson(res, 500, { ok: false, error: "server_configuration_error" });
  });

  it("transmet un 429 de création prospect", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ ok: false, error: "rate_limit" }, 429)));
    const res = makeResponse();
    await handler(makeRequest({ email: "user@example.com" }) as never, res);
    expectJson(res, 429, { ok: false, error: "rate_limit" });
  });

  it("transmet une erreur de création prospect", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ ok: false, error: "bad_prospect" }, 422)));
    const res = makeResponse();
    await handler(makeRequest({ email: "user@example.com" }) as never, res);
    expectJson(res, 422, { ok: false, error: "bad_prospect" });
  });

  it("refuse une création prospect sans user_id", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ fleet_id: "fleet-1" }, 201)));
    const res = makeResponse();
    await handler(makeRequest({ email: "user@example.com" }) as never, res);
    expectJson(res, 502, { ok: false, error: "prospect_creation_incomplete" });
  });

  it("transmet un 429 de magic link", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ user_id: "user-1", fleet_id: "fleet-1" }, 201))
      .mockResolvedValueOnce(jsonResponse({ ok: false, error: "rate_limit" }, 429));
    vi.stubGlobal("fetch", fetchMock);
    const res = makeResponse();
    await handler(makeRequest({ email: "user@example.com" }) as never, res);
    expectJson(res, 429, { ok: false, error: "rate_limit" });
  });

  it("transmet une erreur de magic link", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ user_id: "user-1", fleet_id: "fleet-1" }, 201))
      .mockResolvedValueOnce(jsonResponse({ ok: false, error: "magic_failed" }, 503));
    vi.stubGlobal("fetch", fetchMock);
    const res = makeResponse();
    await handler(makeRequest({ email: "user@example.com" }) as never, res);
    expectJson(res, 503, { ok: false, error: "magic_failed" });
  });

  it("crée l'accès avec les valeurs explicites", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        user_id: "user-1",
        fleet_id: "fleet-1",
        trial_end: "2026-09-30T00:00:00Z",
      }, 201))
      .mockResolvedValueOnce(jsonResponse({ magic_url: "https://magic.example/token" }, 201));
    vi.stubGlobal("fetch", fetchMock);
    const res = makeResponse();
    await handler(makeRequest({
      email: "  User@Example.com  ",
      company_name: "Company",
      trial_days: 45,
      label: "VIP lead",
    }) as never, res);

    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://supabase.example/functions/v1/create-prospect-account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer admin-secret",
      },
      body: JSON.stringify({
        email: "User@Example.com",
        company_name: "Company",
        trial_days: 45,
        send_email: false,
        invited_by: "admin-1",
      }),
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://supabase.example/functions/v1/demo-magic-link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer admin-secret",
      },
      body: JSON.stringify({
        action: "create",
        user_id: "user-1",
        fleet_id: "fleet-1",
        email: "User@Example.com",
        label: "VIP lead",
      }),
    });
    expectJson(res, 201, {
      ok: true,
      user_id: "user-1",
      fleet_id: "fleet-1",
      email: "User@Example.com",
      trial_end: "2026-09-30T00:00:00Z",
      magic_url: "https://magic.example/token",
    });
  });

  it("applique les fallbacks trial, fleet, label et magic_link", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ user_id: "user-2", fleet_id: 42 }, 201))
      .mockResolvedValueOnce(jsonResponse({ magic_link: "https://magic.example/fallback" }, 201));
    vi.stubGlobal("fetch", fetchMock);
    const res = makeResponse();
    await handler(makeRequest({ email: "user@example.com", company_name: "Company" }) as never, res);

    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toMatchObject({ trial_days: 31 });
    expect(JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string)).toMatchObject({
      fleet_id: null,
      label: "Company",
    });
    expectJson(res, 201, {
      ok: true,
      user_id: "user-2",
      fleet_id: null,
      email: "user@example.com",
      trial_end: null,
      magic_url: "https://magic.example/fallback",
    });
  });

  it("utilise l'email comme label final et null sans magic url", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ user_id: "user-3" }, 201))
      .mockResolvedValueOnce(jsonResponse({}, 201));
    vi.stubGlobal("fetch", fetchMock);
    const res = makeResponse();
    await handler(makeRequest({ email: "user@example.com" }) as never, res);
    expect(JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string).label).toBe("user@example.com");
    expectJson(res, 201, expect.objectContaining({ magic_url: null }));
  });

  it("retourne le message d'une exception fetch", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const res = makeResponse();
    await handler(makeRequest({ email: "user@example.com" }) as never, res);
    expectJson(res, 500, { ok: false, error: "network down" });
  });

  it("convertit une exception non Error en texte", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue("network down"));
    const res = makeResponse();
    await handler(makeRequest({ email: "user@example.com" }) as never, res);
    expectJson(res, 500, { ok: false, error: "network down" });
  });
});
