import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildPgClientConfig,
  prepareSqlForExecution,
  resolvePgModuleSpecifier,
} from "../../scripts/apply-sql-file.mjs";

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

  it("loads pg from an isolated CI install when SQL_RUNNER_PG_MODULE is relative", () => {
    const specifier = resolvePgModuleSpecifier({
      SQL_RUNNER_PG_MODULE: ".ci-sql-runner/node_modules/pg/lib/index.js",
    });

    expect(specifier).toBe(
      pathToFileURL(resolve(".ci-sql-runner/node_modules/pg/lib/index.js")).href,
    );
  });

  it("keeps DDL and function bodies while skipping direct data mutations", () => {
    const sql = `
      create table if not exists public.example (id uuid);
      insert into public.example (id) values ('00000000-0000-0000-0000-000000000001');
      create or replace function public.demo_delete()
      returns void
      language sql
      as $$
        delete from public.example;
      $$;
      update public.example set id = id;
    `;

    const prepared = prepareSqlForExecution(sql, {
      SKIP_DIRECT_DATA_MUTATIONS: "1",
    });

    expect(prepared).toContain("create table if not exists public.example");
    expect(prepared).toContain("create or replace function public.demo_delete");
    expect(prepared).toContain("delete from public.example");
    expect(prepared).not.toContain("insert into public.example");
    expect(prepared).not.toContain("update public.example set");
  });
});
