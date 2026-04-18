-- =====================================================
-- Diagnostic activation terrain (lecture seule)
-- Smart Fleet Africa / e-Samba
-- =====================================================
-- Objectif : relier membres → affectations véhicule → créneaux,
-- identifier les conducteurs sans affectation active ou sans aucun créneau.
--
-- Exécution : éditeur SQL Supabase (rôle postgres / service dashboard).
-- Ne modifie aucune donnée.
--
-- Données personnelles : limiter la diffusion des exports (téléphones, e-mails).
-- =====================================================

-- ---------------------------------------------------------------------------
-- CHECKLIST TERRAIN (ordre logique à montrer aux équipes)
-- ---------------------------------------------------------------------------
-- 1. Connexion : téléphone ou e-mail selon la configuration Auth du projet.
-- 2. Contexte flotte : l’utilisateur doit avoir une adhésion active (flotte_adhesions)
--    et une flotte sélectionnée dans l’app (stockage local côté client).
-- 3. Manager / organisateur : créer ou vérifier un véhicule dans la flotte,
--    puis une affectation conducteur ↔ véhicule (affectations_vehicules, is_active).
-- 4. Conducteur : ouvrir un créneau (première ligne dans creneaux_conducteurs).
--    Sans étape 3, l’étape 4 est souvent impossible ou invisible.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- COMPTES STAGING RECOMMANDÉS (hors production — à créer sur un projet dédié)
-- ---------------------------------------------------------------------------
-- Créer 3 utilisateurs dans Authentication → Users (staging uniquement) :
--
-- A) demo.organizer@staging.local — rôle organizer ou manager sur une flotte test,
--    mot de passe fort connu de l’équipe (ou OTP de test).
-- B) demo.driver.assigned@staging.local — conducteur avec affectation véhicule active,
--    pour valider ouverture / clôture de créneau.
-- C) demo.driver.unassigned@staging.local — conducteur inscrit mais SANS affectation,
--    pour reproduire « zéro créneau » côté terrain (blocage attendu).
--
-- Ne jamais réutiliser ces schémas sur la prod ni partager les mots de passe hors équipe.
-- ---------------------------------------------------------------------------

-- Filtre optionnel : dans chaque bloc `WITH params` ci-dessous, remplacer NULL par le même
-- uuid d’organisation (les trois requêtes actives utilisent le même filtre).

-- Filtre optionnel : remplacer NULL par un uuid d’organisation pour limiter les résultats.
WITH params AS (
  SELECT NULL::uuid AS filter_org_id
),

orgs_scope AS (
  SELECT o.id AS org_id, o.name AS org_name
  FROM public.organisations o
  CROSS JOIN params p
  WHERE p.filter_org_id IS NULL OR o.id = p.filter_org_id
)

-- =====================================================
-- 1) Résumé par organisation
-- =====================================================
SELECT
  'resume_par_org' AS rapport,
  os.org_id,
  os.org_name,
  (SELECT count(DISTINCT fa.user_id)::bigint
   FROM public.flotte_adhesions fa
   INNER JOIN public.flottes f ON f.id = fa.fleet_id
   WHERE f.org_id = os.org_id AND fa.is_active = true
  ) AS membres_actifs_distincts,
  (SELECT count(DISTINCT fa.user_id)::bigint
   FROM public.flotte_adhesions fa
   INNER JOIN public.flottes f ON f.id = fa.fleet_id
   WHERE f.org_id = os.org_id AND fa.is_active = true AND fa.role = 'driver'::public.role_type
  ) AS conducteurs_inscrits,
  (SELECT count(DISTINCT av.driver_user_id)::bigint
   FROM public.affectations_vehicules av
   INNER JOIN public.flottes f ON f.id = av.fleet_id
   WHERE f.org_id = os.org_id AND av.is_active = true
     AND EXISTS (
       SELECT 1 FROM public.flotte_adhesions fa2
       WHERE fa2.user_id = av.driver_user_id AND fa2.fleet_id = av.fleet_id
         AND fa2.is_active = true AND fa2.role = 'driver'::public.role_type
     )
  ) AS conducteurs_avec_affectation_active,
  (SELECT count(DISTINCT a.driver_user_id)::bigint
   FROM public.creneaux_conducteurs c
   INNER JOIN public.affectations_vehicules a ON a.id = c.assignment_id
   INNER JOIN public.flottes f ON f.id = a.fleet_id
   WHERE f.org_id = os.org_id
  ) AS conducteurs_ayant_au_moins_un_creneau
FROM orgs_scope os
ORDER BY os.org_name;

-- =====================================================
-- 2) Détail conducteurs : adhésion, affectation, créneaux
-- =====================================================
WITH params AS (
  SELECT NULL::uuid AS filter_org_id
)
SELECT
  'detail_conducteurs' AS rapport,
  f.org_id,
  o.name AS org_name,
  f.id AS fleet_id,
  f.name AS fleet_name,
  fa.user_id,
  p.full_name,
  p.phone AS profil_phone,
  fa.role::text AS role,
  fa.created_at AS adhesion_created_at,
  av.id AS assignment_id,
  av.vehicle_id,
  av.is_active AS assignment_is_active,
  (SELECT count(*)::bigint
   FROM public.creneaux_conducteurs cc
   WHERE cc.assignment_id = av.id
  ) AS nombre_creneaux_pour_cette_affectation
FROM public.flotte_adhesions fa
INNER JOIN public.flottes f ON f.id = fa.fleet_id
INNER JOIN public.organisations o ON o.id = f.org_id
LEFT JOIN public.profils p ON p.user_id = fa.user_id
LEFT JOIN public.affectations_vehicules av
  ON av.driver_user_id = fa.user_id
 AND av.fleet_id = fa.fleet_id
 AND av.is_active = true
CROSS JOIN params pr
WHERE fa.is_active = true
  AND fa.role = 'driver'::public.role_type
  AND (pr.filter_org_id IS NULL OR f.org_id = pr.filter_org_id)
ORDER BY o.name, f.name, p.full_name NULLS LAST, fa.user_id;

-- =====================================================
-- 3) Conducteurs sans affectation active (bloqueurs activation)
-- =====================================================
WITH params AS (
  SELECT NULL::uuid AS filter_org_id
)
SELECT
  'conducteurs_sans_affectation_active' AS rapport,
  f.org_id,
  o.name AS org_name,
  f.id AS fleet_id,
  fa.user_id,
  p.full_name,
  p.phone AS profil_phone
FROM public.flotte_adhesions fa
INNER JOIN public.flottes f ON f.id = fa.fleet_id
INNER JOIN public.organisations o ON o.id = f.org_id
LEFT JOIN public.profils p ON p.user_id = fa.user_id
CROSS JOIN params pr
WHERE fa.is_active = true
  AND fa.role = 'driver'::public.role_type
  AND (pr.filter_org_id IS NULL OR f.org_id = pr.filter_org_id)
  AND NOT EXISTS (
    SELECT 1
    FROM public.affectations_vehicules av
    WHERE av.driver_user_id = fa.user_id
      AND av.fleet_id = fa.fleet_id
      AND av.is_active = true
  )
ORDER BY o.name, f.name, p.full_name NULLS LAST;

-- =====================================================
-- 4) Optionnel : e-mail / téléphone Auth (nécessite accès auth.users)
-- =====================================================
-- Décommenter si besoin de corréler user_id avec le login Auth.
/*
WITH params AS (
  SELECT NULL::uuid AS filter_org_id
)
SELECT
  'auth_contacts' AS rapport,
  f.org_id,
  fa.user_id,
  au.email,
  au.phone AS auth_phone,
  p.full_name
FROM public.flotte_adhesions fa
INNER JOIN public.flottes f ON f.id = fa.fleet_id
LEFT JOIN public.profils p ON p.user_id = fa.user_id
INNER JOIN auth.users au ON au.id = fa.user_id
CROSS JOIN params pr
WHERE fa.is_active = true
  AND (pr.filter_org_id IS NULL OR f.org_id = pr.filter_org_id)
ORDER BY f.org_id, p.full_name NULLS LAST;
*/
