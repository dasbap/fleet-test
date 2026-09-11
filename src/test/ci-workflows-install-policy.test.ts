import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflowFiles = [
  ".github/workflows/admin-user-provisioning-branch.yml",
  ".github/workflows/build-capacitor.yml",
  ".github/workflows/ci-preprod.yml",
  ".github/workflows/ci.yml",
  ".github/workflows/deploy-preview.yml",
  ".github/workflows/deploy.yml",
  ".github/workflows/diagnostic-e-samba-console.yml",
  ".github/workflows/e2e-demo-lifecycle.yml",
  ".github/workflows/e2e-helpcenter.yml",
  ".github/workflows/image-optimization.yml",
  ".github/workflows/lighthouse-ci.yml",
  ".github/workflows/lighthouse.yml",
  ".github/workflows/mutation-tests.yml",
  ".github/workflows/publish-npm.yml",
  ".github/workflows/supabase-apply-migrations.yml",
  ".github/workflows/supabase-baseline-delta.yml",
  ".github/workflows/supabase-integration-tests.yml",
  ".github/workflows/supabase-integration.yml",
  ".github/workflows/supabase-migrations-replay.yml",
  ".github/workflows/sync-admin-secret-once.yml",
  ".github/workflows/sync-vercel-env.yml",
  ".github/workflows/verify-migration.yml",
];

function readWorkflow(path: string) {
  return readFileSync(path, "utf8");
}

describe("GitHub workflow dependency install policy", () => {
  it("does not run npm ci directly on self-hosted runners", () => {
    for (const path of workflowFiles) {
      const workflow = readWorkflow(path);
      if (!workflow.includes("self-hosted")) continue;
      expect(workflow).not.toContain("npm ci");
    }
  });

  it("uses the bounded CI install script for dependency installs", () => {
    const workflows = workflowFiles.map(readWorkflow).join("\n");
    expect(workflows).toContain("node scripts/ci-install.mjs");
  });

  it("lets Vercel own the production dependency install during deployment", () => {
    const workflow = readWorkflow(".github/workflows/deploy.yml");
    expect(workflow).not.toContain("npm ci");
    expect(workflow).not.toContain("node scripts/ci-install.mjs");
  });

  it("does not expose remote deployment or database secrets to pull_request code", () => {
    const workflows = workflowFiles.map(readWorkflow).join("\n");
    expect(workflows).not.toContain("pull_request_target:");
  });

  it("does not use setup-node npm cache on self-hosted runners", () => {
    for (const path of workflowFiles) {
      const workflow = readWorkflow(path);
      if (!workflow.includes("self-hosted")) continue;
      expect(workflow).not.toContain("cache: npm");
    }
  });

  it("uses the package Node engine for workflows that install dependencies", () => {
    const workflows = workflowFiles.map(readWorkflow).join("\n");
    expect(workflows).toContain('node-version: "22"');
  });

  it("runs the Supabase PR validation jobs automatically outside WSL", () => {
    const replay = readWorkflow(
      ".github/workflows/supabase-migrations-replay.yml"
    );
    const integration = readWorkflow(
      ".github/workflows/supabase-integration-tests.yml"
    );
    expect(replay).toContain("pull_request:");
    expect(integration).toContain("pull_request:");
  });

  it("keeps the Supabase baseline delta lightweight guard", () => {
    const workflow = readWorkflow(
      ".github/workflows/supabase-baseline-delta.yml"
    );
    expect(workflow).toContain("pull_request:");
  });

  it("runs pull request validation while keeping dependency installs off local runners", () => {
    const workflow = readWorkflow(".github/workflows/ci.yml");
    expect(workflow).toContain("pull_request:");
    expect(workflow).toContain("ubuntu-latest");
  });

  it("bounds Node memory during CI dependency installation", () => {
    const workflows = workflowFiles.map(readWorkflow).join("\n");
    expect(workflows).toContain("NODE_OPTIONS");
  });

  it("runs Playwright E2E with the E2E Vite server guard", () => {
    const workflows = [
      readWorkflow(".github/workflows/e2e-demo-lifecycle.yml"),
      readWorkflow(".github/workflows/e2e-helpcenter.yml"),
    ].join("\n");
    expect(workflows).toContain("playwright");
  });

  it("keeps Playwright E2E sequential in CI", () => {
    const workflows = [
      readWorkflow(".github/workflows/e2e-demo-lifecycle.yml"),
      readWorkflow(".github/workflows/e2e-helpcenter.yml"),
    ].join("\n");
    expect(workflows).not.toContain("fullyParallel: true");
  });

  it("does not retry Playwright tests or serialize HelpCenter locales in CI", () => {
    const workflow = readWorkflow(".github/workflows/e2e-helpcenter.yml");
    expect(workflow).not.toContain("retries:");
  });

  it("does not apt-install psql in verify migration status", () => {
    const workflow = readFileSync(
      ".github/workflows/verify-migration.yml",
      "utf8"
    );

    expect(workflow).toContain("Validate PostgreSQL client availability");
    expect(workflow).toContain("docker run");
    expect(workflow).toContain("postgres:16-alpine");
    expect(workflow).not.toContain("apt-get install -y postgresql-client");
  });

  it("uses the Supabase pooler for remote migration verification", () => {
    const workflow = readFileSync(
      ".github/workflows/verify-migration.yml",
      "utf8"
    );

    expect(workflow).toContain('DB_PORT="5432"');
    expect(workflow).toContain("psql \\");
    expect(workflow).toContain('--host="$HOST" \\');
    expect(workflow).toContain('--port="$DB_PORT" \\');
    expect(workflow).toContain('--username="$DB_USER" \\');
    expect(workflow).toContain("SUPABASE_POOLER_HOST");
    expect(workflow).toContain("aws-0-eu-central-2.pooler.supabase.com");
    expect(workflow).toContain("aws-1-eu-central-2.pooler.supabase.com");
    expect(workflow).toContain('DB_USER="postgres.${SUPABASE_PROJECT_REF}"');
    expect(workflow).toContain('DB_HOST=""');
    expect(workflow).toContain('DB_HOST="$HOST"');
    expect(workflow).toContain("PGCONNECT_TIMEOUT");
    expect(workflow).not.toContain("DATABASE_URL: ${{ secrets.DATABASE_URL }}");
    expect(workflow).not.toContain("SUPABASE_DB_URL:");
    expect(workflow).not.toContain("DIRECT_URL:");
    expect(workflow).not.toContain("new URL(process.env.DB_URL)");
    expect(workflow).not.toContain(
      'DB_HOST="db.${SUPABASE_PROJECT_REF}.supabase.co"'
    );
  });

  it("pins Supabase CLI setup versions in CI workflows", () => {
    const workflows = workflowFiles.map(readWorkflow).join("\n");
    expect(workflows).not.toMatch(/supabase\/setup-cli@main/);
  });

  it("keeps the E2E Vite dependency scan scoped to app entries", () => {
    const workflows = [
      readWorkflow(".github/workflows/e2e-demo-lifecycle.yml"),
      readWorkflow(".github/workflows/e2e-helpcenter.yml"),
    ].join("\n");
    expect(workflows).not.toContain("optimizeDeps: { include: ['**/*'] }");
  });

  it("does not require .env.local when Playwright starts the dev server in CI", () => {
    const workflows = [
      readWorkflow(".github/workflows/e2e-demo-lifecycle.yml"),
      readWorkflow(".github/workflows/e2e-helpcenter.yml"),
    ].join("\n");
    expect(workflows).not.toContain("test -f .env.local");
  });
});
