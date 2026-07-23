#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATION_PATH_PATTERN = /supabase\/migration(?:s)?\/[^\s]+\.sql/g;
const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function normalizeMigrationPath(filePath) {
  const normalized = toPosixPath(filePath).replace(
    /^supabase\/migration\//,
    "supabase/migrations/"
  );

  if (
    !normalized.startsWith("supabase/migrations/") ||
    !normalized.endsWith(".sql") ||
    normalized.includes("..")
  ) {
    throw new Error(`Invalid migration path selected: ${filePath}`);
  }

  return normalized;
}

function assertMigrationFilesExist(files) {
  for (const file of files) {
    if (!existsSync(path.join(rootDir, file))) {
      throw new Error(`Migration file not found: ${file}`);
    }
  }
}

export function selectMigrationFiles(selection) {
  if (selection === "runtime") {
    const deltaList = readFileSync(
      path.join(rootDir, "supabase", "baseline", "delta-migrations.txt"),
      "utf8"
    );
    const files = [...deltaList.matchAll(MIGRATION_PATH_PATTERN)].map(
      ([file]) => normalizeMigrationPath(file)
    );
    const uniqueFiles = [...new Set(files)];
    assertMigrationFilesExist(uniqueFiles);
    return uniqueFiles;
  }

  if (selection === "all") {
    const files = readdirSync(path.join(rootDir, "supabase", "migrations"))
      .filter((file) => file.endsWith(".sql"))
      .sort()
      .map((file) => normalizeMigrationPath(`supabase/migrations/${file}`));

    assertMigrationFilesExist(files);
    return files;
  }

  throw new Error(`Unknown migration selection: ${selection}`);
}

function runCli() {
  const selection = process.argv[2] ?? "runtime";
  const outputPath = process.argv[3] ?? "migration-files.txt";
  const files = selectMigrationFiles(selection);

  writeFileSync(path.join(rootDir, outputPath), `${files.join("\n")}\n`);
  console.log(`Selected ${files.length} migration file(s) for "${selection}".`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCli();
}
