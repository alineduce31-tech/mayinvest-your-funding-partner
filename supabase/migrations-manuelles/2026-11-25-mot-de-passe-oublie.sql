-- ============================================================
-- Mayinvest PréSelect · Mot de passe oublié par email (clients + commerciaux)
-- Le lien est créé et envoyé côté serveur (fonction request-password-reset),
-- jamais renvoyé au navigateur.
-- ============================================================

create table if not exists public.password_resets (
  token_hash text primary key,
  kind       text not null check (kind in ('client', 'commercial')),
  email      text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at    timestamptz
);
create index if not exists password_resets_email_idx on public.password_resets (lower(email), kind, created_at);
alter table public.password_resets enable row level security;
revoke all on public.password_resets from anon, authenticated;

-- Réservée au serveur (service_role) : crée un lien si le compte existe, max 3 demandes / heure
create or replace function public.mi_create_password_reset(p_email text, p_kind text)
returns text
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token text;
begin
  if v_email = '' or p_kind not in ('client', 'commercial') then
    return null;
  end if;
  if p_kind = 'client' and not exists (select 1 from public.leads where lower(trim(identite->>'email')) = v_email) then
    return null;
  end if;
  if p_kind = 'commercial' and not exists (select 1 from public.commercial_candidates where lower(trim(email)) = v_email and status <> 'refuse') then
    return null;
  end if;
  if (select count(*) from public.password_resets where lower(email) = v_email and kind = p_kind and created_at > now() - interval '1 hour') >= 3 then
    return null;
  end if;

  delete from public.password_resets where expires_at < now() - interval '1 day';
  v_token := encode(gen_random_bytes(24), 'hex');
  insert into public.password_resets (token_hash, kind, email, expires_at)
  values (encode(digest(v_token, 'sha256'), 'hex'), p_kind, v_email, now() + interval '1 hour');
  return v_token;
end $$;
revoke execute on function public.mi_create_password_reset(text, text) from public, anon, authenticated;
grant execute on function public.mi_create_password_reset(text, text) to service_role;

-- Vérifie le lien reçu par email
drop function if exists public.verify_reset_token(text);
create function public.verify_reset_token(p_token text)
returns table (valid boolean, email text, message text, kind text)
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  r public.password_resets;
begin
  select * into r from public.password_resets
  where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if r.token_hash is null then
    return query select false, null::text, 'Lien invalide.'::text, null::text; return;
  end if;
  if r.used_at is not null then
    return query select false, null::text, 'Ce lien a déjà été utilisé.'::text, r.kind; return;
  end if;
  if r.expires_at < now() then
    return query select false, null::text, 'Ce lien a expiré. Refaites une demande.'::text, r.kind; return;
  end if;
  return query select true,
    regexp_replace(r.email, '^(.{2})[^@]*(@.*)$', '\1•••\2'),
    'OK'::text, r.kind;
end $$;
grant execute on function public.verify_reset_token(text) to anon, authenticated;

-- Change le mot de passe avec le lien
drop function if exists public.reset_password_with_token(text, text);
create function public.reset_password_with_token(p_token text, p_new_password text)
returns table (success boolean, message text, kind text)
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  r public.password_resets;
  v_hash text;
begin
  select * into r from public.password_resets
  where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
  for update;
  if r.token_hash is null or r.used_at is not null or r.expires_at < now() then
    return query select false, 'Lien invalide ou expiré.'::text, r.kind; return;
  end if;
  if length(coalesce(p_new_password, '')) < 8 then
    return query select false, 'Mot de passe trop court (8 caractères minimum).'::text, r.kind; return;
  end if;

  v_hash := crypt(p_new_password, gen_salt('bf'));

  if r.kind = 'client' then
    insert into public.lead_credentials (lead_id, password_hash)
    select l.id, v_hash from public.leads l where lower(trim(l.identite->>'email')) = r.email
    on conflict (lead_id) do update set password_hash = excluded.password_hash, updated_at = now();
    delete from public.app_sessions s
    using public.leads l
    where s.kind = 'client' and s.subject_id = l.id and lower(trim(l.identite->>'email')) = r.email;
  else
    update public.commercial_candidates set password_hash = v_hash where lower(trim(email)) = r.email;
    delete from public.app_sessions s
    using public.commercial_candidates c
    where s.kind = 'commercial' and s.subject_id = c.id and lower(trim(c.email)) = r.email;
  end if;

  update public.password_resets set used_at = now() where token_hash = r.token_hash;
  -- les autres liens encore valides pour ce compte ne servent plus
  update public.password_resets set used_at = now() where lower(email) = r.email and kind = r.kind and used_at is null;

  return query select true, 'Mot de passe mis à jour.'::text, r.kind;
end $$;
grant execute on function public.reset_password_with_token(text, text) to anon, authenticated;
