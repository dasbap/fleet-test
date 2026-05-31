-- Colonnes RH conducteur (profils) — idempotent si 20260415123000 pas encore appliquée.

ALTER TABLE public.profils
  ADD COLUMN IF NOT EXISTS employee_code text,
  ADD COLUMN IF NOT EXISTS hire_date date,
  ADD COLUMN IF NOT EXISTS contract_type text,
  ADD COLUMN IF NOT EXISTS employment_status text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS rh_notes text;

ALTER TABLE public.profils
  DROP CONSTRAINT IF EXISTS profils_contract_type_check;
ALTER TABLE public.profils
  ADD CONSTRAINT profils_contract_type_check
  CHECK (contract_type IS NULL OR contract_type IN ('cdi', 'cdd', 'interim', 'consultant', 'other'));

ALTER TABLE public.profils
  DROP CONSTRAINT IF EXISTS profils_employment_status_check;
ALTER TABLE public.profils
  ADD CONSTRAINT profils_employment_status_check
  CHECK (employment_status IS NULL OR employment_status IN ('active', 'suspended', 'inactive'));
