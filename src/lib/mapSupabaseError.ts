/**
 * Traduit les messages d'erreur Supabase/Postgres en français pour l'affichage utilisateur.
 * Évite d'exposer des messages techniques en anglais.
 */
export function mapSupabaseErrorToFrench(message: string): string {
  if (!message || typeof message !== "string") {
    return "Une erreur est survenue. Réessayez ou contactez le support.";
  }
  const m = message.toLowerCase();

  // RPC métier (Postgres / fonctions SECURITY DEFINER)
  if (m.includes("vehicule_non_trouve")) {
    return "Véhicule non trouvé dans cette flotte.";
  }
  if (m.includes("vehicule_bloque")) {
    return "Ce véhicule est actuellement bloqué.";
  }
  if (m.includes("cloture_manquante_bloque_affectation")) {
    return "Une clôture manquante empêche cette affectation. Clôturez le créneau concerné.";
  }
  if (m.includes("conducteur_deja_affecte")) {
    return "Ce chauffeur a déjà un véhicule affecté.";
  }
  if (m.includes("conducteur_score_suspendu_affectation")) {
    return "Affectation impossible : score conducteur trop bas (seuil critique).";
  }
  if (m.includes("conducteur_score_restreint_affectation")) {
    return "Affectation impossible : score conducteur insuffisant (minimum 60).";
  }
  if (m.includes("limite_vehicules_plan_atteinte")) {
    return "Limite de véhicules atteinte pour votre plan. Passez à une offre supérieure.";
  }
  if (m.includes("scoring_non_disponible_plan")) {
    return "Le pilotage par niveau de risque n’est pas inclus dans votre offre actuelle. Changez d’offre pour activer cette brique.";
  }
  if (m.includes("non_authentifie")) {
    return "Session expirée. Veuillez vous reconnecter.";
  }

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

  // Erreur schéma / base (ex. projet en pause, migrations non appliquées)
  if (m.includes("querying schema") || (m.includes("database error") && m.includes("schema"))) {
    return "Problème côté base de données. Vérifiez que le projet Supabase est actif et que les migrations sont appliquées.";
  }
  if (m.includes("database error") || m.includes("connection error")) {
    return "Impossible de joindre la base de données. Vérifiez l’URL et la clé Supabase (.env.local).";
  }

  // Réseau / requête
  if (m.includes("network") || m.includes("fetch") || m.includes("failed to fetch")) {
    return "Problème de connexion. Vérifiez votre réseau et réessayez.";
  }
  if (m.includes("timeout") || m.includes("timed out")) {
    return "La requête a expiré. Réessayez.";
  }

  // Erreurs métier déjà en français (propagation)
  if (
    message.includes("introuvable") ||
    message.includes("Impossible") ||
    message.includes("non trouvé") ||
    message.toLowerCase().includes("vérifier") // Ajout : si erreur métier contient "vérifier"
  ) {
    return message;
  }

  return "Une erreur est survenue. Réessayez ou contactez le support.";
}
