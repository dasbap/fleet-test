# ✅ Vérification Simple des Données ESAMBA

## 🚀 Instructions rapides

### Option 1 : Script simplifié (recommandé)

1. **Ouvrez Supabase SQL Editor**
2. **Copiez-collez le contenu de `supabase/verify-esamba-simple.sql`**
3. **Exécutez le script** (Run ou F5)
4. **Vérifiez les résultats** :
   - Tous les statuts doivent être "CRÉÉ(E)"
   - La Flotte ESAMBA doit être "CRÉÉE"

### Option 2 : Vérification rapide de la Flotte ESAMBA

Exécutez cette requête simple :

```sql
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN 'FLOTTE ESAMBA CRÉÉE'
    ELSE 'FLOTTE ESAMBA ABSENTE'
  END as statut,
  COUNT(*) as nombre
FROM fleets
WHERE name = 'Flotte ESAMBA';
```

### Option 3 : Test final complet

```sql
SELECT 
  (SELECT COUNT(*) FROM orgs WHERE name = 'Organisation ESAMBA') as org_ok,
  (SELECT COUNT(*) FROM fleets WHERE name = 'Flotte ESAMBA') as flotte_ok,
  (SELECT COUNT(*) FROM vehicles v
   JOIN fleets f ON f.id = v.fleet_id
   WHERE f.name = 'Flotte ESAMBA' 
     AND v.registration = 'ESAMBA-001') as vehicule_ok,
  (SELECT COUNT(*) FROM fleet_invitations fi
   JOIN fleets f ON f.id = fi.fleet_id
   WHERE f.name = 'Flotte ESAMBA' 
     AND fi.code = 'ESAMBA-2024') as invitation_ok,
  CASE 
    WHEN (SELECT COUNT(*) FROM orgs WHERE name = 'Organisation ESAMBA') > 0
     AND (SELECT COUNT(*) FROM fleets WHERE name = 'Flotte ESAMBA') > 0
     AND (SELECT COUNT(*) FROM vehicles v
          JOIN fleets f ON f.id = v.fleet_id
          WHERE f.name = 'Flotte ESAMBA' 
            AND v.registration = 'ESAMBA-001') > 0
     AND (SELECT COUNT(*) FROM fleet_invitations fi
          JOIN fleets f ON f.id = fi.fleet_id
          WHERE f.name = 'Flotte ESAMBA' 
            AND fi.code = 'ESAMBA-2024') > 0
    THEN 'TOUT EST OK'
    ELSE 'PROBLÈME DÉTECTÉ'
  END as resultat;
```

## ✅ Résultats attendus

Après exécution, vous devriez voir :
- Organisation ESAMBA : statut = "CRÉÉE", nombre = 1
- **Flotte ESAMBA : statut = "CRÉÉE", nombre = 1** ⭐
- Véhicule ESAMBA-001 : statut = "CRÉÉ", nombre = 1
- Invitation ESAMBA-2024 : statut = "CRÉÉE", nombre = 1
- Résumé global : resultat = "TOUT EST OK"

## 🔍 Si la Flotte ESAMBA est absente

Exécutez le script de création :
- Ouvrez `supabase/test-create-esamba-complete.sql`
- Copiez-collez et exécutez dans Supabase SQL Editor
