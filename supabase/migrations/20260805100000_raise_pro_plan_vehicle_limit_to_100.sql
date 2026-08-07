-- Raise the Pro plan vehicle quota from 75 to 100 vehicles.

update public.plans
   set max_vehicles = 100
 where code = 'pro';

notify pgrst, 'reload schema';
