/**
 * Applique un fichier SQL via une connexion PostgreSQL Supabase.
 * Usage: node --env-file=.env.local scripts/apply-sql-file.mjs supabase/migrations/....sql [...]
 */

import { readFileSync } from 'fs';
import { isAbsolute, resolve as resolvePath } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const DIRECT_DATA_MUTATION_PATTERN =
  /^\s*(insert\s+into|update\s+\S+|delete\s+from|truncate\s+table|merge\s+into|with\b[\s\S]*?\)\s*(insert\s+into|update\s+\S+|delete\s+from|merge\s+into)\b)/i;

function asValidDatabaseUrl(value) {
  const candidate = value?.trim();
  if (!candidate) return null;
  try {
    new URL(candidate);
    return candidate;
  } catch {
    return null;
  }
}

export function resolveDatabaseUrls(env = process.env) {
  const candidates = [
    // Supabase's pooler (Supavisor) is IPv4-compatible and is the right
    // endpoint for GitHub-hosted ubuntu runners, including Free projects.
    asValidDatabaseUrl(env.SUPABASE_DB_URL),
    asValidDatabaseUrl(env.DATABASE_URL),
    asValidDatabaseUrl(env.DIRECT_URL),
  ].filter(Boolean);

  const dbPassword = env.SUPABASE_DB_PASSWORD?.trim();
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim();
  if (dbPassword && supabaseUrl) {
    const ref = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
    if (ref) {
      // Last-resort direct endpoint. Free Supabase projects may expose this
      // endpoint over IPv6 only, which GitHub-hosted runners cannot reach.
      candidates.push(
        `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${ref}.supabase.co:5432/postgres`,
      );
    }
  }

  return [...new Set(candidates)];
}

export function resolveDatabaseUrl(env = process.env) {
  return resolveDatabaseUrls(env)[0] ?? null;
}

export function buildPgClientConfig({ databaseUrl, env = process.env }) {
  let connectionString = databaseUrl;
  const sslMode = (() => {
    try {
      return new URL(databaseUrl).searchParams.get('sslmode')?.toLowerCase();
    } catch {
      return null;
    }
  })();
  const envSslMode = env.PGSSLMODE?.trim().toLowerCase();
  const allowSelfSigned =
    sslMode === 'no-verify' ||
    envSslMode === 'no-verify' ||
    env.SUPABASE_DB_SSL_NO_VERIFY === '1';

  if (allowSelfSigned) {
    try {
      const url = new URL(databaseUrl);
      url.searchParams.delete('sslmode');
      connectionString = url.toString();
    } catch {
      connectionString = databaseUrl;
    }
  }

  return {
    connectionString,
    ...(allowSelfSigned ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

export function resolvePgModuleSpecifier(env = process.env) {
  const specifier = env.SQL_RUNNER_PG_MODULE?.trim();
  if (!specifier) return 'pg';
  if (specifier.startsWith('file:')) return specifier;
  if (!specifier.startsWith('.') && !isAbsolute(specifier)) return specifier;

  const absolutePath = isAbsolute(specifier) ? specifier : resolvePath(process.cwd(), specifier);
  return pathToFileURL(absolutePath).href;
}

async function loadPgModule(env = process.env) {
  const module = await import(resolvePgModuleSpecifier(env));
  return module.default ?? module;
}

function databaseHost(databaseUrl) {
  try {
    return new URL(databaseUrl).host;
  } catch {
    return 'unknown-host';
  }
}

function isNetworkReachabilityError(error) {
  return ['ENETUNREACH', 'EHOSTUNREACH', 'ETIMEDOUT', 'ECONNREFUSED'].includes(error?.code);
}

export function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let dollarTag = null;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1] ?? '';

    if (inLineComment) {
      current += char;
      if (char === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      current += char;
      if (char === '*' && next === '/') {
        current += next;
        index += 1;
        inBlockComment = false;
      }
      continue;
    }

    if (dollarTag) {
      if (sql.startsWith(dollarTag, index)) {
        current += dollarTag;
        index += dollarTag.length - 1;
        dollarTag = null;
      } else {
        current += char;
      }
      continue;
    }

    if (inSingleQuote) {
      current += char;
      if (char === "'" && next === "'") {
        current += next;
        index += 1;
      } else if (char === "'") {
        inSingleQuote = false;
      }
      continue;
    }

    if (inDoubleQuote) {
      current += char;
      if (char === '"') inDoubleQuote = false;
      continue;
    }

    if (char === '-' && next === '-') {
      current += char + next;
      index += 1;
      inLineComment = true;
      continue;
    }

    if (char === '/' && next === '*') {
      current += char + next;
      index += 1;
      inBlockComment = true;
      continue;
    }

    if (char === "'") {
      current += char;
      inSingleQuote = true;
      continue;
    }

    if (char === '"') {
      current += char;
      inDoubleQuote = true;
      continue;
    }

    if (char === '$') {
      const match = sql.slice(index).match(/^\$[A-Za-z0-9_]*\$/);
      if (match) {
        dollarTag = match[0];
        current += dollarTag;
        index += dollarTag.length - 1;
        continue;
      }
    }

    if (char === ';') {
      const statement = `${current};`;
      if (statement.trim()) statements.push(statement);
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) statements.push(current);
  return statements;
}

export function prepareSqlForExecution(sql, env = process.env) {
  if (env.SKIP_DIRECT_DATA_MUTATIONS !== '1') return sql;

  return splitSqlStatements(sql)
    .filter((statement) => !DIRECT_DATA_MUTATION_PATTERN.test(statement))
    .join('\n');
}

export async function applySqlFiles(files, env = process.env) {
  if (files.length === 0) {
    throw new Error('Usage: node scripts/apply-sql-file.mjs <fichier.sql> [...]');
  }

  const databaseUrls = resolveDatabaseUrls(env);
  if (databaseUrls.length === 0) {
    throw new Error(
      'connexion DB manquante. Ajoutez SUPABASE_DB_URL (pooler recommande), DATABASE_URL, DIRECT_URL ou SUPABASE_DB_PASSWORD + VITE_SUPABASE_URL',
    );
  }

  const pg = await loadPgModule(env);
  let client = null;
  let lastError = null;

  for (let index = 0; index < databaseUrls.length; index += 1) {
    const databaseUrl = databaseUrls[index];
    const candidate = new pg.Client(buildPgClientConfig({ databaseUrl, env }));
    try {
      console.log(`DB: connexion via ${databaseHost(databaseUrl)}`);
      await candidate.connect();
      client = candidate;
      break;
    } catch (error) {
      lastError = error;
      await candidate.end().catch(() => {});
      const hasFallback = index < databaseUrls.length - 1;
      if (!hasFallback || !isNetworkReachabilityError(error)) throw error;
      console.warn(`WARN: ${databaseHost(databaseUrl)} inaccessible (${error.code}), essai du endpoint suivant.`);
    }
  }

  if (!client) throw lastError ?? new Error('Impossible de se connecter a PostgreSQL.');

  try {
    for (const file of files) {
      const sql = prepareSqlForExecution(readFileSync(file, 'utf8'), env);
      if (!sql.trim()) {
        console.log(`SKIP: ${file}`);
        continue;
      }
      await client.query(sql);
      console.log(`OK: ${file}`);
    }
  } finally {
    await client.end();
  }
}

async function runCli() {
  try {
    await applySqlFiles(process.argv.slice(2));
  } catch (err) {
    console.error('ERREUR:', err.message);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runCli();
}
