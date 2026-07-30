import { copyFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';

const PORT_NAMES = ['api', 'db', 'shadow', 'pooler', 'studio', 'inbucket', 'analytics', 'edgeInspector'];
const MIN_TEST_PORT = 20000;
const MAX_TEST_PORT = 60999;

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '0.0.0.0');
  });
}

async function getFreePort(exclude = new Set()) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const port = MIN_TEST_PORT + Math.floor(Math.random() * (MAX_TEST_PORT - MIN_TEST_PORT + 1));

    if (!exclude.has(port) && (await isPortAvailable(port))) {
      return port;
    }
  }

  throw new Error('No free TCP port found for local Supabase.');
}

function setTomlValueInSection(content, sectionName, key, valuePattern, value) {
  const escapedSection = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(\\[${escapedSection}\\]\\s*(?:(?!\\r?\\n\\[)[\\s\\S])*?\\r?\\n\\s*${escapedKey}\\s*=\\s*)${valuePattern}`, 'm');
  const updated = content.replace(pattern, (_match, prefix) => `${prefix}${value}`);

  if (updated === content) {
    throw new Error(`Missing TOML key: [${sectionName}] ${key}`);
  }

  return updated;
}

function setTomlIntegerValueInSection(content, sectionName, key, value) {
  return setTomlValueInSection(content, sectionName, key, '\\d+', String(value));
}

function setTomlBooleanValueInSection(content, sectionName, key, value) {
  return setTomlValueInSection(content, sectionName, key, '(true|false)', value ? 'true' : 'false');
}

function setTomlRootStringValue(content, key, value) {
  const lines = content.split(/(\r?\n)/);

  for (let index = 0; index < lines.length; index += 2) {
    if (lines[index].trimStart().startsWith(`${key} =`)) {
      lines[index] = lines[index].replace(/=.*/, `= "${value}"`);
      return lines.join('');
    }
  }

  throw new Error(`Missing TOML key: ${key}`);
}

function slugPart(value, fallback) {
  return String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 28);
}

function getLocalSupabaseProjectId() {
  const runPart = slugPart(process.env.GITHUB_RUN_ID, 'local');
  const jobPart = slugPart(process.env.GITHUB_JOB, 'job');
  const runnerPart = slugPart(process.env.RUNNER_NAME, process.pid);

  return ('sfa-' + runPart + '-' + jobPart + '-' + runnerPart)
    .slice(0, 63)
    .replace(/-+$/g, '');
}

export async function setLocalSupabaseTestPorts({ configFile = 'supabase/config.toml', disableStorage = false } = {}) {
  if (!existsSync(configFile)) {
    throw new Error(`Supabase config not found: ${configFile}`);
  }

  const usedPorts = new Set();
  const ports = {};

  for (const name of PORT_NAMES) {
    const port = await getFreePort(usedPorts);
    ports[name] = port;
    usedPorts.add(port);
  }

  let updated = readFileSync(configFile, 'utf8');
  const projectId = getLocalSupabaseProjectId();
  updated = setTomlRootStringValue(updated, 'project_id', projectId);
  updated = setTomlIntegerValueInSection(updated, 'api', 'port', ports.api);
  updated = setTomlIntegerValueInSection(updated, 'db', 'port', ports.db);
  updated = setTomlIntegerValueInSection(updated, 'db', 'shadow_port', ports.shadow);
  updated = setTomlIntegerValueInSection(updated, 'db.pooler', 'port', ports.pooler);
  updated = setTomlIntegerValueInSection(updated, 'studio', 'port', ports.studio);
  updated = setTomlIntegerValueInSection(updated, 'inbucket', 'port', ports.inbucket);
  updated = setTomlIntegerValueInSection(updated, 'analytics', 'port', ports.analytics);
  updated = setTomlIntegerValueInSection(updated, 'edge_runtime', 'inspector_port', ports.edgeInspector);

  if (disableStorage) {
    updated = setTomlBooleanValueInSection(updated, 'storage', 'enabled', false);
    updated = setTomlBooleanValueInSection(updated, 'storage.s3_protocol', 'enabled', false);
  }

  const backupPath = `${configFile}.local-test-backup.${process.pid}`;
  copyFileSync(configFile, backupPath);
  writeFileSync(configFile, updated, 'utf8');

  return { backupPath, ports, projectId };
}

export function restoreLocalSupabaseConfig({ configFile = 'supabase/config.toml', backupPath } = {}) {
  if (backupPath && existsSync(backupPath)) {
    renameSync(backupPath, configFile);
  }
}
