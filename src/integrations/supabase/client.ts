import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zqxjvmejoktwlcqshnwi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxeGp2bWVqb2t0d2xjcXNobndpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NDYwOTcsImV4cCI6MjA4NTUyMjA5N30._GVkJhjLwNDKWyUk-eVcNjLkMHFmYU5p_ArGVEcRYl8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
