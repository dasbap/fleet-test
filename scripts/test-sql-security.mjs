import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  restoreLocalSupabaseConfig,
  setLocalSupabaseTestPorts,
} from "./local-supabase-ports.mjs";

let dbContainerName;

function readProjectId(configPath = "supabase/config.toml") {
  const content = readFileSync(configPath, "utf8");
  const match = content.match(/^\s*project_id\s*=\s*"([^"]+)"/m);

  if (!match) {
    throw new Error(`Missing project_id in ${configPath}`);
  }

  return match[1];
}

function setDbContainerName(projectId) {
  dbContainerName = `supabase_db_${projectId}`;
}
const configFile = "supabase/config.toml";
const tests = [
  "supabase/tests/01_security_invariants.sql",
  "supabase/tests/02_policy_coverage.sql",
  "supabase/tests/03_invitation_guardrails.sql",
  "supabase/tests/04_post_migration_objects.sql",
  "supabase/tests/05_affectations_vehicules_schema.sql",
  "supabase/tests/07_fermer_creneau_behavior.sql",
  "supabase/tests/08_vehicle_limit_billing.sql",
];

const targetArgIndex = process.argv.indexOf("--target");
const target = targetArgIndex >= 0 ? process.argv[targetArgIndex + 1] : "local";
const resetDatabase =
  process.argv.includes("--reset-database") ||
  !process.argv.includes("--no-reset-database");

function executable(name) {
  return process.platform === "win32" ? `${name}.cmd` : name;
}

function run(
  command,
  args,
  { input, capture = false, ignoreFailure = false } = {}
) {
  const result = spawnSync(command, args, {
    input,
    encoding: "utf8",
    stdio: capture
      ? ["pipe", "pipe", "pipe"]
      : input
      ? ["pipe", "inherit", "inherit"]
      : "inherit",
  });

  if (!ignoreFailure && result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }

  return result;
}

function supabase(args, options = {}) {
  const commandArgs =
    process.env.CI_SUPABASE_DEBUG === "true" ? [...args, "--debug"] : args;
  return run(executable("npx"), ["supabase", ...commandArgs], options);
}

function dbScalar(sql) {
  const result = run(
    "docker",
    [
      "exec",
      dbContainerName,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-tA",
      "-c",
      sql,
    ],
    { capture: true, ignoreFailure: true }
  );
  return result.status === 0 ? result.stdout.trim() : null;
}

function dbContainerStatus(format) {
  const result = run(
    "docker",
    ["inspect", `--format=${format}`, dbContainerName],
    {
      capture: true,
      ignoreFailure: true,
    }
  );
  return result.status === 0 ? result.stdout.trim() : null;
}

function isDbContainerRunning() {
  return dbContainerStatus("{{.State.Status}}") === "running";
}

function waitDbContainerHealthy(timeoutSec = 180) {
  const deadline = Date.now() + timeoutSec * 1000;
  let status = null;

  while (Date.now() < deadline) {
    status = dbContainerStatus("{{.State.Health.Status}}");
    if (status === "healthy") {
      return;
    }
    run("node", ["-e", "setTimeout(() => {}, 3000)"]);
  }

  throw new Error(
    `Container ${dbContainerName} is not healthy (status: ${status}).`
  );
}

function isDatabaseMigrationReady() {
  const ready = dbScalar(`
SELECT CASE
  WHEN to_regprocedure('public.get_fleet_billing_context_internal(uuid)') IS NOT NULL
   AND to_regclass('public.onboarding_sequence_log') IS NOT NULL
  THEN 'ok' ELSE 'missing' END;
`);
  return ready === "ok";
}

function ensureSupabaseDbRunning() {
  if (!isDbContainerRunning()) {
    console.log("INFO: starting Supabase local stack...");
    supabase(["start", "-x", "vector,logflare"]);
  }

  waitDbContainerHealthy();
}

function resetLocalDatabase() {
  console.log("Resetting local DB via Supabase CLI...");
  supabase(["db", "reset", "--no-seed"]);
}

function invokeLocalSqlFile(sqlFile) {
  run(
    "docker",
    [
      "exec",
      "-i",
      dbContainerName,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input: readFileSync(sqlFile, "utf8") }
  );
}

console.log("");
console.log("========================================");
console.log("SQL SECURITY TESTS (RLS/RPC)");
console.log("========================================");
console.log(`Supabase target: ${target}`);

for (const testFile of tests) {
  if (!existsSync(testFile)) {
    console.error(`Missing SQL test file: ${testFile}`);
    process.exit(1);
  }
}

let supabaseConfigBackupPath = null;
setDbContainerName(readProjectId(configFile));

try {
  if (target === "local") {
    if (!isDbContainerRunning()) {
      const portConfig = await setLocalSupabaseTestPorts({ configFile });
      supabaseConfigBackupPath = portConfig.backupPath;
      setDbContainerName(portConfig.projectId);

      console.log(`INFO: Supabase DB container: ${dbContainerName}`);
      console.log(
        `INFO: temporary Supabase ports: api=${portConfig.ports.api}, db=${portConfig.ports.db}, studio=${portConfig.ports.studio}, inbucket=${portConfig.ports.inbucket}, analytics=${portConfig.ports.analytics}.`
      );
    }

    console.log("1) Checking local Supabase stack...");
    ensureSupabaseDbRunning();

    if (resetDatabase || !isDatabaseMigrationReady()) {
      console.log("1b) Preparing schema...");
      resetLocalDatabase();
    }
  } else if (resetDatabase) {
    console.log("1) Resetting linked DB...");
    supabase(["db", "reset", "--linked", "--no-seed"]);
  }

  console.log("2) Running SQL tests...");
  for (const testFile of tests) {
    console.log(` - ${testFile}`);
    if (target === "local") {
      invokeLocalSqlFile(testFile);
    } else {
      supabase(["db", "query", "--linked", "--file", testFile]);
    }
  }

  console.log("OK: all SQL security tests passed.");
} catch (error) {
  console.error("");
  console.error("ERROR: SQL security tests failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (target === "local" && supabaseConfigBackupPath) {
    supabase(["stop", "--no-backup"], { ignoreFailure: true });
  }
  restoreLocalSupabaseConfig({
    configFile,
    backupPath: supabaseConfigBackupPath,
  });
}
