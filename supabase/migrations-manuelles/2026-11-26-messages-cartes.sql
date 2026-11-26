-- Messages enrichis : cartes « Pièces du dossier » et « Rendez-vous »
-- A coller dans Supabase > SQL Editor (appliqué par Claude le 26/11/2026)

alter table public.messages add column if not exists kind text not null default 'text';
alter table public.messages add column if not exists payload jsonb;
do $$ begin
  alter table public.messages add constraint messages_kind_check check (kind in ('text', 'pieces', 'rdv'));
exception when duplicate_object then null; end $$;

-- Envoi d'une carte par l'équipe (admin ou commercial du dossier).
-- p_content : texte de secours (notifications, anciens écrans).
create or replace function public.send_lead_card(p_lead_id uuid, p_sender text, p_author_id uuid, p_kind text, p_payload jsonb, p_content text)
returns public.messages
language plpgsql security definer set search_path = public
as $$
declare v_row public.messages; v_payload jsonb := coalesce(p_payload, '{}'::jsonb); v_at timestamptz;
begin
  if p_kind not in ('pieces', 'rdv') then raise exception 'Type de carte inconnu'; end if;
  if p_kind = 'rdv' then
    begin v_at := (v_payload->>'at')::timestamptz; exception when others then raise exception 'Date du rendez-vous invalide'; end;
    if v_at is null or v_at < now() - interval '1 hour' then raise exception 'Date du rendez-vous invalide'; end if;
    v_payload := jsonb_build_object('at', v_at, 'lieu', left(coalesce(v_payload->>'lieu', ''), 120), 'statut', 'propose');
  else
    v_payload := jsonb_build_object('doc_ids', coalesce(v_payload->'doc_ids', '[]'::jsonb));
  end if;
  v_row := public.send_lead_message(p_lead_id, p_sender, p_author_id, p_content);
  update public.messages set kind = p_kind, payload = v_payload where id = v_row.id returning * into v_row;
  return v_row;
end $$;
revoke all on function public.send_lead_card(uuid, text, uuid, text, jsonb, text) from public;
grant execute on function public.send_lead_card(uuid, text, uuid, text, jsonb, text) to anon, authenticated;

-- Réponse du client à une carte rendez-vous : confirme ou demande une autre date.
create or replace function public.client_repondre_rdv(p_message_id uuid, p_reponse text, p_texte text)
returns public.messages
language plpgsql security definer set search_path = public
as $$
declare v_lead uuid := public.mi_client_lead_id(); v_msg public.messages; v_row public.messages;
begin
  if v_lead is null then raise exception 'Session expirée, reconnectez-vous.'; end if;
  if p_reponse not in ('confirme', 'autre') then raise exception 'Réponse invalide'; end if;
  select * into v_msg from public.messages where id = p_message_id and lead_id = v_lead and kind = 'rdv' for update;
  if not found then raise exception 'Rendez-vous introuvable'; end if;
  if coalesce(v_msg.payload->>'statut', 'propose') <> 'propose' then raise exception 'Vous avez déjà répondu à ce rendez-vous'; end if;
  update public.messages set payload = jsonb_set(payload, '{statut}', to_jsonb(p_reponse)) where id = p_message_id;
  if p_reponse = 'confirme' then
    update public.leads set statut = 'RDV' where id = v_lead and statut in ('Nouveau', 'Contacté');
  end if;
  v_row := public.client_send_message(left(coalesce(nullif(trim(p_texte), ''),
    case when p_reponse = 'confirme' then 'Je confirme le rendez-vous.' else 'Cette date ne me convient pas, pouvez-vous m''en proposer une autre ?' end), 300));
  return v_row;
end $$;
revoke all on function public.client_repondre_rdv(uuid, text, text) from public;
grant execute on function public.client_repondre_rdv(uuid, text, text) to anon, authenticated;
