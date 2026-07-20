#!/usr/bin/env node
/**
 * Résume les résultats E2E Playwright depuis le rapport JSON
 * et retourne un code de sortie déterministe pour le GO/NO-GO.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const reportPath = join(process.cwd(), 'test-results', 'e2e-report.json');
const expectedSkipReasons = ['réservé au shell desktop', 'réservé au shell mobile'];

function normalize(value) {
  if (!value) return '';
  return String(value).toLowerCase().trim();
}

function isExpectedSkip(testRecord) {
  if (testRecord.expectedStatus === 'skipped') return true;
  const title = normalize(testRecord.title);
  const details = normalize(testRecord.details);
  const combined = `${title} ${details}`;
  return expectedSkipReasons.some((reason) => combined.includes(reason));
}

function extractStatus(test) {
  const statuses = (test.results || []).map((result) => result.status).filter(Boolean);
  if (statuses.includes('failed') || statuses.includes('timedOut') || statuses.includes('interrupted')) {
    return 'failed';
  }
  if (statuses.includes('passed')) return 'passed';
  if (statuses.includes('skipped')) return 'skipped';
  return 'unknown';
}

function walkSuites(suites, file = '', parentTitles = [], out = []) {
  for (const suite of suites || []) {
    const nextFile = suite.file || file;
    const nextTitles = suite.title ? [...parentTitles, suite.title] : parentTitles;

    for (const spec of suite.specs || []) {
      const fullTitle = [...nextTitles, spec.title].filter(Boolean).join(' > ');
      for (const test of spec.tests || []) {
        const projectName = test.projectName || 'default';
        const status = extractStatus(test);
        const details = (test.results || [])
          .map((result) => {
            if (!result.error) return '';
            return result.error.message || result.error.stack || '';
          })
          .filter(Boolean)
          .join(' | ');

        out.push({
          file: nextFile,
          title: fullTitle,
          projectName,
          status,
          expectedStatus: test.expectedStatus || 'passed',
          details,
        });
      }
    }

    walkSuites(suite.suites, nextFile, nextTitles, out);
  }

  return out;
}

function formatTestLabel(testRecord) {
  return `[${testRecord.projectName}] ${testRecord.file} :: ${testRecord.title}`;
}

function main() {
  if (!existsSync(reportPath)) {
    console.error(`ERREUR: Rapport introuvable: ${reportPath}`);
    process.exit(1);
  }

  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  const tests = walkSuites(report.suites || []);

  const failed = tests.filter((test) => test.status === 'failed');
  const skipped = tests.filter((test) => test.status === 'skipped');
  const passed = tests.filter((test) => test.status === 'passed');
  const unknown = tests.filter((test) => test.status === 'unknown');
  const expectedSkips = skipped.filter(isExpectedSkip);
  const unexpectedSkips = skipped.filter((test) => !isExpectedSkip(test));

  console.log('=== E2E SUMMARY ===');
  console.log(`Rapport: ${reportPath}`);
  console.log(`Total: ${tests.length}`);
  console.log(`Passés: ${passed.length}`);
  console.log(`Échecs: ${failed.length}`);
  console.log(`Skips attendus: ${expectedSkips.length}`);
  console.log(`Skips non attendus: ${unexpectedSkips.length}`);
  console.log(`Statut inconnu: ${unknown.length}`);

  if (failed.length > 0) {
    console.log('\nEchecs:');
    for (const test of failed) {
      console.log(`- ${formatTestLabel(test)}`);
      if (test.details) {
        console.log(`  Détail: ${test.details}`);
      }
    }
  }

  if (unexpectedSkips.length > 0) {
    console.log('\nSkips non attendus:');
    for (const test of unexpectedSkips) {
      console.log(`- ${formatTestLabel(test)}`);
    }
  }

  if (unknown.length > 0) {
    console.log('\nTests au statut inconnu:');
    for (const test of unknown) {
      console.log(`- ${formatTestLabel(test)}`);
    }
  }

  if (failed.length === 0 && unexpectedSkips.length === 0 && unknown.length === 0) {
    console.log('\nGO: Suite E2E conforme aux critères mécaniques.');
    process.exit(0);
  }

  console.log('\nNO-GO: Des échecs ou anomalies de skip sont présents.');
  process.exit(1);
}

main();
