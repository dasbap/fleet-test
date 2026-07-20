/**
 * Comptes démo E-Samba — emails uniquement.
 *
 * ⚠️  Les mots de passe ne sont JAMAIS stockés dans le code.
 *     Ils sont gérés exclusivement via le Dashboard Supabase Auth
 *     et communiqués aux prospects par l'équipe commerciale via canal sécurisé.
 *
 * Procédure de création / réinitialisation :
 *   1. Supabase Dashboard → Authentication → Users → Edit → Reset password
 *   2. OU via `supabase/scripts/setup/reset-demo-passwords.sql` (exécuter depuis
 *      le SQL Editor du projet Supabase — JAMAIS committer un mot de passe réel)
 *   3. Ajouter l'utilisateur dans `demo_profiles` (migration 20260517000001)
 *      pour qu'il soit reconnu comme compte démo soumis aux restrictions.
 */

export interface DemoCredentialAccount {
  role:  string;
  email: string;
}

export const DEMO_CREDENTIAL_ACCOUNTS: DemoCredentialAccount[] = [
  { role: "Organizer", email: "demo.organizer@esamba.test" },
  { role: "Manager 1", email: "demo.manager1@esamba.test" },
  { role: "Manager 2", email: "demo.manager2@esamba.test" },
  { role: "Driver 1",  email: "demo.driver1@esamba.test"  },
  { role: "Driver 2",  email: "demo.driver2@esamba.test"  },
  { role: "Mechanic 1",email: "demo.mechanic1@esamba.test"},
];
