-- Carte « Pack formalisation » dans la discussion (27/11/2026, validé par l'utilisateur).
alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages add constraint messages_kind_check check (kind = any (array['text', 'pieces', 'rdv', 'pack']));

create or replace function public.send_lead_card(p_lead_id uuid, p_sender text, p_author_id uuid, p_kind text, p_payload jsonb, p_content text)
returns messages language plpgsql security definer set search_path to 'public' as $function$
declare v_row public.messages; v_payload jsonb := coalesce(p_payload, '{}'::jsonb); v_at timestamptz;
begin
  if p_kind not in ('pieces', 'rdv', 'pack') then raise exception 'Type de carte inconnu'; end if;
  if p_kind = 'rdv' then
    begin v_at := (v_payload->>'at')::timestamptz; exception when others then raise exception 'Date du rendez-vous invalide'; end;
    if v_at is null or v_at < now() - interval '1 hour' then raise exception 'Date du rendez-vous invalide'; end if;
    v_payload := jsonb_build_object('at', v_at, 'lieu', left(coalesce(v_payload->>'lieu', ''), 120), 'statut', 'propose');
  elsif p_kind = 'pack' then
    v_payload := jsonb_build_object('produit', 'pack_formalisation', 'montant', 50000);
  else
    v_payload := jsonb_build_object('doc_ids', coalesce(v_payload->'doc_ids', '[]'::jsonb));
  end if;
  v_row := public.send_lead_message(p_lead_id, p_sender, p_author_id, p_content);
  update public.messages set kind = p_kind, payload = v_payload where id = v_row.id returning * into v_row;
  return v_row;
end $function$;
