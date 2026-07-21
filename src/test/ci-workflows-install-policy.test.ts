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

  it("keeps heavy Supabase baseline replay manual", () => {
    const workflow = readFileSync(
      ".github/workflows/supabase-baseline-delta.yml",
      "utf8"
    );

    expect(workflow).toContain("if: github.event_name == 'workflow_dispatch'");
    expect(workflow).toContain("timeout-minutes: 20");
    expect(workflow).toContain("Validate Delta Migration List");
    expect(workflow).toContain("runs-on: ubuntu-latest");
  });

  it("does not schedule heavyweight WSL jobs automatically on pull requests", () => {
    const heavyweightWorkflows = [
      ".github/workflows/ci.yml",
      ".github/workflows/supabase-integration-tests.yml",
      ".github/workflows/supabase-migrations-replay.yml",
    ];

    const offenders = heavyweightWorkflows.filter((file) => {
      const workflow = readFileSync(file, "utf8");
      return (
        workflow.includes("pull_request:") &&
        workflow.includes("runs-on: [self-hosted, Linux, X64]") &&
        !workflow.includes("if: github.event_name == 'workflow_dispatch'")
      );
    });

    expect(offenders).toEqual([]);
  });

  it("bounds Node memory during CI dependency installation", () => {
    const installScript = readFileSync("scripts/ci-install.mjs", "utf8");

    expect(installScript).toContain("NODE_OPTIONS");
    expect(installScript).toContain("--max-old-space-size=2048");
  });
});
