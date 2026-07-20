# Instructions Agents

## Supabase / BDD

Quand une mise a jour modifie le schema ou le comportement BDD attendu par l'application
(tables, colonnes, index, contraintes, RLS, RPC, triggers, storage policies, seed runtime),
ne pas se limiter au code frontend/backend.

1. Ajouter ou mettre a jour une migration SQL idempotente dans `supabase/migrations/`.
2. Appliquer la migration sur la BDD cible configuree dans `.env.local` avec `scripts/apply-sql-file.mjs`
   lorsque la demande utilisateur implique de livrer la modification BDD.
3. Recharger le cache PostgREST dans la migration quand necessaire avec `NOTIFY pgrst, 'reload schema';`.
4. Verifier la BDD distante apres application avec un script de verification adapte ou une requete
   `information_schema`.
5. Mentionner dans le compte rendu les migrations appliquees et la verification effectuee.

Si l'action touche une base distante partagee ou production, demander/obtenir l'accord explicite
avant l'application effective.
