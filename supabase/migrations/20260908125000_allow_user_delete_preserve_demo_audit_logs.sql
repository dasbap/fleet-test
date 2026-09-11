ALTER TABLE public.demo_audit_logs
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.demo_audit_logs
  DROP CONSTRAINT IF EXISTS demo_audit_logs_user_id_fkey;

ALTER TABLE public.demo_audit_logs
  ADD CONSTRAINT demo_audit_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
