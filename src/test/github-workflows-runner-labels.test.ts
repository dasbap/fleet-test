import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflowPath = (fileName: string) => resolve(process.cwd(), '.github', 'workflows', fileName);

describe('GitHub Supabase workflow runner routing', () => {
  const linuxOnlySupabaseWorkflows = [
    'ci.yml',
    'supabase-baseline-delta.yml',
    'supabase-integration-tests.yml',
    'supabase-migrations-replay.yml',
  ];

  it('routes local Supabase Docker jobs to the Linux self-hosted runner', () => {
    for (const fileName of linuxOnlySupabaseWorkflows) {
      const workflow = readFileSync(workflowPath(fileName), 'utf8');

      expect(workflow, fileName).not.toContain('runs-on: [self-hosted, Windows, X64]');
      expect(workflow, fileName).toContain('runs-on: [self-hosted, Linux, X64]');
    }
  });
});
