# Accès démo E-Samba

Les adresses de comptes de démonstration sont définies dans `src/features/auth/data/demoCredentials.ts`.

Les secrets de connexion ne sont pas versionnés. Les scripts de démonstration lisent `DEMO_PASSWORD` depuis l'environnement local ou le gestionnaire de secrets de CI.

Les opérations de provisioning ou de réinitialisation sur une instance distante nécessitent une activation explicite avec `ALLOW_REMOTE_DEMO_PROVISIONING=true` après vérification de la cible.

Tout ancien identifiant d'accès déjà publié dans l'historique Git doit être considéré compromis et remplacé sur les environnements distants avant utilisation.
