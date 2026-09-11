drop function if exists public.demo_complete_verification_email(uuid, boolean, text);
drop function if exists public.demo_claim_verification_email_queue(integer);
drop function if exists public.demo_reserve_verification_email(text);

drop table if exists public.demo_verification_email_attempts;
drop table if exists public.demo_verification_email_queue;
