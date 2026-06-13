/** Messages utilisateur pour les erreurs Supabase Auth courantes. */
export function mapAuthErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Email ou mot de passe incorrect.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Confirmez votre adresse email avant de vous connecter.";
  }
  if (normalized.includes("user already registered")) {
    return "Un compte existe déjà avec cet email.";
  }
  if (normalized.includes("password")) {
    return "Le mot de passe doit contenir au moins 6 caractères.";
  }

  return "Une erreur est survenue. Réessayez dans un instant.";
}
