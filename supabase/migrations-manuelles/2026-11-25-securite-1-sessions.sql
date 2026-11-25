-- ============================================================
-- Mayinvest PréSelect · Sécurité, étape 1/2 (ajouts uniquement, rien n'est fermé ici)
-- - Sessions : chaque connexion (admin, commercial/candidat, client) reçoit un jeton
-- - Le site envoie ses jetons dans l'en-tête x-client-info ("mi-admin=…", "mi-commercial=…", "mi-client=…")
-- - live_events : signal temps réel SANS donnée personnelle (remplace l'écoute directe des tables)
-- ============================================================

-- ---------- Sessions ----------
create table if not exists public.app_sessions (
  token_hash text primary key,
  kind       text not null check (kind in ('admin', 'commercial', 'client')),
  subject_id uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists app_sessions_subject_idx on public.app_sessions (kind, subject_id);
alter table public.app_sessions enable row level security;
revoke all on public.app_sessions from anon, authenticated;

create or replace function public.mi_new_session(p_kind text, p_subject uuid, p_hours int)
returns text
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_token text := encode(gen_random_bytes(24), 'hex');
begin
  delete from public.app_sessions where expires_at < now();
  insert into public.app_sessions (token_hash, kind, subject_id, expires_at)
  values (encode(digest(v_token, 'sha256'), 'hex'), p_kind, p_subject, now() + make_interval(hours => p_hours));
  return v_token;
end $$;
revoke execute on function public.mi_new_session(text, uuid, int) from public, anon, authenticated;

-- Jeton envoyé par le navigateur pour un type de session donné
create or replace function public.mi_session_subject(p_kind text)
returns uuid
language sql stable security definer
set search_path = public, extensions
as $$
  select s.subject_id
  from public.app_sessions s
  where s.kind = p_kind
    and s.expires_at > now()
    and s.token_hash = encode(digest(
          substring(coalesce(current_setting('request.headers', true)::json->>'x-client-info', '')
                    from ('mi-' || p_kind || '=([0-9a-f]{48})')),
          'sha256'), 'hex')
  limit 1;
$$;

create or replace function public.mi_admin_id()
returns uuid language sql stable security definer set search_path = public as $$
  select a.id from public.admin_users a
  where a.id = public.mi_session_subject('admin') and coalesce(a.is_active, true);
$$;

create or replace function public.mi_admin_role()
returns text language sql stable security definer set search_path = public as $$
  select a.role from public.admin_users a
  where a.id = public.mi_session_subject('admin') and coalesce(a.is_active, true);
$$;

-- Commercial validé OU candidat en formation (même table)
create or replace function public.mi_commercial_id()
returns uuid language sql stable security definer set search_path = public as $$
  select c.id from public.commercial_candidates c
  where c.id = public.mi_session_subject('commercial') and c.status <> 'refuse';
$$;

create or replace function public.mi_client_lead_id()
returns uuid language sql stable security definer set search_path = public as $$
  select public.mi_session_subject('client');
$$;

-- Qui peut voir un dossier : admin (commercial-admin = ses dossiers), commercial assigné, le client lui-même
create or replace function public.mi_can_see_lead(p_lead_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.leads l
    where l.id = p_lead_id
      and (
        (public.mi_admin_id() is not null and (coalesce(public.mi_admin_role(), '') <> 'commercial' or l.agent_commercial_id = public.mi_admin_id()))
        or (l.agent_commercial_id is not null and l.agent_commercial_id = public.mi_commercial_id())
        or l.id = public.mi_client_lead_id()
      )
  );
$$;

grant execute on function public.mi_session_subject(text), public.mi_admin_id(), public.mi_admin_role(),
  public.mi_commercial_id(), public.mi_client_lead_id(), public.mi_can_see_lead(uuid) to anon, authenticated;

-- Déconnexion : supprime la session envoyée par le navigateur
create or replace function public.mi_logout(p_kind text)
returns void language sql security definer set search_path = public, extensions as $$
  delete from public.app_sessions s
  where s.kind = p_kind
    and s.token_hash = encode(digest(
          substring(coalesce(current_setting('request.headers', true)::json->>'x-client-info', '')
                    from ('mi-' || p_kind || '=([0-9a-f]{48})')),
          'sha256'), 'hex');
$$;
grant execute on function public.mi_logout(text) to anon, authenticated;

-- ---------- Connexions qui renvoient un jeton ----------
drop function if exists public.verify_admin_login(text, text);
create function public.verify_admin_login(p_email text, p_password text)
returns table (success boolean, id uuid, email text, nom text, prenom text, ville text, role text, token text)
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_row public.admin_users%rowtype;
begin
  select au.* into v_row
  from public.admin_users au
  where lower(au.email) = lower(trim(p_email))
    and coalesce(au.is_active, true) = true
    and au.password_hash = crypt(p_password, au.password_hash)
  limit 1;

  if v_row.id is null then
    return query select false, null::uuid, null::text, null::text, null::text, null::text, null::text, null::text;
    return;
  end if;

  update public.admin_users set last_login_at = now() where public.admin_users.id = v_row.id;
  return query select true, v_row.id, v_row.email, v_row.nom, v_row.prenom, v_row.ville, v_row.role,
                      public.mi_new_session('admin', v_row.id, 8);
end $$;
grant execute on function public.verify_admin_login(text, text) to anon, authenticated;

create or replace function public.connecter_commercial(p_identifiant text, p_password text)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_c public.commercial_candidates;
  v_ident text := trim(coalesce(p_identifiant, ''));
  v_digits text := regexp_replace(coalesce(p_identifiant, ''), '\D', '', 'g');
begin
  select * into v_c
  from public.commercial_candidates
  where lower(email) = lower(v_ident)
     or (length(v_digits) >= 9 and regexp_replace(coalesce(telephone, ''), '\D', '', 'g') = v_digits)
  order by created_at desc
  limit 1;

  if v_c.id is null or v_c.password_hash is null or v_c.password_hash <> crypt(p_password, v_c.password_hash) then
    raise exception 'Identifiants incorrects.';
  end if;
  if v_c.status = 'refuse' then
    raise exception 'Ce compte a été désactivé. Contacte la direction Mayinvest.';
  end if;

  return jsonb_build_object(
    'id', v_c.id, 'nom', v_c.nom, 'prenom', v_c.prenom, 'email', v_c.email,
    'telephone', v_c.telephone, 'ville', v_c.ville, 'status', v_c.status,
    'activated_at', v_c.activated_at, 'ref_code', v_c.ref_code,
    'token', public.mi_new_session('commercial', v_c.id, 24 * 7)
  );
end $$;
grant execute on function public.connecter_commercial(text, text) to anon, authenticated;

create or replace function public.inscrire_candidat(p_nom text, p_prenom text, p_telephone text, p_email text, p_password text, p_ville text, p_motivation text)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  if length(trim(coalesce(p_password, ''))) < 8 then
    raise exception 'Le mot de passe doit faire au moins 8 caractères.';
  end if;
  if exists (select 1 from public.commercial_candidates where regexp_replace(coalesce(telephone, ''), '\D', '', 'g') = regexp_replace(coalesce(p_telephone, ''), '\D', '', 'g')) then
    raise exception 'Ce numéro de téléphone est déjà inscrit.';
  end if;
  if exists (select 1 from public.commercial_candidates where lower(email) = lower(trim(p_email))) then
    raise exception 'Cet email est déjà inscrit.';
  end if;

  insert into public.commercial_candidates (nom, prenom, telephone, email, ville, motivation, password_hash, status)
  values (p_nom, p_prenom, p_telephone, lower(trim(p_email)), p_ville, p_motivation, crypt(p_password, gen_salt('bf')), 'formation')
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'nom', p_nom, 'prenom', p_prenom, 'status', 'formation',
                            'token', public.mi_new_session('commercial', v_id, 24 * 7));
end $$;
grant execute on function public.inscrire_candidat(text, text, text, text, text, text, text) to anon, authenticated;

-- Client : ouvre son dossier avec le code d'accès OU le mot de passe, et reçoit un jeton
create or replace function public.client_login(p_id uuid, p_code text default null, p_password text default null)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_lead public.leads;
begin
  if coalesce(p_code, '') <> '' then
    select * into v_lead from public.leads where id = p_id and access_code = trim(p_code);
  elsif coalesce(p_password, '') <> '' then
    select l.* into v_lead
    from public.leads l join public.lead_credentials c on c.lead_id = l.id
    where l.id = p_id and c.password_hash = crypt(p_password, c.password_hash);
  end if;

  if v_lead.id is null then
    return null;
  end if;

  return jsonb_build_object('token', public.mi_new_session('client', v_lead.id, 24 * 30), 'lead', to_jsonb(v_lead));
end $$;
grant execute on function public.client_login(uuid, text, text) to anon, authenticated;

-- ---------- Temps réel sans donnée personnelle ----------
create table if not exists public.live_events (
  id         bigint generated always as identity primary key,
  topic      text not null,
  ref        uuid,
  extra      text,
  created_at timestamptz not null default now()
);
alter table public.live_events enable row level security;
drop policy if exists live_events_read on public.live_events;
create policy live_events_read on public.live_events for select to anon, authenticated using (true);
grant select on public.live_events to anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_events') then
    alter publication supabase_realtime add table public.live_events;
  end if;
end $$;

create or replace function public.mi_emit_live_event()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if tg_table_name = 'messages' then
    insert into public.live_events (topic, ref, extra) values ('msg', new.lead_id, new.sender);
  elsif tg_table_name = 'documents' then
    insert into public.live_events (topic, ref) values ('doc', coalesce(new.lead_id, old.lead_id));
  elsif tg_table_name = 'leads' then
    if tg_op = 'INSERT' then
      insert into public.live_events (topic, ref) values ('lead', new.id);
    elsif new.statut is distinct from old.statut or new.agent_commercial_id is distinct from old.agent_commercial_id then
      insert into public.live_events (topic, ref) values ('lead_upd', new.id);
    end if;
  elsif tg_table_name = 'commercial_chats' then
    insert into public.live_events (topic, ref, extra) values ('cchat', new.commercial_id, new.sender_type);
  end if;
  if random() < 0.05 then
    delete from public.live_events where created_at < now() - interval '1 day';
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_live_messages on public.messages;
create trigger trg_live_messages after insert on public.messages for each row execute function public.mi_emit_live_event();
drop trigger if exists trg_live_documents on public.documents;
create trigger trg_live_documents after insert or update on public.documents for each row execute function public.mi_emit_live_event();
drop trigger if exists trg_live_leads on public.leads;
create trigger trg_live_leads after insert or update on public.leads for each row execute function public.mi_emit_live_event();
drop trigger if exists trg_live_cchats on public.commercial_chats;
create trigger trg_live_cchats after insert on public.commercial_chats for each row execute function public.mi_emit_live_event();

-- ---------- Chat client <-> conseiller (version avec session) ----------
-- Le client écrit (sa session doit correspondre au dossier)
create or replace function public.client_send_message(p_content text)
returns public.messages
language plpgsql security definer
set search_path = public
as $$
declare
  v_lead uuid := public.mi_client_lead_id();
  v_row public.messages;
begin
  if v_lead is null then raise exception 'Session expirée, reconnectez-vous.'; end if;
  if p_content is null or length(trim(p_content)) = 0 then raise exception 'Message vide'; end if;
  if length(p_content) > 4000 then raise exception 'Message trop long'; end if;
  insert into public.messages (lead_id, sender, content) values (v_lead, 'client', trim(p_content)) returning * into v_row;
  return v_row;
end $$;
grant execute on function public.client_send_message(text) to anon, authenticated;

-- Liste des conversations pour un commercial (ses dossiers) avec non-lus
create or replace function public.commercial_conversations()
returns table (lead_id uuid, nom text, statut text, last_message text, last_at timestamptz, unread bigint)
language sql stable security definer
set search_path = public
as $$
  select l.id,
         case when l.type in ('physique', 'Personne physique')
              then trim(coalesce(l.identite->>'prenom', '') || ' ' || coalesce(l.identite->>'nom', ''))
              else coalesce(l.situation->>'raison_sociale', l.identite->>'raison_sociale', 'Entreprise') end,
         l.statut,
         m.content, m.created_at,
         (select count(*) from public.messages u where u.lead_id = l.id and u.sender = 'client' and u.read_at is null)
  from public.leads l
  left join lateral (select content, created_at from public.messages x where x.lead_id = l.id order by created_at desc limit 1) m on true
  where l.agent_commercial_id is not null and l.agent_commercial_id = public.mi_commercial_id()
  order by m.created_at desc nulls last, l.created_at desc;
$$;
grant execute on function public.commercial_conversations() to anon, authenticated;

-- Les commerciaux peuvent aussi écrire aux clients
alter table public.messages drop constraint if exists messages_sender_check;
alter table public.messages add constraint messages_sender_check check (sender in ('client', 'admin', 'commercial'));

-- Un dossier peut être attribué à un admin OU à un commercial validé (avant : admin uniquement)
alter table public.leads drop constraint if exists leads_agent_commercial_id_fkey;
create or replace function public.mi_check_lead_agent()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.agent_commercial_id is not null
     and new.agent_commercial_id is distinct from coalesce(old.agent_commercial_id, '00000000-0000-0000-0000-000000000000'::uuid)
     and not exists (select 1 from public.admin_users where id = new.agent_commercial_id)
     and not exists (select 1 from public.commercial_candidates where id = new.agent_commercial_id and status = 'valide') then
    raise exception 'Agent inconnu ou commercial non validé';
  end if;
  return new;
end $$;
drop trigger if exists trg_check_lead_agent on public.leads;
create trigger trg_check_lead_agent before insert or update of agent_commercial_id on public.leads
  for each row execute function public.mi_check_lead_agent();
