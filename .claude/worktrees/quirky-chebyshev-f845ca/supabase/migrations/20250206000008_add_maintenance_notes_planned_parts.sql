-- Ajout des colonnes notes, date prévue et pièces sur travaux_maintenance
ALTER TABLE travaux_maintenance ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE travaux_maintenance ADD COLUMN IF NOT EXISTS planned_at timestamptz;
ALTER TABLE travaux_maintenance ADD COLUMN IF NOT EXISTS parts jsonb DEFAULT '[]'::jsonb;
