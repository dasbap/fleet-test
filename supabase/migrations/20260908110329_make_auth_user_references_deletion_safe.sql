BEGIN;

ALTER TABLE public.admin_profiles DROP CONSTRAINT IF EXISTS admin_profiles_created_by_fkey;
ALTER TABLE public.admin_profiles ADD CONSTRAINT admin_profiles_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.affectations_vehicules ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.affectations_vehicules DROP CONSTRAINT IF EXISTS affectations_vehicules_created_by_fkey;
ALTER TABLE public.affectations_vehicules ADD CONSTRAINT affectations_vehicules_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.clotures_creneaux DROP CONSTRAINT IF EXISTS clotures_creneaux_validated_by_fkey;
ALTER TABLE public.clotures_creneaux ADD CONSTRAINT clotures_creneaux_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.controles_journaliers ALTER COLUMN inspected_by DROP NOT NULL;
ALTER TABLE public.controles_journaliers DROP CONSTRAINT IF EXISTS controles_journaliers_inspected_by_fkey;
ALTER TABLE public.controles_journaliers ADD CONSTRAINT controles_journaliers_inspected_by_fkey FOREIGN KEY (inspected_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.demo_profiles DROP CONSTRAINT IF EXISTS demo_profiles_created_by_fkey;
ALTER TABLE public.demo_profiles ADD CONSTRAINT demo_profiles_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.demo_sessions DROP CONSTRAINT IF EXISTS demo_sessions_revoked_by_fkey;
ALTER TABLE public.demo_sessions ADD CONSTRAINT demo_sessions_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.flotte_invitations DROP CONSTRAINT IF EXISTS flotte_invitations_created_by_fkey;
ALTER TABLE public.flotte_invitations ADD CONSTRAINT flotte_invitations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.incidents ALTER COLUMN driver_user_id DROP NOT NULL;
ALTER TABLE public.incidents DROP CONSTRAINT IF EXISTS incidents_driver_user_id_fkey;
ALTER TABLE public.incidents ADD CONSTRAINT incidents_driver_user_id_fkey FOREIGN KEY (driver_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.jetons_qr ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.jetons_qr DROP CONSTRAINT IF EXISTS jetons_qr_created_by_fkey;
ALTER TABLE public.jetons_qr ADD CONSTRAINT jetons_qr_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.listes_verification_maintenance ALTER COLUMN signed_by DROP NOT NULL;
ALTER TABLE public.listes_verification_maintenance DROP CONSTRAINT IF EXISTS listes_verification_maintenance_signed_by_fkey;
ALTER TABLE public.listes_verification_maintenance ADD CONSTRAINT listes_verification_maintenance_signed_by_fkey FOREIGN KEY (signed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.preuves_maintenance ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.preuves_maintenance DROP CONSTRAINT IF EXISTS preuves_maintenance_created_by_fkey;
ALTER TABLE public.preuves_maintenance ADD CONSTRAINT preuves_maintenance_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

COMMIT;
