-- Suppression de messages (27/11/2026, validé par l'utilisateur) :
-- chacun supprime ses propres messages, un directeur peut aussi supprimer ceux de l'équipe ;
-- le message est vidé et une trace « Message supprimé » reste dans la discussion.
alter table public.messages add column if not exists deleted_at timestamptz;
alter table public.commercial_chats add column if not exists deleted_at timestamptz;

create or replace function public.delete_lead_message(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v public.messages; v_ok boolean;
begin
  select * into v from public.messages where id = p_id for update;
  if v.id is null or v.deleted_at is not null then raise exception 'Message introuvable.'; end if;
  v_ok :=
    -- le client : ses propres messages
    (v.sender = 'client' and v.lead_id = public.mi_client_lead_id())
    -- un commercial : ses propres messages
    or (v.sender = 'commercial' and v.author_id is not null and v.author_id = public.mi_commercial_id())
    -- un admin : ses propres messages ; un directeur : tous les messages de l'équipe du dossier
    or (public.mi_admin_id() is not null and public.mi_can_see_lead(v.lead_id) and (
          (v.author_id = public.mi_admin_id())
          or (coalesce(public.mi_admin_role(), '') = 'director' and v.sender in ('admin', 'commercial'))));
  if not coalesce(v_ok, false) then raise exception 'Vous ne pouvez pas supprimer ce message.'; end if;
  update public.messages set content = '', payload = null, kind = 'text', deleted_at = now() where id = p_id;
end $$;

create or replace function public.delete_team_message(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v public.commercial_chats; v_ok boolean;
begin
  select * into v from public.commercial_chats where id = p_id for update;
  if v.id is null or v.deleted_at is not null then raise exception 'Message introuvable.'; end if;
  v_ok := (v.sender_type = 'commercial' and v.commercial_id = public.mi_commercial_id())
       or (public.mi_admin_id() is not null and coalesce(public.mi_admin_role(), '') = 'director');
  if not coalesce(v_ok, false) then raise exception 'Vous ne pouvez pas supprimer ce message.'; end if;
  update public.commercial_chats set body = '', deleted_at = now() where id = p_id;
end $$;

revoke all on function public.delete_lead_message(uuid), public.delete_team_message(uuid) from public;
grant execute on function public.delete_lead_message(uuid), public.delete_team_message(uuid) to anon, authenticated;
