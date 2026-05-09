-- =====================================================
-- FONCTIONS RPC MANQUANTES
-- Smart Fleet Africa
-- =====================================================
-- Exécutez ce fichier dans Supabase SQL Editor
-- =====================================================

-- =====================================================
-- FONCTION: Accepter une invitation
-- =====================================================

-- Supprimer la fonction si elle existe (pour éviter les conflits de type de retour)
drop function if exists accepter_invitation(text);
drop function if exists accept_invitation(text);

create or replace function accepter_invitation(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation flotte_invitations%ROWTYPE;
  v_user_id uuid := auth.uid();
  v_membership_id uuid;
  v_result jsonb;
begin
  -- Vérifier que l'utilisateur est authentifié
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  -- Récupérer l'invitation
  select * into v_invitation
  from flotte_invitations
  where code = p_code
    and (expires_at is null or expires_at > now())
    and (max_uses is null or current_uses < max_uses)
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invitation_not_found_or_expired');
  end if;

  -- Vérifier si l'utilisateur a déjà un membership pour cette flotte
  select id into v_membership_id
  from flotte_adhesions
  where fleet_id = v_invitation.fleet_id
    and user_id = v_user_id
    and is_active = true;

  if v_membership_id is not null then
    -- L'utilisateur est déjà membre, retourner succès
    return jsonb_build_object(
      'ok', true,
      'error', null,
      'fleet_id', v_invitation.fleet_id,
      'membership_id', v_membership_id,
      'message', 'already_member'
    );
  end if;

  -- Vérifier si l'invitation a atteint sa limite d'utilisation
  if v_invitation.max_uses is not null and v_invitation.current_uses >= v_invitation.max_uses then
    return jsonb_build_object('ok', false, 'error', 'invitation_limit_reached');
  end if;

  -- Créer le membership
  insert into flotte_adhesions (fleet_id, user_id, role, is_active)
  values (v_invitation.fleet_id, v_user_id, 'driver', true)
  returning id into v_membership_id;

  -- Incrémenter le compteur d'utilisation
  update flotte_invitations
  set current_uses = current_uses + 1
  where id = v_invitation.id;

  return jsonb_build_object(
    'ok', true,
    'error', null,
    'fleet_id', v_invitation.fleet_id,
    'membership_id', v_membership_id
  );
end;
$$;

-- =====================================================
-- FONCTION: Vérifier la santé du système
-- =====================================================

-- Supprimer la fonction si elle existe (pour éviter les conflits de type de retour)
drop function if exists verifier_sante_systeme(uuid);
drop function if exists check_system_health(uuid);

create or replace function verifier_sante_systeme(p_flotte_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_orphan_count int;
  v_orphan_users jsonb;
begin
  -- Vérifier que l'utilisateur appelant a les permissions (manager ou organizer)
  if not exists (
    select 1
    from flotte_adhesions fa
    where fa.fleet_id = p_flotte_id
      and fa.user_id = auth.uid()
      and fa.role in ('manager', 'organizer')
      and fa.is_active = true
  ) then
    return jsonb_build_object('ok', false, 'error', 'permission_denied');
  end if;

  -- Compter les utilisateurs qui ont un profil mais pas de membership actif pour cette flotte
  -- (utilisateurs qui devraient probablement être dans la flotte)
  select count(*) into v_orphan_count
  from profils p
  where not exists (
    select 1
    from flotte_adhesions fa
    where fa.user_id = p.user_id
      and fa.fleet_id = p_flotte_id
      and fa.is_active = true
  );

  -- Récupérer la liste des utilisateurs orphelins (limité à 50)
  select coalesce(
    jsonb_agg(jsonb_build_object(
      'user_id', p.user_id,
      'email', u.email,
      'full_name', p.full_name,
      'created_at', u.created_at
    )),
    '[]'::jsonb
  ) into v_orphan_users
  from profils p
  join auth.users u on u.id = p.user_id
  where not exists (
    select 1
    from flotte_adhesions fa
    where fa.user_id = p.user_id
      and fa.fleet_id = p_flotte_id
      and fa.is_active = true
  )
  limit 50;

  return jsonb_build_object(
    'ok', true,
    'orphan_count', v_orphan_count,
    'orphan_users', v_orphan_users
  );
end;
$$;

-- =====================================================
-- FONCTION: Réparer un membership orphelin
-- =====================================================

-- Supprimer la fonction si elle existe (pour éviter les conflits de type de retour)
drop function if exists reparer_adhesion_orpheline(uuid, uuid, role_type);
drop function if exists repair_orphan_membership(uuid, uuid, role_type);

create or replace function reparer_adhesion_orpheline(
  p_user_id uuid,
  p_flotte_id uuid,
  p_role role_type default 'driver'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership_id uuid;
  v_result jsonb;
begin
  -- Vérifier que l'utilisateur appelant a les permissions (manager ou organizer)
  if not exists (
    select 1
    from flotte_adhesions fa
    where fa.fleet_id = p_flotte_id
      and fa.user_id = auth.uid()
      and fa.role in ('manager', 'organizer')
      and fa.is_active = true
  ) then
    return jsonb_build_object('ok', false, 'error', 'permission_denied');
  end if;

  -- Vérifier que l'utilisateur cible existe
  if not exists (select 1 from auth.users where id = p_user_id) then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;

  -- Vérifier que la flotte existe
  if not exists (select 1 from flottes where id = p_flotte_id) then
    return jsonb_build_object('ok', false, 'error', 'fleet_not_found');
  end if;

  -- Vérifier si un membership existe déjà
  select id into v_membership_id
  from flotte_adhesions
  where fleet_id = p_flotte_id
    and user_id = p_user_id
    and is_active = true;

  if v_membership_id is not null then
    return jsonb_build_object(
      'ok', true,
      'error', null,
      'membership_id', v_membership_id,
      'message', 'already_exists'
    );
  end if;

  -- Créer le membership
  insert into flotte_adhesions (fleet_id, user_id, role, is_active)
  values (p_flotte_id, p_user_id, p_role, true)
  returning id into v_membership_id;

  return jsonb_build_object(
    'ok', true,
    'error', null,
    'membership_id', v_membership_id
  );
end;
$$;

-- =====================================================
-- COMMENTAIRES
-- =====================================================

comment on function accepter_invitation(text) is 'Accepte une invitation à rejoindre une flotte';
comment on function verifier_sante_systeme(uuid) is 'Vérifie la santé du système pour une flotte (utilisateurs orphelins)';
comment on function reparer_adhesion_orpheline(uuid, uuid, role_type) is 'Répare un membership orphelin pour un utilisateur';
