-- Messagerie direction : notes internes, boîte de réception, fils équipe, diffusion
-- A coller dans Supabase > SQL Editor (déjà appliqué par Claude le 25/11/2026)

-- 1. Notes internes : visibles par la direction et le commercial du dossier, jamais par le client
alter table public.messages add column if not exists visibility text not null default 'all';
alter table public.messages drop constraint if exists messages_visibility_check;
alter table public.messages add constraint messages_visibility_check check (visibility in ('all', 'internal'));

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select to anon, authenticated
  using (public.mi_can_see_lead(lead_id) and (visibility = 'all' or public.mi_client_lead_id() is null));

create or replace function public.send_internal_note(p_lead_id uuid, p_content text)
returns public.messages
language plpgsql security definer set search_path = public
as $$
declare v_admin uuid := public.mi_admin_id(); v_com uuid := public.mi_commercial_id();
        v_agent uuid; v_name text; v_sender text; v_author uuid; v_row public.messages;
begin
  if p_content is null or length(trim(p_content)) = 0 then raise exception 'Note vide'; end if;
  if length(p_content) > 4000 then raise exception 'Note trop longue'; end if;
  select agent_commercial_id into v_agent from public.leads where id = p_lead_id;
  if not found then raise exception 'Dossier introuvable'; end if;
  if not public.mi_can_see_lead(p_lead_id) then raise exception 'Accès refusé'; end if;
  if v_admin is not null then
    v_sender := 'admin'; v_author := v_admin;
    select trim(coalesce(prenom, '') || ' ' || coalesce(nom, '')) into v_name from public.admin_users where id = v_admin;
  elsif v_com is not null and v_agent = v_com then
    v_sender := 'commercial'; v_author := v_com;
    select trim(coalesce(prenom, '') || ' ' || coalesce(nom, '')) into v_name from public.commercial_candidates where id = v_com;
  else
    raise exception 'Accès refusé';
  end if;
  insert into public.messages (lead_id, sender, content, author_id, author_name, visibility)
  values (p_lead_id, v_sender, trim(p_content), v_author, nullif(v_name, ''), 'internal') returning * into v_row;
  return v_row;
end $$;
revoke all on function public.send_internal_note(uuid, text) from public;
grant execute on function public.send_internal_note(uuid, text) to anon, authenticated;

-- 2. Boîte de réception direction (un fil par dossier)
create or replace function public.admin_inbox()
returns table(lead_id uuid, nom text, statut text, type text, montant numeric, ville text,
              agent_id uuid, agent_nom text, last_message text, last_sender text, last_visibility text,
              last_at timestamptz, unread bigint, waiting_since timestamptz,
              docs_total bigint, docs_ok bigint, created_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if public.mi_admin_id() is null then raise exception 'Accès refusé : reconnectez-vous.'; end if;
  return query
  select l.id,
         case when l.type in ('physique', 'Personne physique')
              then trim(coalesce(l.identite->>'prenom', '') || ' ' || coalesce(l.identite->>'nom', ''))
              else coalesce(l.situation->>'raison_sociale', l.identite->>'raison_sociale', 'Entreprise') end,
         l.statut, l.type, l.montant_demande, l.ville,
         l.agent_commercial_id,
         coalesce(
           (select trim(coalesce(c.prenom, '') || ' ' || coalesce(c.nom, '')) from public.commercial_candidates c where c.id = l.agent_commercial_id),
           (select trim(coalesce(a.prenom, '') || ' ' || coalesce(a.nom, '')) from public.admin_users a where a.id = l.agent_commercial_id)),
         m.content, m.sender, m.visibility, m.created_at,
         (select count(*) from public.messages u where u.lead_id = l.id and u.sender = 'client' and u.read_at is null),
         (select min(u.created_at) from public.messages u where u.lead_id = l.id and u.sender = 'client' and u.read_at is null),
         (select count(*) from public.documents d where d.lead_id = l.id),
         (select count(*) from public.documents d where d.lead_id = l.id and d.status in ('validated', 'valide', 'approved')),
         l.created_at
  from public.leads l
  join lateral (select x.content, x.sender, x.visibility, x.created_at from public.messages x
                where x.lead_id = l.id order by x.created_at desc limit 1) m on true
  where public.mi_can_see_lead(l.id)
  order by m.created_at desc;
end $$;
revoke all on function public.admin_inbox() from public;
grant execute on function public.admin_inbox() to anon, authenticated;

-- 3. Fils direction <-> commerciaux
create or replace function public.admin_team_threads()
returns table(commercial_id uuid, nom text, ville text, telephone text, last_body text, last_sender text,
              last_at timestamptz, unread bigint)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public.mi_require_admin(false);
  return query
  select c.id, trim(coalesce(c.prenom, '') || ' ' || coalesce(c.nom, '')), c.ville, c.telephone,
         m.body, m.sender_type, m.created_at,
         (select count(*) from public.commercial_chats u where u.commercial_id = c.id and u.sender_type = 'commercial' and u.read_at is null)
  from public.commercial_candidates c
  left join lateral (select x.body, x.sender_type, x.created_at from public.commercial_chats x
                     where x.commercial_id = c.id order by x.created_at desc limit 1) m on true
  where c.status = 'valide'
  order by m.created_at desc nulls last, c.prenom;
end $$;
revoke all on function public.admin_team_threads() from public;
grant execute on function public.admin_team_threads() to anon, authenticated;

-- 4. Diffusion à toute l'équipe (ou à une ville)
create or replace function public.admin_broadcast_team(p_ville text, p_body text)
returns integer
language plpgsql security definer set search_path = public
as $$
declare v_n int;
begin
  perform public.mi_require_admin(false);
  if p_body is null or length(trim(p_body)) = 0 then raise exception 'Message vide'; end if;
  if length(p_body) > 4000 then raise exception 'Message trop long'; end if;
  insert into public.commercial_chats (commercial_id, sender_type, body)
  select c.id, 'director', trim(p_body) from public.commercial_candidates c
  where c.status = 'valide' and (p_ville is null or p_ville = '' or c.ville = p_ville);
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.admin_broadcast_team(text, text) from public;
grant execute on function public.admin_broadcast_team(text, text) to anon, authenticated;
