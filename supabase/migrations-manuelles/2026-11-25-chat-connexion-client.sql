-- ============================================================
-- Mayinvest PréSelect · 25/11/2026
-- 1. Connexion client par mot de passe (les fonctions manquaient)
-- 2. Chat client <-> conseiller : réponses du conseiller enregistrées
-- 3. Changement de statut depuis le CRM admin enregistré
-- 4. Temps réel sur les documents
-- À coller dans Supabase > SQL Editor > Run. Peut être relancé sans risque.
-- ============================================================

-- ---------- 1. MOTS DE PASSE CLIENTS ----------
-- Table séparée, sans aucun accès direct depuis le site (seulement via les fonctions)
create table if not exists public.lead_credentials (
  lead_id       uuid primary key references public.leads(id) on delete cascade,
  password_hash text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.lead_credentials enable row level security;
revoke all on public.lead_credentials from anon, authenticated;

-- Appelée à la fin du formulaire de présélection (dossier créé il y a moins de 2 h, une seule fois)
create or replace function public.set_lead_password(p_id uuid, p_password text)
returns boolean
language plpgsql security definer
set search_path = public, extensions
as $$
begin
  if p_password is null or length(p_password) < 8 then
    raise exception 'Mot de passe trop court (8 caractères minimum)';
  end if;
  if not exists (select 1 from public.leads where id = p_id and created_at > now() - interval '2 hours') then
    raise exception 'Dossier introuvable';
  end if;
  insert into public.lead_credentials (lead_id, password_hash)
  values (p_id, crypt(p_password, gen_salt('bf')))
  on conflict (lead_id) do nothing;
  return found;
end $$;

-- Ouvre un dossier précis avec son mot de passe
create or replace function public.get_lead_by_password(p_id uuid, p_password text)
returns setof public.leads
language sql security definer
set search_path = public, extensions
as $$
  select l.*
  from public.leads l
  join public.lead_credentials c on c.lead_id = l.id
  where l.id = p_id
    and c.password_hash = crypt(p_password, c.password_hash)
  limit 1;
$$;

-- Connexion par téléphone : renvoie le dossier le plus récent dont le mot de passe correspond
create or replace function public.verify_lead_password_by_phone(p_phone text, p_password text)
returns table (id uuid)
language sql security definer
set search_path = public, extensions
as $$
  select l.id
  from public.leads l
  join public.lead_credentials c on c.lead_id = l.id
  where regexp_replace(coalesce(l.identite->>'tel', ''), '\D', '', 'g') = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
    and c.password_hash = crypt(p_password, c.password_hash)
  order by l.created_at desc
  limit 1;
$$;

-- Connexion par email : même logique (gère plusieurs dossiers avec le même email)
create or replace function public.verify_lead_password_by_email(p_email text, p_password text)
returns table (id uuid)
language sql security definer
set search_path = public, extensions
as $$
  select l.id
  from public.leads l
  join public.lead_credentials c on c.lead_id = l.id
  where lower(trim(coalesce(l.identite->>'email', ''))) = lower(trim(coalesce(p_email, '')))
    and c.password_hash = crypt(p_password, c.password_hash)
  order by l.created_at desc
  limit 1;
$$;

grant execute on function public.set_lead_password(uuid, text) to anon, authenticated;
grant execute on function public.get_lead_by_password(uuid, text) to anon, authenticated;
grant execute on function public.verify_lead_password_by_phone(text, text) to anon, authenticated;
grant execute on function public.verify_lead_password_by_email(text, text) to anon, authenticated;

-- ---------- 2. CHAT CLIENT <-> CONSEILLER ----------
alter table public.messages add column if not exists author_id   uuid;
alter table public.messages add column if not exists author_name text;

-- Le conseiller (admin ou commercial assigné au dossier) envoie un message au client
create or replace function public.send_lead_message(p_lead_id uuid, p_sender text, p_author_id uuid, p_content text)
returns public.messages
language plpgsql security definer
set search_path = public
as $$
declare
  v_name text;
  v_agent uuid;
  v_row public.messages;
begin
  if p_content is null or length(trim(p_content)) = 0 then
    raise exception 'Message vide';
  end if;
  if length(p_content) > 4000 then
    raise exception 'Message trop long';
  end if;

  select agent_commercial_id into v_agent from public.leads where id = p_lead_id;
  if not found then
    raise exception 'Dossier introuvable';
  end if;

  if p_sender = 'admin' then
    select trim(coalesce(prenom, '') || ' ' || coalesce(nom, '')) into v_name
    from public.admin_users where id = p_author_id and is_active;
    if not found then
      raise exception 'Accès refusé';
    end if;
  elsif p_sender = 'commercial' then
    if v_agent is distinct from p_author_id then
      raise exception 'Ce dossier ne vous est pas attribué';
    end if;
    select trim(coalesce(prenom, '') || ' ' || coalesce(nom, '')) into v_name
    from public.commercial_candidates where id = p_author_id and status = 'valide';
    if not found then
      select trim(coalesce(prenom, '') || ' ' || coalesce(nom, '')) into v_name
      from public.admin_users where id = p_author_id and is_active;
      if not found then
        raise exception 'Accès refusé';
      end if;
    end if;
  else
    raise exception 'Expéditeur invalide';
  end if;

  insert into public.messages (lead_id, sender, content, author_id, author_name)
  values (p_lead_id, p_sender, trim(p_content), p_author_id, nullif(v_name, ''))
  returning * into v_row;
  return v_row;
end $$;

grant execute on function public.send_lead_message(uuid, text, uuid, text) to anon, authenticated;

-- ---------- 3. STATUT DU DOSSIER DEPUIS LE CRM ADMIN ----------
create or replace function public.admin_update_lead_status(p_admin_id uuid, p_lead_id uuid, p_statut text)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role from public.admin_users where id = p_admin_id and is_active;
  if not found then
    raise exception 'Accès refusé';
  end if;
  update public.leads
  set statut = p_statut, updated_at = now()
  where id = p_lead_id
    and (v_role <> 'commercial' or agent_commercial_id = p_admin_id);
  if not found then
    raise exception 'Dossier introuvable ou non attribué';
  end if;
  return true;
end $$;

grant execute on function public.admin_update_lead_status(uuid, uuid, text) to anon, authenticated;

-- Demander un document supplémentaire au client depuis le CRM
create or replace function public.admin_request_document(p_admin_id uuid, p_lead_id uuid, p_label text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.admin_users where id = p_admin_id and is_active) then
    raise exception 'Accès refusé';
  end if;
  if p_label is null or length(trim(p_label)) = 0 then
    raise exception 'Nom du document manquant';
  end if;
  insert into public.documents (lead_id, doc_type, doc_label, status)
  values (p_lead_id, 'autre', left(trim(p_label), 120), 'pending')
  returning id into v_id;
  return v_id;
end $$;

grant execute on function public.admin_request_document(uuid, uuid, text) to anon, authenticated;

-- ---------- 4. TEMPS RÉEL ----------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'documents') then
    alter publication supabase_realtime add table public.documents;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
