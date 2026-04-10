-- Liste des migrations appliquées sur ce projet Supabase
-- À exécuter dans l’éditeur SQL du tableau de bord pour comparer avec supabase/migrations/
-- Si la table n'existe pas (migrations appliquées uniquement à la main), la requête échouera :
-- dans ce cas, vérifier manuellement dans Database → Migrations ou en testant les tables/fonctions.

SELECT version AS migration_appliquee
FROM supabase_migrations.schema_migrations
ORDER BY version;
