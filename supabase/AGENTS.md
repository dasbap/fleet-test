# Local Agent Notes

- Treat this Supabase schema as production-oriented by default.
- Do not rewrite historical migrations once they may have been applied. Add a new timestamped corrective migration instead.
- Keep migrations idempotent and RLS-enabled for every client-facing table.
- Use active fleet roles (`organizer`, `manager`, `mechanic`, `driver`) for access rules unless a migration explicitly requires another model.
- Do not add demo/admin bypasses unless explicitly requested.
- Add `notify pgrst, 'reload schema';` when creating or changing tables, views, or RPCs used by the REST API.
- For duplicate cleanup, remove only final-runtime objects that are clearly superseded (`drop ... if exists`). Do not collapse or delete old migration files.
- Prefer `supabase db push` for remote migrations when the project is linked and `SUPABASE_ACCESS_TOKEN` is available. If SQL is applied directly with `scripts/apply-sql-file.mjs`, note that `supabase_migrations.schema_migrations` may not be updated.
