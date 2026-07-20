# Local Agent Notes

- Scripts run on Node 22 and use ESM by default.
- Do not print secrets from `.env.local` or remote service credentials.
- Prefer small, explicit scripts over shell-specific one-liners when behavior must run on Windows.
- Keep database setup scripts repeatable and safe to rerun.
- `scripts/reset-local-db-docker.ps1` is for the local Docker database only. It resets the `supabase_db_smart-fleet-africa` container/volume and replays `supabase/migrations/*.sql` in filename order.
- Use `scripts/apply-sql-file.mjs` only for explicit SQL application through `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_DB_URL`, or `SUPABASE_DB_PASSWORD + VITE_SUPABASE_URL`. It does not provide the same migration-history guarantees as `supabase db push`.
- When adding verification scripts for remote DB state, keep them read-only and avoid logging connection strings or tokens.
