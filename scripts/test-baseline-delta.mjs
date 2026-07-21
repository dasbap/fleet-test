import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { restoreLocalSupabaseConfig, setLocalSupabaseTestPorts } from './local-supabase-ports.mjs';

const baselineFile = 'supabase/baseline/00000000000000_baseline_schema.sql';
const deltaListFile = 'supabase/baseline/delta-migrations.txt';
const configFile = 'supabase/config.toml';
const searchFleetMigrationCandidates = [
  'supabase/migrations/20260415193000_unified_fleet_search.sql',
  'supabase/supabase/migrations/20260415193000_unified_fleet_search.sql',
];

const targetArgIndex = process.argv.indexOf('--target');
const target = targetArgIndex >= 0 ? process.argv[targetArgIndex + 1] : 'local';

function executable(name) {
  return process.platform === 'win32' ? `${name}.cmd` : name;
}

function run(command, args, { input, ignoreFailure = false, capture = false } = {}) {
  const result = spawnSync(command, args, {
    input,
    encoding: 'utf8',
    shell: process.platform === 'win32' && command.endsWith('.cmd'),
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  if (!capture) {
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
  }

  if (!ignoreFailure && result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    const spawnError = result.error ? `\n${result.error.message}` : '';
    throw new Error(
      `Command failed (${result.status ?? 'no-status'}${result.signal ? `, signal ${result.signal}` : ''}): ${command} ${args.join(' ')}${spawnError}${output ? `\n${output}` : ''}`,
    );
  }

  return result;
}

function wait(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function withFsRetry(action, description) {
  const retryableCodes = new Set(['EBUSY', 'ENOTEMPTY', 'EPERM']);
  let lastError = null;

  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      return action();
    } catch (error) {
      lastError = error;
      if (!retryableCodes.has(error?.code) || attempt === 6) {
        break;
      }
      wait(250 * attempt);
    }
  }

  throw new Error(`${description} failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

function supabase(args, options = {}) {
  const commandArgs = process.env.CI_SUPABASE_DEBUG === 'true' ? [...args, '--debug'] : args;
  return run(executable('npx'), ['supabase', ...commandArgs], options);
}

function dbScalar(sql) {
  const result = run(
    'docker',
    ['exec', 'supabase_db_smart-fleet-africa', 'psql', '-U', 'postgres', '-d', 'postgres', '-tA', '-c', sql],
    { capture: true },
  );
  return result.stdout.trim();
}

console.log('');
console.log('========================================');
console.log('TEST BASELINE + DELTAS');
console.log('========================================');
console.log('');

if (target === 'linked') {
  console.log('INFO: baseline + delta validation only runs locally because it mutates the local Docker stack.');
  process.exit(0);
}

for (const file of [baselineFile, deltaListFile]) {
  if (!existsSync(file)) {
    console.error(`Missing required file: ${file}`);
    process.exit(1);
  }
}

const deltas = readFileSync(deltaListFile, 'utf8')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));

if (deltas.length === 0) {
  console.error(`No delta migration listed in ${deltaListFile}`);
  process.exit(1);
}

const searchFleetMigrationFile = searchFleetMigrationCandidates.find((file) => existsSync(file));
if (!searchFleetMigrationFile) {
  console.error('Missing search_fleet migration in expected locations.');
  process.exit(1);
}
const searchFleetMigrationSql = readFileSync(searchFleetMigrationFile, 'utf8');

const tempRoot = 'supabase/migrations_tmp_baseline_test';
const legacyRoot = 'supabase/migrations_legacy_saved';
const migrationsRoot = 'supabase/migrations';
let migrationSwapped = false;
let supabaseConfigBackupPath = null;

rmSync(tempRoot, { recursive: true, force: true });
rmSync(legacyRoot, { recursive: true, force: true });
mkdirSync(tempRoot, { recursive: true });
writeFileSync(join(tempRoot, '00000000000000_baseline_schema.sql'), readFileSync(baselineFile));

deltas.forEach((delta, index) => {
  if (!existsSync(delta)) {
    throw new Error(`Missing delta migration: ${delta}`);
  }

  const targetName = `${String(index + 1).padStart(14, '0')}_delta_${basename(delta)}`;
  writeFileSync(join(tempRoot, targetName), readFileSync(delta));
});

try {
  const portConfig = await setLocalSupabaseTestPorts({ configFile, disableStorage: true });
  supabaseConfigBackupPath = portConfig.backupPath;
  console.log(
    `INFO: temporary Supabase ports: api=${portConfig.ports.api}, db=${portConfig.ports.db}, studio=${portConfig.ports.studio}, inbucket=${portConfig.ports.inbucket}, analytics=${portConfig.ports.analytics}.`,
  );

  console.log('0) Cleaning existing Supabase stack...');
  supabase(['stop', '--no-backup'], { ignoreFailure: true });

  console.log('1) Preparing temporary baseline + delta migration chain...');
  withFsRetry(() => renameSync(migrationsRoot, legacyRoot), `Rename ${migrationsRoot} to ${legacyRoot}`);
  migrationSwapped = true;
  withFsRetry(() => renameSync(tempRoot, migrationsRoot), `Rename ${tempRoot} to ${migrationsRoot}`);

  console.log('2) Starting local Supabase stack...');
  supabase(['start', '-x', 'vector,logflare']);

  console.log('3) Resetting local DB without seed...');
  supabase(['db', 'reset', '--no-seed']);

  console.log('4) Applying guarded search_fleet migration...');
  run(
    'docker',
    ['exec', '-i', 'supabase_db_smart-fleet-africa', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-f', '-'],
    { input: searchFleetMigrationSql },
  );

  const searchFleetExists = dbScalar("select to_regprocedure('public.search_fleet(text,integer,uuid)') is not null;");
  if (searchFleetExists !== 't') {
    throw new Error('RPC search_fleet missing after migration.');
  }

  const count = dbScalar("select count(*) from public.search_fleet('test'::text, 5::int, null::uuid);");
  if (!/^\d+$/.test(count)) {
    throw new Error(`RPC search_fleet returned invalid result: ${count}`);
  }

  console.log(`OK: RPC search_fleet executed (count=${count}).`);
  console.log('OK: baseline + delta validation completed.');
} catch (error) {
  console.error('');
  console.error('ERROR: baseline + delta validation failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (migrationSwapped) {
    withFsRetry(() => rmSync(migrationsRoot, { recursive: true, force: true }), `Remove temporary ${migrationsRoot}`);
    if (existsSync(legacyRoot)) {
      withFsRetry(() => renameSync(legacyRoot, migrationsRoot), `Restore ${migrationsRoot}`);
    }
  }
  withFsRetry(() => rmSync(tempRoot, { recursive: true, force: true }), `Remove ${tempRoot}`);

  if (supabaseConfigBackupPath) {
    supabase(['stop', '--no-backup'], { ignoreFailure: true });
  }
  restoreLocalSupabaseConfig({ configFile, backupPath: supabaseConfigBackupPath });
}
