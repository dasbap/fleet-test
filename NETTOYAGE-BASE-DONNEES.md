# 🧹 Nettoyage sain de la base E-Samba

Ce document décrit une stratégie **pratique et sécurisée** pour nettoyer la base de données E-Samba (données orphelines, doublons, entrées obsolètes), en s’appuyant sur les scripts SQL déjà présents dans `supabase/`.

Objectifs :

- Garder la base **cohérente** avec le schéma métier.
- Préserver les données utiles en production.
- Éviter tout effet de bord sur les RLS et les RPC.

---

## 1. Outils SQL disponibles

Les scripts suivants sont déjà présents dans le dossier `supabase/` :

- `verify-database-backend-consistency.sql`
  - Vérifie cohérence **schéma ↔ backend** (tables, colonnes, RPC, enums, FK, index, RLS).
- `cleanup-database-consistency.sql`
  - Liste les **orphelins, doublons, entrées obsolètes**.
  - Fournit une fonction `nettoyer_base_donnees(p_dry_run boolean)` pour simuler puis appliquer le nettoyage.
- `verify-esamba-simple.sql`, `verify-esamba-data-complete.sql`
  - Vérifient la présence et la cohérence des données de base ESAMBA.
- `verify-demo-organization.sql`
  - Vérifie l’orga de démonstration créée par `create-demo-organization-complete.sql`.

---

## 2. Ordre recommandé (environnement de test)

Toujours commencer par un **environnement de test** ou un **clone** de la base de production.

1. **Appliquer toutes les migrations connues**
   - Suivre `GUIDE-APPLICATION-MIGRATIONS.md`.
   - Vérifier l’état avec :
     - `supabase/VERIFY-MIGRATION-GUIDE.md`
     - `supabase/verify-migration-status.sql`

2. **Vérifier la cohérence globale schéma/back-end**
   - Ouvrir `supabase/verify-database-backend-consistency.sql`.
   - Copier-coller tout le contenu dans Supabase SQL Editor.
   - Exécuter le script.
   - Corriger d’éventuels problèmes bloquants (tables manquantes, RPC manquantes) avant de nettoyer.

3. **Analyser l’état des données (RAPPORT)**
   - Ouvrir `supabase/cleanup-database-consistency.sql`.
   - Exécuter **uniquement** la Section 1 (RAPPORT) :
     - Orphelins (`ORPHELINS`).
     - Doublons (`DOUBLONS`).
     - Entrées obsolètes (`INUTILES`).
     - Incohérences (`INCOHERENCES`).
   - Exporter / sauvegarder les résultats pour revue.

4. **Pré-contrôle métier**
   - Discuter (Produit / Tech) des catégories qui peuvent être supprimées sans risque :
     - Invitations expirées depuis longtemps.
     - Jetons QR expirés.
     - Données de test évidentes (emails `@esamba.test`, flottes DEMO, etc.).
   - Laisser de côté dans un premier temps :
     - Données liées à des litiges / audits.
     - Historique métier utile (journal scans, incidents, blocages).

5. **Simulation de nettoyage (`dry_run`)**
   - Dans Supabase SQL Editor :
   ```sql
   SELECT public.nettoyer_base_donnees(true);
   ```
   - Interpréter le JSON retourné (compteurs de lignes qui seraient supprimées).
   - Vérifier que les nombres sont cohérents avec le RAPPORT de la Section 1.

6. **Tests applicatifs**
   - Sur l’environnement de test **après dry_run uniquement** :
     - **NE PAS** exécuter encore le nettoyage réel.
     - Vérifier que les vues clés fonctionnent encore :
       - Connexion / tableau de bord.
       - Pages équipes, invitations, véhicules, maintenance.
       - Nouveaux écrans Tarifs / Abonnements / QR si déjà intégrés.

7. **Nettoyage réel**
   - Si tout est validé fonctionnellement :
   ```sql
   SELECT public.nettoyer_base_donnees(false);
   ```
   - Conserver le résultat JSON dans un journal de changement (changelog interne).

---

## 3. Stratégie pour la production

En production, appliquer exactement la même séquence, avec quelques précautions supplémentaires :

1. **Sauvegarde avant nettoyage**
   - Prendre un **snapshot complet** (backup) de la base.
   - Noter la date/heure et l’ID du backup.

2. **Appliquer les migrations et vérifier la cohérence**
   - Rejouer :
     - `verify-database-backend-consistency.sql`
     - `cleanup-database-consistency.sql` (Section RAPPORT uniquement)
   - S’assurer qu’aucune table ou colonne critique ne manque.

3. **Valider les catégories de données supprimables**
   - Restreindre `nettoyer_base_donnees` (si nécessaire) :
     - Laisser la fonction intacte mais limiter son exécution à des périodes de faible trafic.
     - Ne pas supprimer d’historique trop récent (ex. conserver `journal_scans_qr` des 6–12 derniers mois).

4. **Nettoyage contrôlé**
   - Exécuter `nettoyer_base_donnees(true)` une première fois en prod pour valider les compteurs.
   - Planifier `nettoyer_base_donnees(false)` pendant une fenêtre de maintenance courte.

5. **Post-vérification**
   - Relancer les scripts de vérification :
     - `verify-database-backend-consistency.sql`
     - `verify-esamba-simple.sql`
     - `verify-demo-organization.sql` (si vous utilisez les données DEMO).
   - Tester les parcours critiques (connexion, affichage flotte, création clôture, maintenance, etc.).

---

## 4. Points d’attention spécifiques Tarifs / QR

Avec l’introduction de `abonnements`, `droits_vehicules`, `jetons_qr`, `journal_scans_qr` et `blocages_discipline`, quelques règles supplémentaires sont recommandées :

- **Ne jamais** supprimer :
  - Des `abonnements` encore actifs.
  - Des `droits_vehicules` actifs (licences en cours).
  - Des `blocages_discipline` `active` (sinon perte de traçabilité disciplinaire).

- Suppressions possibles (après validation métier) :
  - `jetons_qr` **expirés depuis longtemps** (ex. > 6 mois).
  - Lignes de `journal_scans_qr` très anciennes (selon politique de rétention, ex. > 12–24 mois).
  - Données de test créées explicitement (flottes DEMO, utilisateurs `@esamba.test`).

Ces suppressions peuvent être intégrées progressivement dans la fonction `nettoyer_base_donnees` existante, en conservant le même pattern : d’abord compter (`dry_run`), puis supprimer.

---

## 5. Résumé opérationnel

- **Toujours** :
  - Appliquer les migrations avant de nettoyer.
  - Lancer les scripts de **vérification** avant et après nettoyage.
  - Utiliser `nettoyer_base_donnees(true)` avant `false`.
  - Travailler d’abord sur un environnement de test ou un clone.

- **Ne jamais** :
  - Lancer un nettoyage massif sans backup.
  - Supprimer à l’aveugle des données liées à des abonnements/QR/licences encore actives.
  - Modifier les RLS directement sans repasser par les migrations existantes.

En suivant ce guide, le nettoyage reste **sain**, traçable, et aligné avec le modèle métier E-Samba et les scripts Supabase déjà en place.

