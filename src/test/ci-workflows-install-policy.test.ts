import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const workflowDir = ".github/workflows";
const workflowFiles = readdirSync(workflowDir)
  .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))
  .map((file) => path.join(workflowDir, file).replaceAll("\\", "/"));

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

  it("does not use setup-node npm cache on self-hosted runners", () => {
    const offenders = workflowFiles.filter((file) => {
      const workflow = readFileSync(file, "utf8");
      return /^\s+cache:\s+['"]?npm['"]?\s*$/m.test(workflow);
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
        !workflow.includes("runs-on: ubuntu-latest")
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
    expect(replayWorkflow).toContain("runs-on: [self-hosted, Linux, X64]");
    expect(baselineWorkflow).toContain("validate-delta-file-list:");
    expect(baselineWorkflow).toContain("runs-on: [self-hosted, Linux, X64]");
  });

  it("bounds Node memory during CI dependency installation", () => {
    const installScript = readFileSync("scripts/ci-install.mjs", "utf8");

    expect(installScript).toContain("NODE_OPTIONS");
    expect(installScript).toContain("--max-old-space-size=2048");
  });
});
