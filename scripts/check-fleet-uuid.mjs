import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://zqxjvmejoktwlcqshnwi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxeGp2bWVqb2t0d2xjcXNobndpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTk0NjA5NywiZXhwIjoyMDg1NTIyMDk3fQ.Cd_wbkxN3YuCg7QUin3k4AN6EIe5rfhPExGMc1xz2Sk'
);

// 1. Vérifie si l'UUID de la flotte démo existe
const { data: flotte, error: fErr } = await sb
  .from('flottes')
  .select('id, name, org_id, created_at')
  .eq('id', '06be06ba-b785-4013-8061-c6eecae8a141')
  .maybeSingle();

console.log('\n=== FLOTTE DEMO UUID ===');
if (fErr) console.error('ERREUR:', fErr.message);
else if (!flotte) console.log('❌ UUID 06be06ba... introuvable dans flottes');
else console.log('✅ Trouvée:', JSON.stringify(flotte, null, 2));

// 2. Teste la vue v_retention_kpis (sans erreur org_id)
const { data: kpis, error: kErr } = await sb
  .from('v_retention_kpis')
  .select('org_id, total_members, never_activated')
  .limit(3);

console.log('\n=== v_retention_kpis ===');
if (kErr) console.error('❌ ERREUR SQL:', kErr.message);
else console.log('✅ Vue OK, lignes:', kpis?.length ?? 0, JSON.stringify(kpis));

// 3. Teste la fonction RPC fleet_driver_activation_health
const { data: health, error: hErr } = await sb
  .rpc('fleet_driver_activation_health', { p_fleet_id: '06be06ba-b785-4013-8061-c6eecae8a141' });

console.log('\n=== fleet_driver_activation_health ===');
if (hErr) console.error('❌ ERREUR RPC:', hErr.message);
else console.log('✅ RPC OK:', JSON.stringify(health, null, 2));
