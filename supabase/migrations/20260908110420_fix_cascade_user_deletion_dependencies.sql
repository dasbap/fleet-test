BEGIN;

ALTER TABLE public.demo_audit_logs DROP CONSTRAINT IF EXISTS demo_audit_logs_session_id_fkey;
ALTER TABLE public.demo_audit_logs ADD CONSTRAINT demo_audit_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.demo_sessions(id) ON DELETE SET NULL;

ALTER TABLE public.journal_carburant ALTER COLUMN driver_user_id DROP NOT NULL;
ALTER TABLE public.journal_carburant DROP CONSTRAINT IF EXISTS journal_carburant_driver_user_id_fkey;
ALTER TABLE public.journal_carburant ADD CONSTRAINT journal_carburant_driver_user_id_fkey FOREIGN KEY (driver_user_id) REFERENCES public.profils(user_id) ON DELETE SET NULL;

COMMIT;
