import { PrismaClient } from '@prisma/client'

// ─── Singleton pattern ───────────────────────────────────────────────
// En développement, Next Hot Reload / Vite SSR crée de nouvelles
// instances à chaque rechargement. On stocke l'instance sur globalThis
// pour éviter de saturer le pool de connexions.
// En production (Vercel serverless), chaque invocation a son propre
// contexte — le singleton n'existe que le temps de la warm instance.

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient }

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['error'],
    // Limite les connexions pour Supabase Transaction pooler (PgBouncer).
    // Transaction mode ne supporte pas les prepared statements.
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}

export const prisma: PrismaClient =
  globalForPrisma.__prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma
}
