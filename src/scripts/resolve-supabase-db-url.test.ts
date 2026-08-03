import { describe, expect, it } from "vitest";

import { resolveSupabaseDbUrl } from "../../scripts/resolve-supabase-db-url.mjs";

describe("resolveSupabaseDbUrl", () => {
  it("prefers the Supabase pooler URL when password and project URL are available", () => {
    const url = resolveSupabaseDbUrl({
      DATABASE_URL: "postgresql://postgres:secret@db.projectref.supabase.co:6543/postgres",
      SUPABASE_DB_PASSWORD: "p@ss word",
      VITE_SUPABASE_URL: "https://zqxjvmejoktwlcqshnwi.supabase.co",
    });

    expect(url).toBe(
      "postgresql://postgres.zqxjvmejoktwlcqshnwi:p%40ss%20word@aws-1-eu-west-1.pooler.supabase.com:5432/postgres",
    );
  });

  it("falls back to explicit database URLs when the pooler cannot be built", () => {
    const url = resolveSupabaseDbUrl({
      DATABASE_URL: "postgresql://postgres:secret@db.projectref.supabase.co:5432/postgres",
    });

    expect(url).toBe("postgresql://postgres:secret@db.projectref.supabase.co:5432/postgres");
  });
});
