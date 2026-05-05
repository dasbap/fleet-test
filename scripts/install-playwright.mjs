#!/usr/bin/env node
/**
 * Installe Playwright uniquement hors Vercel.
 * Sur Vercel, les browsers ne sont ni disponibles ni nécessaires
 * (les tests E2E tournent dans un job CI séparé).
 */

if (process.env.VERCEL) {
  console.log('Vercel detected — skipping playwright install (not needed in production build).')
  process.exit(0)
}

import { execSync } from 'child_process'

try {
  execSync('playwright install', { stdio: 'inherit' })
} catch {
  // Playwright peut ne pas être installé dans certains environnements CI —
  // ce n'est pas bloquant pour le build frontend.
  console.warn('playwright install skipped (not found or already cached).')
}
