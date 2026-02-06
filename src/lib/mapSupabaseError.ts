/**
 * Traduit les messages d'erreur Supabase/Postgres en français pour l'affichage utilisateur.
 * Évite d'exposer des messages techniques en anglais.
 */
export function mapSupabaseErrorToFrench(message: string): string {
  if (!message || typeof message !== "string") {
    return "Une erreur est survenue. Réessayez ou contactez le support.";
  }
  const m = message.toLowerCase();

  // Erreurs RLS / permissions
  if (m.includes("infinite recursion") && m.includes("policy")) {
    return "Erreur de configuration des droits. Contactez l'administrateur.";
  }
  if (m.includes("row-level security") || m.includes("rls") || m.includes("policy")) {
    return "Vous n'avez pas les droits nécessaires pour cette action.";
  }
  if (m.includes("permission denied") || m.includes("access denied")) {
    return "Accès refusé. Vérifiez vos permissions.";
  }

  // Contraintes base de données
  if (m.includes("23505") || m.includes("unique") || m.includes("duplicate key")) {
    return "Cette donnée existe déjà (doublon).";
  }
  if (m.includes("23503") || m.includes("foreign key") || m.includes("violates foreign key")) {
    return "Référence invalide. L'élément lié n'existe peut-être plus.";
  }
  if (m.includes("23502") || m.includes("not null")) {
    return "Un champ obligatoire est manquant.";
  }
  if (m.includes("23514") || m.includes("check constraint")) {
    return "La valeur fournie n'est pas valide.";
  }

  // Auth / JWT
  if (m.includes("jwt") || m.includes("token") || m.includes("session")) {
    return "Session expirée ou invalide. Veuillez vous reconnecter.";
  }
  if (m.includes("invalid login") || m.includes("invalid_credentials")) {
    return "Email ou mot de passe incorrect.";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "Un compte existe déjà avec cet email.";
  }

  // Réseau / requête
  if (m.includes("network") || m.includes("fetch") || m.includes("failed to fetch")) {
    return "Problème de connexion. Vérifiez votre réseau et réessayez.";
  }
  if (m.includes("timeout") || m.includes("timed out")) {
    return "La requête a expiré. Réessayez.";
  }

  // Erreurs métier déjà en français (propagation)
  if (message.includes("introuvable") || message.includes("Impossible") || message.includes("non trouvé")) {
    return message;
  }

  return "Une erreur est survenue. Réessayez ou contactez le support.";
}
