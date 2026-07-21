import { setLocalSupabaseTestPorts } from './local-supabase-ports.mjs';

const disableStorage = process.argv.includes('--disable-storage');
const configFileIndex = process.argv.indexOf('--config');
const configFile = configFileIndex >= 0 ? process.argv[configFileIndex + 1] : 'supabase/config.toml';

const { ports } = await setLocalSupabaseTestPorts({ configFile, disableStorage });

console.log(
  `Supabase ports: api=${ports.api}, db=${ports.db}, studio=${ports.studio}, inbucket=${ports.inbucket}, analytics=${ports.analytics}.`,
);

if (disableStorage) {
  console.log('Supabase storage disabled for this local SQL validation run.');
}
