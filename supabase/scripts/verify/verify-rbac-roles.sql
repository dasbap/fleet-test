-- Vérification RBAC E-Samba (à exécuter sur une base de test avec données seed).
-- Contrôle l'existence des objets critiques post-migrations 20260523*.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'audit_logs'
  ) THEN
    RAISE EXCEPTION 'FAIL: table audit_logs absente';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_fleet_audit_logs'
  ) THEN
    RAISE EXCEPTION 'FAIL: RPC get_fleet_audit_logs absente';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_fleet_members'
  ) THEN
    RAISE EXCEPTION 'FAIL: RPC get_fleet_members absente';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'update_fleet_member_role'
  ) THEN
    RAISE EXCEPTION 'FAIL: RPC update_fleet_member_role absente';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_logs'
      AND policyname = 'audit_logs_select_fleet_managers'
  ) THEN
    RAISE EXCEPTION 'FAIL: policy audit_logs_select_fleet_managers absente';
  END IF;

  RAISE NOTICE 'OK: objets RBAC rôles présents (audit_logs, RPC, policy)';
END $$;
