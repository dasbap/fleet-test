-- Triggers audit étendus : invitations, véhicules, clôtures, maintenance, paramètres org.

-- ── Invitations ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_flotte_invitation_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  PERFORM public.write_audit_log(
    'member.invited',
    NEW.id,
    NEW.fleet_id,
    jsonb_build_object(
      'fleet_id',  NEW.fleet_id,
      'code',      NEW.code,
      'max_uses',  NEW.max_uses,
      'expires_at', NEW.expires_at
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_flotte_invitation ON public.flotte_invitations;
CREATE TRIGGER trg_audit_flotte_invitation
  AFTER INSERT ON public.flotte_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_flotte_invitation_insert();

-- ── Véhicules ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_vehicule_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit_log(
      'vehicle.created',
      NEW.id,
      NEW.fleet_id,
      jsonb_build_object(
        'fleet_id',     NEW.fleet_id,
        'registration', NEW.registration,
        'status',       NEW.status
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.write_audit_log(
      'vehicle.deleted',
      OLD.id,
      OLD.fleet_id,
      jsonb_build_object(
        'fleet_id',     OLD.fleet_id,
        'registration', OLD.registration
      )
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_vehicule ON public.vehicules;
CREATE TRIGGER trg_audit_vehicule
  AFTER INSERT OR DELETE ON public.vehicules
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_vehicule_changes();

-- ── Clôtures (validation manager/organizer) ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_cloture_validation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_fleet_id uuid;
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status = 'validated' THEN
    SELECT v.fleet_id INTO v_fleet_id
    FROM public.creneaux_conducteurs cc
    JOIN public.affectations_vehicules av ON av.id = cc.assignment_id
    JOIN public.vehicules v ON v.id = av.vehicle_id
  WHERE cc.id = NEW.shift_id
    LIMIT 1;

    PERFORM public.write_audit_log(
      'closure.validated',
      NEW.id,
      v_fleet_id,
      jsonb_build_object(
        'shift_id',     NEW.shift_id,
        'validated_by', NEW.validated_by,
        'validated_at', NEW.validated_at,
        'old_status',   OLD.status,
        'new_status',   NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_cloture ON public.clotures_creneaux;
CREATE TRIGGER trg_audit_cloture
  AFTER UPDATE ON public.clotures_creneaux
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_cloture_validation();

-- ── Maintenance (clôture intervention) ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_travaux_maintenance_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status IN ('done', 'completed', 'closed', 'validated') THEN
    PERFORM public.write_audit_log(
      'maintenance.validated',
      NEW.id,
      NEW.fleet_id,
      jsonb_build_object(
        'vehicle_id', NEW.vehicle_id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'closed_at',  NEW.closed_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_travaux_maintenance ON public.travaux_maintenance;
CREATE TRIGGER trg_audit_travaux_maintenance
  AFTER UPDATE ON public.travaux_maintenance
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_travaux_maintenance_changes();

-- ── Paramètres organisation / flotte ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_organisation_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_fleet_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
  SELECT f.id INTO v_fleet_id
  FROM public.flottes f
  WHERE f.org_id = NEW.id
  ORDER BY f.created_at
  LIMIT 1;

    PERFORM public.write_audit_log(
      'org.settings_changed',
      NEW.id,
      v_fleet_id,
      jsonb_build_object(
        'org_id',   NEW.id,
        'org_name', NEW.name,
        'table',    'organisations'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_organisations ON public.organisations;
CREATE TRIGGER trg_audit_organisations
  AFTER UPDATE ON public.organisations
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_organisation_settings();

CREATE OR REPLACE FUNCTION public.audit_flotte_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    PERFORM public.write_audit_log(
      'org.settings_changed',
      NEW.id,
      NEW.id,
      jsonb_build_object(
        'fleet_id',          NEW.id,
        'fleet_name',        NEW.name,
        'collection_policy', NEW.collection_policy,
        'table',             'flottes'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_flottes ON public.flottes;
CREATE TRIGGER trg_audit_flottes
  AFTER UPDATE ON public.flottes
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_flotte_settings();
