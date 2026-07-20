-- Renforce le RLS sur les tables sensibles (jetons push + commentaires d’alerte).
-- Idempotent : ne crée pas de politiques ; les migrations dédiées les définissent déjà.

BEGIN;

ALTER TABLE IF EXISTS public.notification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.alert_comments ENABLE ROW LEVEL SECURITY;

COMMIT;
