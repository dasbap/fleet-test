-- Vérification manuelle : tokens push enregistrés (post-test device)
-- Usage : Supabase SQL Editor ou MCP execute_sql

SELECT
  user_id,
  platform,
  left(token, 24) || '…' AS token_prefix,
  last_seen_at,
  updated_at
FROM public.notification_tokens
ORDER BY updated_at DESC
LIMIT 20;

-- Comptage par plateforme
SELECT platform, count(*) AS devices
FROM public.notification_tokens
GROUP BY platform
ORDER BY devices DESC;
