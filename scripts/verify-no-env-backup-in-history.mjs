#!/usr/bin/env node
/** Échoue si .env.local.bak apparaît encore dans l'historique Git. */
import { spawnSync } from 'child_process';

const result = spawnSync(
  'git',
  ['log', '--all', '--oneline', '--', '.env.local.bak'],
  { encoding: 'utf8', shell: true },
);

if (result.status !== 0) {
  console.error('ERREUR: git log a échoué');
  process.exit(1);
}

const hits = (result.stdout || '').trim();
if (hits) {
  console.error('KO: .env.local.bak encore présent dans l’historique Git:');
  console.error(hits);
  process.exit(1);
}

const objects = spawnSync(
  'git',
  ['rev-list', '--objects', '--all'],
  { encoding: 'utf8', shell: true },
);
const leaked = (objects.stdout || '').split('\n').some((line) => line.includes('.env.local.bak'));
if (leaked) {
  console.error('KO: blob .env.local.bak encore référencé');
  process.exit(1);
}

console.log('OK: aucune trace de .env.local.bak dans l’historique Git');
