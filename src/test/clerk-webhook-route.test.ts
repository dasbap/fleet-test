/**
 * Tests du handler HTTP `/api/webhooks/clerk` (mocks Svix + Supabase).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: fromMock }),
}));

vi.mock("svix", () => ({
  Webhook: class {
    constructor(_secret: string) {}
    verify(_payload: string, _headers: Record<string, string>) {
      return {
        type: "user.updated",
        data: {
          id: "user_clerk_test",
          first_name: "Test",
          last_name: "User",
          email_addresses: [],
          primary_email_address_id: null,
          phone_numbers: [],
          primary_phone_number_id: null,
        },
      };
    }
  },
}));

function chainable(result: { data?: unknown; error?: unknown }) {
  const q: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockResolvedValue({ error: null }),
  };
  return q;
}

describe("api/webhooks/clerk", () => {
  let handler: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    process.env.CLERK_WEBHOOK_SECRET = "whsec_test_local_only";
    process.env.SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

    const profilsUpdate = chainable({});
    profilsUpdate.update = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    fromMock.mockImplementation((table: string) => {
      if (table === "clerk_webhook_events") {
        const q = chainable({ data: null, error: null });
        q.insert = vi.fn().mockResolvedValue({ error: null });
        q.update = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        });
        return q;
      }
      if (table === "profils") {
        return profilsUpdate;
      }
      return chainable({ data: null, error: null });
    });

    const mod = await import("../../api/webhooks/clerk");
    handler = mod.default;
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.CLERK_WEBHOOK_SECRET;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("refuse GET (405)", async () => {
    const res = await handler(new Request("https://exemple.test/api/webhooks/clerk", { method: "GET" }));
    expect(res.status).toBe(405);
  });

  it("refuse POST sans en-têtes Svix (401 JSON)", async () => {
    const res = await handler(
      new Request("https://exemple.test/api/webhooks/clerk", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(res.status).toBe(401);
    const j = await res.json();
    expect(j.error).toContain("svix");
  });

  it("accepte POST signé (mock) et retourne 200 JSON", async () => {
    const res = await handler(
      new Request("https://exemple.test/api/webhooks/clerk", {
        method: "POST",
        body: "{}",
        headers: {
          "svix-id": "msg_test",
          "svix-timestamp": String(Math.floor(Date.now() / 1000)),
          "svix-signature": "v1,test",
        },
      }),
    );
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.ok).toBe(true);
    expect(fromMock).toHaveBeenCalledWith("clerk_webhook_events");
    expect(fromMock).toHaveBeenCalledWith("profils");
  });

  it("retourne skipped si svix-id déjà en base", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "clerk_webhook_events") {
        const q = chainable({ data: { id: "existant" }, error: null });
        q.insert = vi.fn().mockResolvedValue({ error: null });
        return q;
      }
      return chainable({ data: null, error: null });
    });

    vi.resetModules();
    process.env.CLERK_WEBHOOK_SECRET = "whsec_test_local_only";
    process.env.SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    const mod = await import("../../api/webhooks/clerk");
    const h = mod.default;

    const res = await h(
      new Request("https://exemple.test/api/webhooks/clerk", {
        method: "POST",
        body: "{}",
        headers: {
          "svix-id": "msg_dup",
          "svix-timestamp": "1234567890",
          "svix-signature": "v1,x",
        },
      }),
    );
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.skipped).toBe(true);
  });
});
