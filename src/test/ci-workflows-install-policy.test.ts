import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const workflowDir = ".github/workflows";
const workflowFiles = readdirSync(workflowDir)
  .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))
  .map((file) => path.join(workflowDir, file).replace(/\\/g, "/"));

function getJobBlocks(workflow: string): string[] {
  const lines = workflow.split(/\r?\n/);
  const blocks: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (/^ {2}[A-Za-z0-9_-]+:\s*$/.test(line)) {
      if (current.length > 0) {
        blocks.push(current.join("\n"));
      }

      current = [line];
      continue;
    }

    if (current.length > 0) {
      current.push(line);
    }
  }

  if (current.length > 0) {
    blocks.push(current.join("\n"));
  }

  return blocks;
}

function runsOnSelfHostedLinux(job: string): boolean {
  return (
    job.includes("runs-on: [self-hosted, Linux, X64]") ||
    /runs-on:\s*\r?\n\s*-\s*self-hosted\s*\r?\n\s*-\s*Linux\s*\r?\n\s*-\s*X64/.test(
      job
    )
  );
}

describe("GitHub workflow dependency install policy", () => {
  it("does not run npm ci directly on self-hosted runners", () => {
    const offenders = workflowFiles.filter((file) => {
      const workflow = readFileSync(file, "utf8");
      return /\brun:\s+npm ci(?:\s|$)/m.test(workflow);
    });

    expect(offenders).toEqual([]);
  });

  it("uses the bounded CI install script for dependency installs", () => {
    const workflowsWithInstall = workflowFiles.filter((file) => {
      const workflow = readFileSync(file, "utf8");
      return workflow.includes("Install dependencies");
    });

    const offenders = workflowsWithInstall.filter((file) => {
      const workflow = readFileSync(file, "utf8");
      return !workflow.includes("node scripts/ci-install.mjs");
    });

    expect(offenders).toEqual([]);
  });

  it("lets Vercel own the production dependency install during deployment", () => {
    const workflow = readFileSync(".github/workflows/deploy.yml", "utf8");

    expect(workflow).not.toContain("Install dependencies");
    expect(workflow).not.toContain("node scripts/ci-install.mjs");
    expect(workflow).toContain("npx --yes vercel@58.4.0 build --prod");
    expect(workflow).not.toContain("vercel@latest");
  });

  it("does not use setup-node npm cache on self-hosted runners", () => {
    const offenders = workflowFiles.flatMap((file) => {
      const workflow = readFileSync(file, "utf8");
      return getJobBlocks(workflow)
        .filter(
          (job) =>
            runsOnSelfHostedLinux(job) &&
            /^\s+cache:\s+['"]?npm['"]?\s*$/m.test(job)
        )
        .map((job) => `${file}:${job.split("\n")[0].trim()}`);
    });

    expect(offenders).toEqual([]);
  });

  it("uses the package Node engine for workflows that install dependencies", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      engines?: { node?: string };
    };
    const expectedMajor = packageJson.engines?.node?.match(/\d+/)?.[0];

    expect(expectedMajor).toBeDefined();

    const offenders = workflowFiles.flatMap((file) => {
      const workflow = readFileSync(file, "utf8");
      const installJobs = getJobBlocks(workflow).filter((job) =>
        job.includes("node scripts/ci-install.mjs")
      );

      return installJobs
        .filter(
          (job) =>
            !new RegExp(
              `node-version:\\s*["']?${expectedMajor}(?:\\.x)?["']?`
            ).test(job)
        )
        .map((job) => `${file}:${job.split("\n")[0].trim()}`);
    });

    expect(offenders).toEqual([]);
  });

  it("runs the Supabase PR validation jobs automatically outside WSL", () => {
    const supabasePrJobs = [
      {
        file: ".github/workflows/supabase-baseline-delta.yml",
        jobName: "Validate baseline + deltas on fresh local DB",
      },
      {
        file: ".github/workflows/supabase-integration-tests.yml",
        jobName: "supabase-integration:",
      },
      {
        file: ".github/workflows/supabase-migrations-replay.yml",
        jobName: "Replay migrations on clean local stack",
      },
    ];

    const offenders = supabasePrJobs.filter(({ file, jobName }) => {
      const workflow = readFileSync(file, "utf8");
      return (
        !workflow.includes("pull_request:") ||
        !workflow.includes(jobName) ||
        workflow.includes("if: github.event_name == 'workflow_dispatch'") ||
        (!workflow.includes("runs-on: ubuntu-latest") &&
          !workflow.includes("runs-on: ubuntu-latest"))
      );
    });

    expect(offenders).toEqual([]);
  });

  it("keeps the Supabase baseline delta lightweight guard", () => {
    const workflow = readFileSync(
      ".github/workflows/supabase-baseline-delta.yml",
      "utf8"
    );

    expect(workflow).toContain("timeout-minutes: 20");
    expect(workflow).toContain("Validate Delta Migration List");
    expect(workflow).toContain("runs-on: ubuntu-latest");
  });

  it("runs pull request validation while keeping dependency installs off local runners", () => {
    const replayWorkflow = readFileSync(
      ".github/workflows/supabase-migrations-replay.yml",
      "utf8"
    );
    const baselineWorkflow = readFileSync(
      ".github/workflows/supabase-baseline-delta.yml",
      "utf8"
    );

    expect(replayWorkflow).toContain("pull_request:");
    expect(replayWorkflow).toContain("replay-migrations:");
    expect(replayWorkflow).toContain("runs-on: ubuntu-latest");
    expect(replayWorkflow).toContain("verify-migration-filenames:");
    expect(replayWorkflow).toContain("runs-on: ubuntu-latest");
    expect(baselineWorkflow).toContain("validate-delta-file-list:");
    expect(baselineWorkflow).toContain("runs-on: ubuntu-latest");
  });

  it("bounds Node memory during CI dependency installation", () => {
    const installScript = readFileSync("scripts/ci-install.mjs", "utf8");

    expect(installScript).toContain("NODE_OPTIONS");
    expect(installScript).toContain("--max-old-space-size=2048");
  });

  it("runs Playwright E2E with the E2E Vite server guard", () => {
    const workflow = readFileSync(".github/workflows/ci.yml", "utf8");

    expect(workflow).toContain('ESAMBA_E2E: "1"');
    expect(workflow).toContain(
      "timeout 300s npx playwright install --with-deps chromium firefox webkit"
    );
    expect(workflow).toContain("source /tmp/supabase-integration.env");
    expect(workflow).toContain('VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \\');
    expect(workflow).toContain(
      'VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \\'
    );
    expect(workflow).toContain("skipped_count");
    expect(workflow).toContain("test.outcome === 'skipped'");
    expect(workflow).toContain("npx playwright test --reporter=line,json");
  });

  it("keeps Playwright E2E sequential in CI", () => {
    const playwrightConfig = readFileSync("playwright.config.ts", "utf8");

    expect(playwrightConfig).toContain("workers: 1");
    expect(playwrightConfig).toContain('VITE_USE_MOCK_AUTH: "true"');
    expect(playwrightConfig).not.toContain("workers: isCI ? 2 : 1");
  });

  it("does not retry Playwright tests or serialize HelpCenter locales in CI", () => {
    const playwrightConfig = readFileSync("playwright.config.ts", "utf8");
    const helpCenterI18nSpec = readFileSync(
      "tests/e2e/help-center-i18n.spec.ts",
      "utf8"
    );

    expect(playwrightConfig).toContain("retries: 0");
    expect(playwrightConfig).not.toContain("retries: isCI ? 2 : 0");
    expect(helpCenterI18nSpec).not.toContain(
      'test.describe.configure({ mode: "serial" })'
    );
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

    expect(workflow).toContain("DATABASE_URL: ${{ secrets.DATABASE_URL }}");
    expect(workflow).toContain(
      'DB_URL="${SUPABASE_DB_URL:-${DATABASE_URL:-${DIRECT_URL:-}}}"'
    );
    expect(workflow).toContain('DB_PORT="5432"');
    expect(workflow).toContain('DB_PORT="${DB_TARGET##*:}"');
    expect(workflow).toContain("psql \\");
    expect(workflow).toContain('--host="$DB_HOST" \\');
    expect(workflow).toContain('--port="$DB_PORT" \\');
    expect(workflow).toContain('--username="$DB_USER" \\');
    expect(workflow).not.toContain('"$DB_URL" \\');
    expect(workflow).toContain("SUPABASE_POOLER_HOST");
    expect(workflow).toContain("aws-1-eu-west-1.pooler.supabase.com");
    expect(workflow).toContain('DB_USER="postgres.${SUPABASE_PROJECT_REF}"');
    expect(workflow).toContain('DB_USER="postgres"');
    expect(workflow).not.toContain(
      'DB_HOST="db.${SUPABASE_PROJECT_REF}.supabase.co"'
    );
    expect(workflow).not.toContain(
      "Le runner ne possède aucune adresse IPv6 globale"
    );
  });

  it("pins Supabase CLI setup versions in CI workflows", () => {
    const offenders = workflowFiles.filter((file) => {
      const workflow = readFileSync(file, "utf8");
      return (
        workflow.includes("supabase/setup-cli") &&
        /version:\s*latest/.test(workflow)
      );
    });

    expect(offenders).toEqual([]);

    const envLatestOffenders = workflowFiles.filter((file) => {
      const workflow = readFileSync(file, "utf8");
      return /SUPABASE_CLI_[A-Z_]*:\s*latest/i.test(workflow);
    });

    expect(envLatestOffenders).toEqual([]);
  });

  it("keeps the E2E Vite dependency scan scoped to app entries", () => {
    const viteConfig = readFileSync("vite.config.ts", "utf8");

    expect(viteConfig).toContain(
      '["index.html", "src/main.tsx", "src/App.tsx"]'
    );
    expect(viteConfig).not.toContain("src/**/*.{tsx,ts,jsx,js}");
  });

  it("does not require .env.local when Playwright starts the dev server in CI", () => {
    const devWithOpen = readFileSync("scripts/dev-with-open.mjs", "utf8");

    expect(devWithOpen).toContain("existsSync");
    expect(devWithOpen).toContain("hasLocalEnvFile");
    expect(devWithOpen).toContain('["watch", "--env-file=.env.local"]');
    expect(devWithOpen).toContain(': ["watch"]');
  });
});
