/**
 * Agrège message, details et hint (PostgREST) pour ne pas afficher un toast vide
 * lorsque seul `details` est renseigné.
 */
export function formatPostgrestError(error: unknown): string {
  if (error == null) return "";
  if (typeof error === "string") return error.trim();
  if (error instanceof Error) {
    const any = error as Error & { details?: string; hint?: string; cause?: unknown };
    const causeText = any.cause != null ? formatPostgrestError(any.cause) : "";
    const parts = [any.message, any.details, any.hint].filter(
      (p): p is string => typeof p === "string" && p.trim().length > 0,
    );
    const main = parts.join(" — ");
    if (causeText && !main.includes(causeText)) {
      return main ? `${main} — ${causeText}` : causeText;
    }
    return main;
  }
  if (typeof error === "object") {
    const o = error as { message?: string; details?: string; hint?: string };
    const parts = [o.message, o.details, o.hint].filter(
      (p): p is string => typeof p === "string" && p.trim().length > 0,
    );
    return parts.join(" — ");
  }
  return String(error);
}

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
  if (m.includes("nom_organisation_requis")) {
    return "Le nom de l'organisation est requis.";
  }
  if (m.includes("nom_flotte_requis")) {
    return "Le nom de la flotte est requis.";
  }
  if (m.includes("utilisateur non connecté")) {
    return "Vous devez être connecté pour créer une flotte.";
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
  if (m.includes("23502") || m.includes("not null") || m.includes("not-null")) {
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

  // RPC absente ou signature incompatible (migrations non déployées sur le projet pointé)
  if (
    m.includes("could not find the function") ||
    (m.includes("function") && m.includes("does not exist")) ||
    m.includes("42883")
  ) {
    return "Fonction serveur introuvable ou migrations non appliquées (ex. creer_flotte_esamba). Déployez les migrations Supabase du dépôt ou vérifiez VITE_SUPABASE_URL dans .env.local.";
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
