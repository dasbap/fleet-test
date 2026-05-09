-- =====================================================
-- RECHERCHE DE VALEUR DANS TOUTES LES TABLES
-- Smart Fleet Africa - E-Samba
-- =====================================================
-- Ce script recherche une valeur spécifique dans toutes
-- les colonnes de type text/varchar de la base de données
-- =====================================================
-- Usage : Modifiez la variable search_value ci-dessous
-- =====================================================

DO $$
DECLARE
  r record;
  q text;
  hit int;
  search_value text := 'Organisation ESAMBA'; -- ⬅️ MODIFIEZ ICI
  total_found int := 0;
  total_rows int := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RECHERCHE DE : "%"', search_value;
  RAISE NOTICE '========================================';
  
  FOR r IN
    SELECT 
      table_schema, 
      table_name, 
      column_name,
      data_type
    FROM information_schema.columns
    WHERE data_type IN ('text', 'character varying')
      AND table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      AND table_schema = 'public'
    ORDER BY table_name, column_name
  LOOP
    BEGIN
      -- Construire la requête dynamique
      q := format('SELECT COUNT(*) FROM %I.%I WHERE %I = %L',
                  r.table_schema, r.table_name, r.column_name, search_value);
      
      -- Exécuter la requête
      EXECUTE q INTO hit;
      
      IF hit > 0 THEN
        total_found := total_found + 1;
        total_rows := total_rows + hit;
        
        -- Afficher le résultat
        RAISE NOTICE '✅ Trouvé % ligne(s) dans %.% (colonne %)', 
                     hit, r.table_schema, r.table_name, r.column_name;
        
        -- Optionnel : Afficher quelques exemples de lignes
        BEGIN
          q := format('SELECT * FROM %I.%I WHERE %I = %L LIMIT 3',
                      r.table_schema, r.table_name, r.column_name, search_value);
          -- Note: Pour afficher les lignes complètes, il faudrait utiliser un cursor
          -- Ici on se contente de compter
        EXCEPTION
          WHEN OTHERS THEN
            NULL;
        END;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- Ignorer les erreurs (colonnes qui ne peuvent pas être comparées, permissions, etc.)
        -- RAISE NOTICE '⚠️  Erreur sur %.% : %', r.table_name, r.column_name, SQLERRM;
        NULL;
    END;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉSUMÉ :';
  RAISE NOTICE '  - Colonnes trouvées : %', total_found;
  RAISE NOTICE '  - Total de lignes : %', total_rows;
  RAISE NOTICE '========================================';
  
  IF total_found = 0 THEN
    RAISE NOTICE '⚠️  Aucune occurrence trouvée de "%"', search_value;
    RAISE NOTICE '   Vérifiez que la valeur est correcte et existe dans la base';
  END IF;
END $$;

-- =====================================================
-- VERSION ALTERNATIVE : Recherche avec LIKE (partielle)
-- =====================================================
-- Décommentez cette section pour rechercher des correspondances partielles
-- =====================================================

/*
DO $$
DECLARE
  r record;
  q text;
  hit int;
  search_pattern text := '%ESAMBA%'; -- ⬅️ MODIFIEZ ICI (utilise % comme wildcard)
  total_found int := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RECHERCHE PARTIELLE DE : "%"', search_pattern;
  RAISE NOTICE '========================================';
  
  FOR r IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE data_type IN ('text', 'character varying')
      AND table_schema = 'public'
    ORDER BY table_name, column_name
  LOOP
    BEGIN
      q := format('SELECT COUNT(*) FROM %I.%I WHERE %I LIKE %L',
                  r.table_schema, r.table_name, r.column_name, search_pattern);
      EXECUTE q INTO hit;
      
      IF hit > 0 THEN
        total_found := total_found + 1;
        RAISE NOTICE '✅ Trouvé % ligne(s) dans %.% (colonne %)', 
                     hit, r.table_schema, r.table_name, r.column_name;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de colonnes trouvées : %', total_found;
  RAISE NOTICE '========================================';
END $$;
*/
