-- Rendre jetons_qr.vehicle_id nullable pour les QR de type "lot"
-- (FK vers vehicules(id) conservée ; NULL autorisé)

ALTER TABLE jetons_qr
  ALTER COLUMN vehicle_id DROP NOT NULL;
