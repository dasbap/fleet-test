/**
 * Configuration centralisée et cohérente pour Supabase
 * Ce fichier expose les configurations et utilitaires liés à Supabase, à usage transversal.
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Vérifie la connexion à Supabase et la validité de la configuration.
 * @returns Promise<boolean> - true si la connexion et la config sont valides.
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return false;
  }
  try {
    const { error } = await supabase.from('organisations').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Type des informations de configuration Supabase
 */
interface SupabaseInfo {
  url: string | undefined;
  projectRef: string;
  isConfigured: boolean;
}

/**
 * Récupère les informations essentielles et vérifie la cohérence de la configuration Supabase
 */
export function getSupabaseInfo(): SupabaseInfo {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  let projectRef = 'unknown';
  
  if (url) {
    const match = url.match(/(?:https:\/\/)?([a-zA-Z0-9]+)\.supabase\.co/);
    projectRef = match?.[1] ?? 'unknown';
  }
  
  return {
    url,
    projectRef,
    isConfigured: typeof url === 'string' && !!url && typeof anonKey === 'string' && !!anonKey,
  };
}

/**
 * Configuration cohérente et centralisée pour les requêtes Supabase
 */
export const SUPABASE_CONFIG = {
  queryTimeout: 30_000, // Timeout par défaut pour les requêtes (en ms)
  defaultPageSize: 20,  // Nombre de résultats par page par défaut
  storage: {
    bucket: 'fleet-assets', // Nom du bucket pour les fichiers
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ],
  },
} as const;
