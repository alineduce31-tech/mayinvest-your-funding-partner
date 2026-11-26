-- Rappels programmés par les commerciaux (un rappel actif par dossier et par commercial)
-- A coller dans Supabase > SQL Editor (appliqué par Claude le 26/11/2026)

create table if not exists public.lead_rappels (
  lead_id uuid not null references public.leads(id) on delete cascade,
  commercial_id uuid not null,
  due_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (lead_id, commercial_id)
);
create index if not exists lead_rappels_commercial_idx on public.lead_rappels (commercial_id, due_at);
alter table public.lead_rappels enable row level security;
-- Aucune politique : lecture et écriture uniquement via les fonctions ci-dessous.

create or replace function public.commercial_rappels()
returns table(lead_id uuid, due_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
declare v_com uuid := public.mi_commercial_id();
begin
  if v_com is null then raise exception 'Session expirée, reconnecte-toi.'; end if;
  return query
  select r.lead_id, r.due_at from public.lead_rappels r
  join public.leads l on l.id = r.lead_id and l.agent_commercial_id = v_com
  where r.commercial_id = v_com;
end $$;
revoke all on function public.commercial_rappels() from public;
grant execute on function public.commercial_rappels() to anon, authenticated;

create or replace function public.commercial_set_rappel(p_lead_id uuid, p_due_at timestamptz)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_com uuid := public.mi_commercial_id();
begin
  if v_com is null then raise exception 'Session expirée, reconnecte-toi.'; end if;
  if not exists (select 1 from public.leads where id = p_lead_id and agent_commercial_id = v_com) then
    raise exception 'Ce dossier ne t''est pas attribué';
  end if;
  if p_due_at is null then
    delete from public.lead_rappels where lead_id = p_lead_id and commercial_id = v_com;
    return;
  end if;
  if p_due_at > now() + interval '1 year' then raise exception 'Date de rappel trop lointaine'; end if;
  insert into public.lead_rappels (lead_id, commercial_id, due_at) values (p_lead_id, v_com, p_due_at)
  on conflict (lead_id, commercial_id) do update set due_at = excluded.due_at, created_at = now();
end $$;
revoke all on function public.commercial_set_rappel(uuid, timestamptz) from public;
grant execute on function public.commercial_set_rappel(uuid, timestamptz) to anon, authenticated;
