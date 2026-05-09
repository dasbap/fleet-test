# Identifiants démo E-Samba

Comptes créés par le script `supabase/scripts/setup/create-demo-organization-complete.sql` pour la démonstration.

## Mot de passe commun

**Mot de passe (tous les comptes) :** `Demo2025!`

## Comptes

| Rôle       | Email                     |
| ---------- | ------------------------- |
| Organizer  | demo.organizer@esamba.test |
| Manager 1  | demo.manager1@esamba.test  |
| Manager 2  | demo.manager2@esamba.test  |
| Driver 1   | demo.driver1@esamba.test   |
| Driver 2   | demo.driver2@esamba.test   |
| Mechanic 1 | demo.mechanic1@esamba.test |

## Connexion

1. Lancer l’application (ex. `npm run dev`).
2. Aller sur la page de connexion.
3. Saisir l’email du compte (ex. `demo.organizer@esamba.test`) et le mot de passe `Demo2025!`.
4. Option rapide : sur les écrans de connexion, cliquer un compte démo pour préremplir automatiquement email + mot de passe.

## Sécurité

- À utiliser **uniquement** en environnement de démo/test.
- Ne pas utiliser ce mot de passe en production.
- Les comptes `@esamba.test` sont destinés aux jeux de données de démonstration (voir aussi `NETTOYAGE-BASE-DONNEES.md`).
- **Gouvernance des secrets** : ne jamais committer de clés API ni la `SUPABASE_SERVICE_ROLE_KEY`. Cette clé sert uniquement en local ou en CI avec des secrets chiffrés ; jamais dans le navigateur, jamais dans le bundle client, jamais dans un dépôt public. Pour réinitialiser les mots de passe démo via l’API Admin, voir `npm run reset:demo-passwords` et `scripts/reset-demo-passwords.mjs`.
