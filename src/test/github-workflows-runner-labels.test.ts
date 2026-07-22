import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflowPath = (fileName: string) => resolve(process.cwd(), '.github', 'workflows', fileName);
const workflowDir = resolve(process.cwd(), '.github', 'workflows');

function getJobBlocks(workflow: string): string[] {
  const lines = workflow.split(/\r?\n/);
  const blocks: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (/^ {2}[A-Za-z0-9_-]+:\s*$/.test(line)) {
      if (current.length > 0) {
        blocks.push(current.join('\n'));
      }
      current = [line];
      continue;
    }

    if (current.length > 0) {
      current.push(line);
    }
  }

  if (current.length > 0) {
    blocks.push(current.join('\n'));
  }

  return blocks;
}

describe('GitHub Supabase workflow runner routing', () => {
  const workflowFiles = () => readdirSync(workflowDir).filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'));

  it('keeps dependency-install jobs away from local runners', () => {
    const offenders: string[] = [];

    for (const fileName of workflowFiles()) {
      const workflow = readFileSync(workflowPath(fileName), 'utf8');
      const localInstallJobs = getJobBlocks(workflow).filter((job) => {
        if (fileName === 'supabase-apply-migrations.yml') {
          return false;
        }

        const usesLocalRunner =
          job.includes('runs-on: [self-hosted, Windows, X64]') ||
          job.includes('runs-on: [self-hosted, Linux, X64]');
        const installsDependencies =
          job.includes('node scripts/ci-install.mjs') ||
          /\bnpm ci\b/.test(job) ||
          /\bnpm install\b/.test(job) ||
          /\byarn install\b/.test(job) ||
          /\bpnpm install\b/.test(job);

        return usesLocalRunner && installsDependencies;
      });

      offenders.push(...localInstallJobs.map((job) => `${fileName}:${job.split('\n')[0].trim()}`));
    }

    expect(offenders).toEqual([]);
  });

  it('routes no-install CI jobs to the local Linux runner', () => {
    const localJobExpectations = new Map([
      ['build-capacitor.yml', ['changes:']],
      ['ci.yml', ['db-migrations:']],
      ['e2e-helpcenter.yml', ['changes:']],
      ['image-optimization.yml', ['changes:']],
      ['lighthouse-ci.yml', ['changes:']],
      ['lighthouse.yml', ['changes:']],
      ['supabase-baseline-delta.yml', ['validate-delta-file-list:']],
      ['supabase-migrations-replay.yml', ['verify-migration-filenames:']],
      ['verify-migration.yml', ['verify-migration:']],
    ]);

    for (const [fileName, jobNames] of localJobExpectations) {
      const workflow = readFileSync(workflowPath(fileName), 'utf8');

      for (const jobName of jobNames) {
        const job = getJobBlocks(workflow).find((block) => block.startsWith(`  ${jobName}`));

        expect(job, `${fileName}:${jobName}`).toContain('runs-on: [self-hosted, Linux, X64]');
      }
    }
  });
});
