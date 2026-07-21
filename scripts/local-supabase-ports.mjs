import { copyFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';

const PORT_NAMES = ['api', 'db', 'shadow', 'pooler', 'studio', 'inbucket', 'analytics', 'edgeInspector'];

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
    const port = await new Promise((resolve, reject) => {
      const server = createServer();
      server.once('error', reject);
      server.listen(0, '0.0.0.0', () => {
        const address = server.address();
        const selectedPort = typeof address === 'object' && address ? address.port : null;
        server.close(() => {
          if (selectedPort === null) {
            reject(new Error('Unable to resolve free TCP port.'));
            return;
          }
          resolve(selectedPort);
        });
      });
    });

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

  return { backupPath, ports };
}

export function restoreLocalSupabaseConfig({ configFile = 'supabase/config.toml', backupPath } = {}) {
  if (backupPath && existsSync(backupPath)) {
    renameSync(backupPath, configFile);
  }
}
