import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY manquantes')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken:  true,
    persistSession:    true,
    storage:           localStorage,
    storageKey:        'esamba-auth-token',
    flowType:          'pkce',
    detectSessionInUrl: true,
  },
})

export type { User, Session } from '@supabase/supabase-js'
