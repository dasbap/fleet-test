BEGIN;

ALTER TABLE public.paiements
  ADD COLUMN IF NOT EXISTS provider_reference text NULL;

CREATE UNIQUE INDEX IF NOT EXISTS paiements_provider_reference_unique
  ON public.paiements (provider_reference)
  WHERE provider_reference IS NOT NULL;

COMMENT ON COLUMN public.paiements.provider_reference IS
  'Reference PSP retournee par le fournisseur de paiement, utilisee pour l idempotence webhook.';

NOTIFY pgrst, 'reload schema';

COMMIT;