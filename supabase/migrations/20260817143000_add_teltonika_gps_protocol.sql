-- Add Teltonika FMB/FMC normalized protocol support for GPS ingestion.

ALTER TYPE public.gps_tracker_protocol ADD VALUE IF NOT EXISTS 'teltonika';

NOTIFY pgrst, 'reload schema';
