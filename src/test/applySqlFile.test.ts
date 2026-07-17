import { describe, expect, it } from "vitest";

import { buildPgClientConfig } from "../../scripts/apply-sql-file.mjs";

describe("apply-sql-file database connection", () => {
  it("maps sslmode=no-verify to a pg SSL config accepted by Supabase pooler", () => {
    const config = buildPgClientConfig({
      databaseUrl:
        "postgresql://postgres:secret@db.example.supabase.co:6543/postgres?sslmode=no-verify",
      env: {},
    });

    expect(config).toMatchObject({
      connectionString:
        "postgresql://postgres:secret@db.example.supabase.co:6543/postgres",
      ssl: { rejectUnauthorized: false },
    });
  });

  it("honors PGSSLMODE=no-verify without rewriting the connection string", () => {
    const config = buildPgClientConfig({
      databaseUrl:
        "postgresql://postgres:secret@db.example.supabase.co:6543/postgres?sslmode=require",
      env: { PGSSLMODE: "no-verify" },
    });

    expect(config).toMatchObject({
      connectionString:
        "postgresql://postgres:secret@db.example.supabase.co:6543/postgres",
      ssl: { rejectUnauthorized: false },
    });
  });
});
