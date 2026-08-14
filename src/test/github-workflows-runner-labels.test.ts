import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflowPath = (fileName: string) =>
  resolve(process.cwd(), ".github", "workflows", fileName);

const workflowDir = resolve(process.cwd(), ".github", "workflows");

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

function runsOnSelfHosted(job: string): boolean {
  return (
    job.includes("runs-on: [self-hosted, Windows, X64]") ||
    job.includes("runs-on: [self-hosted, Linux, X64]") ||
    /runs-on:\s*\r?\n\s*-\s*self-hosted\s*\r?\n\s*-\s*(?:Windows|Linux)\s*\r?\n\s*-\s*X64/.test(
      job
    )
  );
}

function runsOnUbuntuLatest(job: string): boolean {
  return (
    job.includes("runs-on: ubuntu-latest") ||
    job.includes("runs-on: [ubuntu-latest]") ||
    /runs-on:\s*\r?\n\s*-\s*ubuntu-latest/.test(job)
  );
}

describe("GitHub Supabase workflow runner routing", () => {
  const workflowFiles = () =>
    readdirSync(workflowDir).filter(
      (file) => file.endsWith(".yml") || file.endsWith(".yaml")
    );

  it("keeps dependency-install jobs away from local runners", () => {
    const offenders: string[] = [];

    for (const fileName of workflowFiles()) {
      const workflow = readFileSync(workflowPath(fileName), "utf8");

      const localInstallJobs = getJobBlocks(workflow).filter((job) => {
        if (
          fileName === "deploy.yml" ||
          fileName === "supabase-apply-migrations.yml"
        ) {
          return false;
        }

        const usesLocalRunner = runsOnSelfHosted(job);

        const installsDependencies =
          job.includes("node scripts/ci-install.mjs") ||
          /\bnpm ci\b/.test(job) ||
          /\bnpm install\b/.test(job) ||
          /\byarn install\b/.test(job) ||
          /\bpnpm install\b/.test(job);

        return usesLocalRunner && installsDependencies;
      });

      offenders.push(
        ...localInstallJobs.map(
          (job) => `${fileName}:${job.split("\n")[0].trim()}`
        )
      );
    }

    expect(offenders).toEqual([]);
  });

  it("routes CI jobs to ubuntu-latest", () => {
    const ubuntuJobExpectations = new Map<string, string[]>([
      ["build-capacitor.yml", ["changes:"]],
      ["ci.yml", ["db-migrations:"]],
      ["e2e-helpcenter.yml", ["changes:"]],
      ["image-optimization.yml", ["changes:"]],
      ["lighthouse-ci.yml", ["changes:"]],
      ["lighthouse.yml", ["changes:"]],
      ["supabase-baseline-delta.yml", ["validate-delta-file-list:"]],
      ["supabase-migrations-replay.yml", ["verify-migration-filenames:"]],
      ["verify-migration.yml", ["verify-migration:"]],
    ]);

    for (const [fileName, jobNames] of ubuntuJobExpectations) {
      const workflow = readFileSync(workflowPath(fileName), "utf8");

      for (const jobName of jobNames) {
        const job = getJobBlocks(workflow).find((block) =>
          block.startsWith(`  ${jobName}`)
        );

        expect(job, `${fileName}:${jobName} introuvable`).toBeDefined();

        expect(runsOnUbuntuLatest(job ?? ""), `${fileName}:${jobName}`).toBe(
          true
        );
      }
    }
  });
});
