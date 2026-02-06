# 🩺 Vérification RLS - Diagnostic rapide

## 🕵️ Tables à vérifier

1. **ORGS (Organisations)**
   - Vérifier : Les opérations INSERT échouent-elles avec l’erreur RLS ?

2. **FLEET_MEMBERSHIPS (Membres de flotte)**
   - Vérifier : Les opérations INSERT échouent-elles avec l’erreur RLS ?

3. **FLEETS (Flottes)**
   - Vérifier la présence des 4 politiques (SELECT/INSERT/UPDATE/DELETE)

---

## 📝 Étapes de vérification

1. **Ouvrir Supabase SQL Editor**
2. Exécuter cette requête :
   ```sql
   SELECT 
     schemaname,
     tablename,
     rowsecurity as rls_actif
   FROM pg_tables
   WHERE tablename IN ('orgs', 'fleets', 'fleet_memberships')
     AND schemaname = 'public';
   ```
3. Lister les politiques :
   ```sql
   SELECT 
     tablename,
     policyname,
     cmd,
     roles
   FROM pg_policies
   WHERE tablename IN ('orgs', 'fleets', 'fleet_memberships')
   ORDER BY tablename, cmd;
   ```

---

## ✅ Que vérifier ?

- Toutes les tables ont-elles bien RLS activé (`rls_actif = true`) ?
- Les politiques suivantes existent-elles pour chaque table ?
  - `FOR SELECT`: lecture pour authenticated
  - `FOR INSERT`: création pour authenticated
  - `FOR UPDATE`: modification pour authenticated
  - `FOR DELETE`: suppression pour authenticated
- Absence de politiques `WITH CHECK = false` (aucune restriction dangereuse)

---

## 🔧 Si un problème est détecté

- Appliquer le script : **`supabase/fix-all-rls-policies.sql`**
- Relancer les vérifications

---

## 📦 Outils et scripts

- Script principal : `fix-all-rls-policies.sql`
- Scripts ciblés : 
  - `fix-orgs-rls-policies.sql`
  - `fix-fleet-memberships-rls-policies.sql`

---

## 🚦 Conseils production

- En production, restreindre INSERT/UPDATE/DELETE selon les rôles effectifs (organisateur, membre, etc).
- Adaptez et testez vos politiques pour chaque cas d’usage métier.

---
