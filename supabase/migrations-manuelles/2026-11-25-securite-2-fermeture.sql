-- ============================================================
-- Mayinvest PréSelect · Sécurité, étape 2/2 : fermeture des accès directs
-- À appliquer UNIQUEMENT quand le site publié utilise les jetons (étape 1 + code du 25/11).
-- ============================================================

-- ---------- 1. Supprimer toutes les règles ouvertes ----------
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('leads','messages','documents','commercial_candidates','commercial_chats',
                        'quiz_attempts','simulation_attempts','practical_attempts','haki_events',
                        'report_logs','banques','bancarisation_suivi','packs_vendus')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ---------- 2. Nouvelles règles (selon la session envoyée par le site) ----------
-- Dossiers
create policy leads_select on public.leads for select to anon, authenticated
  using ( public.mi_can_see_lead(id) );
create policy leads_insert_public on public.leads for insert to anon, authenticated
  with check ( statut = 'Nouveau' and agent_commercial_id is null );
create policy leads_update_admin on public.leads for update to anon, authenticated
  using ( (select public.mi_admin_id()) is not null and public.mi_can_see_lead(id) )
  with check ( (select public.mi_admin_id()) is not null );

-- Messages (écriture uniquement via les fonctions client_send_message / send_lead_message)
create policy messages_select on public.messages for select to anon, authenticated
  using ( public.mi_can_see_lead(lead_id) );

-- Documents
create policy documents_select on public.documents for select to anon, authenticated
  using ( public.mi_can_see_lead(lead_id) );
create policy documents_update on public.documents for update to anon, authenticated
  using ( public.mi_can_see_lead(lead_id) and (lead_id = (select public.mi_client_lead_id()) or (select public.mi_admin_id()) is not null) )
  with check ( public.mi_can_see_lead(lead_id) );

-- Candidats / commerciaux
create policy candidates_select on public.commercial_candidates for select to anon, authenticated
  using ( (select public.mi_admin_id()) is not null or id = (select public.mi_commercial_id()) );
create policy candidates_update on public.commercial_candidates for update to anon, authenticated
  using ( (select public.mi_admin_id()) is not null or id = (select public.mi_commercial_id()) )
  with check ( (select public.mi_admin_id()) is not null or id = (select public.mi_commercial_id()) );

-- Un candidat ne peut pas s'auto-valider ni toucher aux champs sensibles
-- SECURITY INVOKER volontaire : current_user = anon pour une mise à jour directe depuis le site,
-- = propriétaire pour les fonctions serveur (réinitialisation de mot de passe, validation par la direction)
create or replace function public.mi_guard_candidate_update()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if public.mi_admin_id() is not null then
    return new;
  end if;
  if current_user in ('anon', 'authenticated') then
    if new.status in ('valide', 'refuse') and new.status is distinct from old.status then
      raise exception 'Seule la direction peut valider ou refuser une candidature.';
    end if;
    new.password_hash  := old.password_hash;
    new.activated_at   := old.activated_at;
    new.refused_reason := old.refused_reason;
    new.ref_code       := old.ref_code;
    new.email          := old.email;
    new.telephone      := old.telephone;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_candidate_update on public.commercial_candidates;
create trigger trg_guard_candidate_update before update on public.commercial_candidates
  for each row execute function public.mi_guard_candidate_update();

-- Tentatives de formation / simulation
create policy quiz_attempts_rw on public.quiz_attempts for all to anon, authenticated
  using ( (select public.mi_admin_id()) is not null or candidate_id = (select public.mi_commercial_id()) )
  with check ( candidate_id = (select public.mi_commercial_id()) );
create policy simulation_attempts_rw on public.simulation_attempts for all to anon, authenticated
  using ( (select public.mi_admin_id()) is not null or candidate_id = (select public.mi_commercial_id()) )
  with check ( candidate_id = (select public.mi_commercial_id()) );
create policy practical_attempts_rw on public.practical_attempts for all to anon, authenticated
  using ( (select public.mi_admin_id()) is not null or candidate_id = (select public.mi_commercial_id()) )
  with check ( candidate_id = (select public.mi_commercial_id()) );

-- Chat commercial <-> direction
create policy cchats_select on public.commercial_chats for select to anon, authenticated
  using ( (select public.mi_admin_id()) is not null or commercial_id = (select public.mi_commercial_id()) );

-- Statistiques Haki, rapports, banques, suivi : direction uniquement (l'écriture Haki passe par track_haki_event)
create policy haki_events_admin on public.haki_events for select to anon, authenticated
  using ( (select public.mi_admin_id()) is not null );
create policy report_logs_admin on public.report_logs for select to anon, authenticated
  using ( (select public.mi_admin_id()) is not null );
create policy banques_admin on public.banques for all to anon, authenticated
  using ( (select public.mi_admin_id()) is not null ) with check ( (select public.mi_admin_id()) is not null );
create policy bancarisation_admin on public.bancarisation_suivi for all to anon, authenticated
  using ( (select public.mi_admin_id()) is not null ) with check ( (select public.mi_admin_id()) is not null );
create policy packs_admin on public.packs_vendus for all to anon, authenticated
  using ( (select public.mi_admin_id()) is not null ) with check ( (select public.mi_admin_id()) is not null );

-- ---------- 3. Fonctions : contrôle de la session ----------
create or replace function public.mi_require_admin(p_director boolean default false)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare v_id uuid := public.mi_admin_id();
begin
  if v_id is null then raise exception 'Accès refusé : reconnectez-vous.'; end if;
  if p_director and coalesce(public.mi_admin_role(), '') <> 'director' then
    raise exception 'Action réservée aux directeurs.';
  end if;
  return v_id;
end $$;

-- Gestion des admins : directeurs uniquement
create or replace function public.list_admins()
returns table (id uuid, email text, nom text, prenom text, ville text, role text, is_active boolean, created_at timestamptz, last_login_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform public.mi_require_admin(true);
  return query select a.id, a.email, a.nom, a.prenom, a.ville, a.role, a.is_active, a.created_at, a.last_login_at
               from public.admin_users a order by a.created_at desc;
end $$;

create or replace function public.list_admin_users()
returns table (id uuid, email text, role text)
language plpgsql security definer set search_path = public as $$
begin
  perform public.mi_require_admin(false);
  -- Admins + commerciaux validés : tous peuvent recevoir un dossier
  return query
    select a.id, a.email, a.role from public.admin_users a where coalesce(a.is_active, true)
    union all
    select c.id, trim(c.prenom || ' ' || c.nom) || ' · commercial', 'commercial' from public.commercial_candidates c where c.status = 'valide'
    order by 3 desc, 2;
end $$;

create or replace function public.create_admin(p_email text, p_password text, p_nom text, p_prenom text, p_ville text, p_role text default 'operator')
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  perform public.mi_require_admin(true);
  if length(trim(coalesce(p_password, ''))) < 8 then raise exception 'Le mot de passe doit faire au moins 8 caractères.'; end if;
  if exists (select 1 from public.admin_users where lower(email) = lower(trim(p_email))) then raise exception 'Cet email est déjà utilisé.'; end if;
  insert into public.admin_users (email, password_hash, nom, prenom, ville, role, is_active)
  values (lower(trim(p_email)), crypt(p_password, gen_salt('bf')), p_nom, p_prenom, coalesce(p_ville, 'Brazzaville'), coalesce(p_role, 'operator'), true)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'email', p_email, 'ville', p_ville, 'role', p_role);
end $$;

create or replace function public.update_admin_info(p_id uuid, p_nom text, p_prenom text, p_ville text, p_role text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.mi_require_admin(true);
  if p_role <> 'director' and exists (select 1 from public.admin_users where id = p_id and role = 'director')
     and not exists (select 1 from public.admin_users where role = 'director' and is_active and id <> p_id) then
    raise exception 'Impossible de retirer le rôle du dernier directeur actif.';
  end if;
  update public.admin_users set nom = p_nom, prenom = p_prenom, ville = p_ville, role = p_role where id = p_id;
  if not found then raise exception 'Admin introuvable'; end if;
  return jsonb_build_object('id', p_id, 'updated', true);
end $$;

create or replace function public.toggle_admin_active(p_id uuid, p_active boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.mi_require_admin(true);
  if not p_active and exists (select 1 from public.admin_users where id = p_id and role = 'director')
     and not exists (select 1 from public.admin_users where role = 'director' and is_active and id <> p_id) then
    raise exception 'Impossible de désactiver le dernier directeur actif.';
  end if;
  update public.admin_users set is_active = p_active where id = p_id;
  if not found then raise exception 'Admin introuvable'; end if;
  if not p_active then delete from public.app_sessions where kind = 'admin' and subject_id = p_id; end if;
  return jsonb_build_object('id', p_id, 'is_active', p_active);
end $$;

create or replace function public.reset_admin_password(p_id uuid, p_new_password text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  perform public.mi_require_admin(true);
  if length(trim(coalesce(p_new_password, ''))) < 8 then raise exception 'Le mot de passe doit faire au moins 8 caractères.'; end if;
  update public.admin_users set password_hash = crypt(p_new_password, gen_salt('bf')) where id = p_id;
  if not found then raise exception 'Admin introuvable'; end if;
  delete from public.app_sessions where kind = 'admin' and subject_id = p_id;
  return jsonb_build_object('id', p_id, 'reset', true);
end $$;

create or replace function public.delete_admin(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_role text;
begin
  perform public.mi_require_admin(true);
  select role into v_role from public.admin_users where id = p_id;
  if v_role is null then raise exception 'Admin introuvable'; end if;
  if v_role = 'director' and not exists (select 1 from public.admin_users where role = 'director' and is_active and id <> p_id) then
    raise exception 'Impossible de supprimer le dernier directeur actif. Créez un autre directeur avant.';
  end if;
  delete from public.app_sessions where kind = 'admin' and subject_id = p_id;
  delete from public.admin_users where id = p_id;
  return jsonb_build_object('id', p_id, 'deleted', true);
end $$;

-- Attribution des dossiers
create or replace function public.assign_lead_agent(p_lead_id uuid, p_agent_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.mi_require_admin(false);
  update public.leads set agent_commercial_id = p_agent_id, updated_at = now() where id = p_lead_id;
end $$;

-- Lien de parrainage : seulement sur un dossier tout juste créé et pas encore attribué
create or replace function public.assigner_lead_par_ref(p_lead_id uuid, p_ref_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_commercial_id uuid;
begin
  select id into v_commercial_id from public.commercial_candidates
  where upper(ref_code) = upper(trim(p_ref_code)) and status = 'valide';
  if v_commercial_id is null then
    return jsonb_build_object('assigned', false, 'reason', 'Code invalide ou commercial non activé');
  end if;
  update public.leads set agent_commercial_id = v_commercial_id, updated_at = now()
  where id = p_lead_id and agent_commercial_id is null and created_at > now() - interval '2 hours';
  return jsonb_build_object('assigned', found, 'commercial_id', v_commercial_id);
end $$;

-- Espace commercial : uniquement ses propres données (ou la direction)
create or replace function public.mi_require_commercial(p_commercial_id uuid)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if public.mi_admin_id() is not null then return; end if;
  if p_commercial_id is null or p_commercial_id is distinct from public.mi_commercial_id() then
    raise exception 'Accès refusé : reconnecte-toi.';
  end if;
end $$;

create or replace function public.get_commercial_leads(p_commercial_id uuid)
returns setof public.leads language plpgsql security definer set search_path = public as $$
begin
  perform public.mi_require_commercial(p_commercial_id);
  return query select * from public.leads where agent_commercial_id = p_commercial_id order by created_at desc;
end $$;

create or replace function public.get_commercial_stats(p_commercial_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_total int; v_actifs int; v_finances int; v_mois bigint; v_rank int;
begin
  perform public.mi_require_commercial(p_commercial_id);
  select count(*) into v_total from public.leads where agent_commercial_id = p_commercial_id;
  select count(*) into v_actifs from public.leads where agent_commercial_id = p_commercial_id and statut not in ('Perdu', 'Financé', 'Non Éligible');
  select count(*) into v_finances from public.leads where agent_commercial_id = p_commercial_id and statut = 'Financé';
  select count(*) * 50000 into v_mois from public.leads where agent_commercial_id = p_commercial_id and statut = 'Financé' and updated_at >= date_trunc('month', now());
  select rank into v_rank from (
    select agent_commercial_id, rank() over (order by count(*) filter (where statut = 'Financé') desc) as rank
    from public.leads where agent_commercial_id is not null and updated_at >= date_trunc('month', now())
    group by agent_commercial_id
  ) r where agent_commercial_id = p_commercial_id;
  return jsonb_build_object('total_leads', v_total, 'leads_actifs', v_actifs, 'dossiers_finances', v_finances,
    'gains_total_xaf', v_finances * 50000, 'gains_mois_xaf', coalesce(v_mois, 0), 'classement', coalesce(v_rank, 0));
end $$;

create or replace function public.commercial_update_lead_status(p_commercial_id uuid, p_lead_id uuid, p_statut text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.mi_require_commercial(p_commercial_id);
  update public.leads set statut = p_statut, updated_at = now() where id = p_lead_id and agent_commercial_id = p_commercial_id;
  if not found then raise exception 'Lead introuvable ou non attribué.'; end if;
  return jsonb_build_object('updated', true, 'statut', p_statut);
end $$;

create or replace function public.commercial_create_lead(p_commercial_id uuid, p_type text, p_activite text, p_identite jsonb, p_besoin jsonb, p_montant_demande bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_code text;
begin
  perform public.mi_require_commercial(p_commercial_id);
  v_code := 'MYI-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 7));
  insert into public.leads (type, activite, identite, besoin, montant_demande, statut, agent_commercial_id, access_code, score)
  values (p_type, p_activite, p_identite, p_besoin, p_montant_demande, 'Nouveau', p_commercial_id, v_code, 50)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'access_code', v_code);
end $$;

create or replace function public.send_commercial_message(p_commercial_id uuid, p_sender_type text, p_body text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if length(trim(coalesce(p_body, ''))) = 0 then raise exception 'Message vide.'; end if;
  if p_sender_type = 'commercial' then
    if p_commercial_id is distinct from public.mi_commercial_id() then raise exception 'Accès refusé : reconnecte-toi.'; end if;
  elsif p_sender_type = 'director' then
    perform public.mi_require_admin(false);
  else
    raise exception 'Type d''expéditeur invalide.';
  end if;
  insert into public.commercial_chats (commercial_id, sender_type, body) values (p_commercial_id, p_sender_type, trim(p_body)) returning id into v_id;
  return jsonb_build_object('id', v_id);
end $$;

create or replace function public.mark_commercial_messages_read(p_commercial_id uuid, p_reader_type text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_reader_type = 'commercial' then
    if p_commercial_id is distinct from public.mi_commercial_id() then return; end if;
  else
    if public.mi_admin_id() is null then return; end if;
  end if;
  update public.commercial_chats set read_at = now()
  where commercial_id = p_commercial_id and sender_type <> p_reader_type and read_at is null;
end $$;

create or replace function public.get_all_commercials_with_stats()
returns table (id uuid, nom text, prenom text, email text, telephone text, ville text, ref_code text, status text,
               activated_at timestamptz, created_at timestamptz, total_leads bigint, leads_actifs bigint,
               dossiers_finances bigint, gains_total_xaf bigint, gains_mois_xaf bigint)
language plpgsql security definer set search_path = public as $$
begin
  perform public.mi_require_admin(false);
  return query
  select c.id, c.nom, c.prenom, c.email, c.telephone, c.ville, c.ref_code, c.status, c.activated_at, c.created_at,
         coalesce(st.total_leads, 0), coalesce(st.leads_actifs, 0), coalesce(st.dossiers_finances, 0),
         (coalesce(st.dossiers_finances, 0) * 50000)::bigint, (coalesce(st.finances_mois, 0) * 50000)::bigint
  from public.commercial_candidates c
  left join lateral (
    select count(*) as total_leads,
           count(*) filter (where l.statut not in ('Perdu', 'Financé', 'Non Éligible')) as leads_actifs,
           count(*) filter (where l.statut = 'Financé') as dossiers_finances,
           count(*) filter (where l.statut = 'Financé' and l.updated_at >= date_trunc('month', now())) as finances_mois
    from public.leads l where l.agent_commercial_id = c.id
  ) st on true
  where c.status = 'valide'
  order by c.activated_at desc nulls last;
end $$;

create or replace function public.deactivate_commercial(p_commercial_id uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.mi_require_admin(true);
  update public.commercial_candidates set status = 'refuse', refused_reason = p_reason, updated_at = now() where id = p_commercial_id;
  delete from public.app_sessions where kind = 'commercial' and subject_id = p_commercial_id;
  return jsonb_build_object('deactivated', true);
end $$;

-- Documents d'un dossier (crée la liste de pièces au premier accès)
create or replace function public.get_lead_documents(p_id uuid)
returns setof public.documents language plpgsql security definer set search_path = public as $$
declare v_lead public.leads%rowtype; v_count int;
begin
  if not public.mi_can_see_lead(p_id) then raise exception 'Accès refusé.'; end if;
  select * into v_lead from public.leads where id = p_id;
  if not found then return; end if;
  select count(*) into v_count from public.documents where lead_id = p_id;
  if v_count = 0 then
    if v_lead.type in ('physique', 'Personne physique') then
      insert into public.documents (lead_id, doc_type, doc_label) values
        (p_id, 'cni', 'Carte Nationale d''Identité (ou passeport)'),
        (p_id, 'bulletin_salaire', 'Bulletins de salaire (3 derniers mois)'),
        (p_id, 'releve_bancaire', 'Relevé bancaire (3 derniers mois)'),
        (p_id, 'attestation_employeur', 'Attestation d''employeur');
    else
      insert into public.documents (lead_id, doc_type, doc_label) values
        (p_id, 'rccm', 'RCCM de la société'),
        (p_id, 'statuts', 'Statuts de la société'),
        (p_id, 'niu', 'NIU'),
        (p_id, 'releve_bancaire', 'Relevés bancaires (6 derniers mois)'),
        (p_id, 'bilan', 'Bilan et compte de résultat');
    end if;
  end if;
  return query select * from public.documents where lead_id = p_id order by created_at;
end $$;

-- Lus / non lus
create or replace function public.mark_messages_read(p_lead_id uuid, p_reader text)
returns integer language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if not public.mi_can_see_lead(p_lead_id) then return 0; end if;
  if p_reader = 'client' then
    if p_lead_id is distinct from public.mi_client_lead_id() then return 0; end if;
    update public.messages set read_at = now() where lead_id = p_lead_id and sender <> 'client' and read_at is null;
  else
    if public.mi_admin_id() is null and public.mi_commercial_id() is null then return 0; end if;
    update public.messages set read_at = now() where lead_id = p_lead_id and sender = 'client' and read_at is null;
  end if;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- Le conseiller écrit : admin connecté, ou commercial connecté et attribué au dossier
create or replace function public.send_lead_message(p_lead_id uuid, p_sender text, p_author_id uuid, p_content text)
returns public.messages language plpgsql security definer set search_path = public as $$
declare v_name text; v_agent uuid; v_row public.messages;
begin
  if p_content is null or length(trim(p_content)) = 0 then raise exception 'Message vide'; end if;
  if length(p_content) > 4000 then raise exception 'Message trop long'; end if;
  select agent_commercial_id into v_agent from public.leads where id = p_lead_id;
  if not found then raise exception 'Dossier introuvable'; end if;
  if not public.mi_can_see_lead(p_lead_id) then raise exception 'Accès refusé'; end if;

  if p_sender = 'admin' then
    if p_author_id is distinct from public.mi_admin_id() then raise exception 'Accès refusé : reconnectez-vous.'; end if;
    select trim(coalesce(prenom, '') || ' ' || coalesce(nom, '')) into v_name from public.admin_users where id = p_author_id;
  elsif p_sender = 'commercial' then
    if p_author_id is distinct from public.mi_commercial_id() or v_agent is distinct from p_author_id then
      raise exception 'Ce dossier ne vous est pas attribué';
    end if;
    select trim(coalesce(prenom, '') || ' ' || coalesce(nom, '')) into v_name from public.commercial_candidates where id = p_author_id;
  else
    raise exception 'Expéditeur invalide';
  end if;

  insert into public.messages (lead_id, sender, content, author_id, author_name)
  values (p_lead_id, p_sender, trim(p_content), p_author_id, nullif(v_name, '')) returning * into v_row;
  return v_row;
end $$;

create or replace function public.admin_update_lead_status(p_admin_id uuid, p_lead_id uuid, p_statut text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_admin_id is distinct from public.mi_admin_id() then raise exception 'Accès refusé : reconnectez-vous.'; end if;
  if not public.mi_can_see_lead(p_lead_id) then raise exception 'Dossier introuvable ou non attribué'; end if;
  update public.leads set statut = p_statut, updated_at = now() where id = p_lead_id;
  return found;
end $$;

create or replace function public.admin_request_document(p_admin_id uuid, p_lead_id uuid, p_label text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_admin_id is distinct from public.mi_admin_id() then raise exception 'Accès refusé : reconnectez-vous.'; end if;
  if p_label is null or length(trim(p_label)) = 0 then raise exception 'Nom du document manquant'; end if;
  insert into public.documents (lead_id, doc_type, doc_label, status)
  values (p_lead_id, 'autre', left(trim(p_label), 120), 'pending') returning id into v_id;
  return v_id;
end $$;

-- Statistiques Haki : direction uniquement
do $$
declare f text;
begin
  foreach f in array array['haki_analytics_kpis()', 'haki_analytics_by_page()', 'haki_analytics_top_events()',
                           'haki_analytics_recent(integer)', 'haki_session_journey(text)']
  loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

-- Anciennes fonctions inutiles ou dangereuses
revoke execute on function public.connecter_utilisateur(text, text) from public, anon, authenticated;
revoke execute on function public.inscrire_utilisateur(text, text, text) from public, anon, authenticated;
revoke execute on function public.get_lead_by_password(uuid, text) from public, anon, authenticated;
